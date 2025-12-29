'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY
const ARK_ENDPOINT_ID = process.env.VOLC_IMAGE_ENDPOINT_ID
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

// 🎨 风格库
const STYLE_PRESETS: Record<string, string> = {
  "realistic": "cinematic lighting, photorealistic, 8k, masterpiece, movie still",
  "anime_jp": "anime style, studio ghibli, makoto shinkai, vibrant colors",
  "anime_us": "western comic book style, marvel comics, bold lines, dynamic shading",
  "cyberpunk": "cyberpunk 2077 style, neon lights, high contrast, futuristic",
  "noir": "film noir, black and white photography, dramatic shadows, high contrast",
  "pixar": "pixar 3d animation style, disney, unreal engine 5 render",
  "watercolor": "watercolor painting, artistic, soft edges, dreamy atmosphere",
  "ink": "traditional chinese ink painting, sumi-e, artistic, brush strokes"
};

// 📐 分辨率映射表 (适配火山引擎/即梦)
const RATIO_MAP: Record<string, string> = {
  "16:9": "1280x720",
  "9:16": "720x1280",
  "1:1": "1024x1024",
  "4:3": "1024x768",
  "3:4": "768x1024",
  "2.39:1": "1536x640" // 电影宽银幕
};

export async function generateShotImage(
  shotId: string | number, 
  prompt: string, 
  projectId: string,
  isDraftMode: boolean, 
  stylePreset: string = 'realistic',
  aspectRatio: string = '16:9', // 👈 [新增] 接收比例参数
  characterId?: string
) {
  try {
    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) throw new Error("API Key Missing");

    // 1. 确定 Prompt
    let finalStylePrompt = isDraftMode 
      ? "rough storyboard sketch, black and white line art, minimal detail, messy lines"
      : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);

    let finalPrompt = prompt;
    if (characterId) {
      const { data: character } = await supabaseAdmin
        .from('characters')
        .select('description')
        .eq('id', characterId)
        .single();
      if (character) {
        finalPrompt = `(Character: ${character.description}), ${prompt}, (${finalStylePrompt})`;
      } else {
        finalPrompt = `${prompt}, (${finalStylePrompt})`;
      }
    } else {
      finalPrompt = `${prompt}, (${finalStylePrompt})`;
    }

    // 2. 确定分辨率
    const imageSize = RATIO_MAP[aspectRatio] || "1280x720"; // 默认 16:9

    console.log(`[Server] Generating: ${imageSize} | Style: ${stylePreset}`);

    // 3. 构造请求
    const payload = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      size: imageSize, // 👈 动态分辨率
      n: 1
    };

    const response = await fetch(ARK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Generation Failed");
    const imageUrl = data.data?.[0]?.url;
    
    // 4. 转存
    const imageRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const fileName = `cineflow/${projectId}/${Date.now()}_${shotId}.png`;
    await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
    const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message };
  }
}