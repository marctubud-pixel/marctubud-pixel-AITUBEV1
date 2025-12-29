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
  "realistic": "cinematic lighting, photorealistic, 8k, masterpiece, movie still, arri alexa, high detail",
  "anime_jp": "anime style, studio ghibli, makoto shinkai, vibrant colors, clean lines",
  "anime_us": "western comic book style, marvel comics, bold lines, dynamic shading",
  "cyberpunk": "cyberpunk 2077 style, neon lights, high contrast, futuristic, tech noir",
  "noir": "film noir, black and white photography, dramatic shadows, high contrast, grainy",
  "pixar": "pixar 3d animation style, disney, unreal engine 5 render, cute, 3d character",
  "watercolor": "watercolor painting, artistic, soft edges, dreamy atmosphere",
  "ink": "traditional chinese ink painting, sumi-e, artistic, brush strokes"
};

// 📐 分辨率映射表
const RATIO_MAP: Record<string, string> = {
  "16:9": "1280x720",
  "9:16": "720x1280",
  "1:1": "1024x1024",
  "4:3": "1024x768",
  "3:4": "768x1024",
  "2.39:1": "1536x640"
};

export async function generateShotImage(
  shotId: string | number, 
  actionPrompt: string, // 👈 仅包含动作描述
  projectId: string,
  isDraftMode: boolean, 
  stylePreset: string = 'realistic',
  aspectRatio: string = '16:9',
  shotType: string = 'MID SHOT', // 👈 [新增] 独立接收景别
  characterId?: string,
  referenceImageUrl?: string
) {
  try {
    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) throw new Error("API Key Missing");

    console.log(`[Server] Generating: ${shotType} | Ref: ${referenceImageUrl ? 'Yes' : 'No'}`);

    // 1. 准备各个部分的 Prompt
    const stylePart = isDraftMode 
      ? "rough storyboard sketch, black and white line art, minimal detail"
      : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);
    
    // ⚡️ 核心修复：景别加权 (使用括号强调)
    // 将 "CLOSE-UP" 转换为自然语言 "Close-up shot of..."
    const shotPart = `(${shotType} shot of:1.5)`; 

    let characterPart = "";
    if (characterId) {
      const { data: char } = await supabaseAdmin
        .from('characters')
        .select('description')
        .eq('id', characterId)
        .single();
      if (char) {
        // 简化角色描述，避免干扰景别
        characterPart = `(Character: ${char.description})`; 
      }
    }

    // 2. 🧱 拼装积木 (顺序决定权重！)
    // 最强权重在最前面： 景别 -> 画面主体(动作) -> 角色特征 -> 风格
    // 这样如果景别是“特写”，AI会先执行特写，再把角色塞进去
    let finalPrompt = `${shotPart}, ${actionPrompt}, ${characterPart}, (${stylePart})`;

    // 如果有参考图，我们在 Prompt 里增加 "image reference" 暗示 (作为过渡方案)
    if (referenceImageUrl) {
      finalPrompt += `, (looking like the reference image)`;
    }

    // 3. 确定分辨率
    const imageSize = RATIO_MAP[aspectRatio] || "1280x720";

    // 4. 构造 Payload (尝试注入 image_url，如果模型支持)
    const payload: any = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      size: imageSize, 
      n: 1
    };

    // ⚠️ 实验性：如果参考图存在，尝试传递给模型 (部分模型支持 image_url 参数)
    // 如果报错，可以注释掉这部分
    if (referenceImageUrl) {
        // 这里只是预留位置，具体取决于你部署的 Endpoint 是否兼容 standard OpenAI format 或私有格式
        // payload.image_url = referenceImageUrl; 
    }

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
    
    // 5. 转存
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