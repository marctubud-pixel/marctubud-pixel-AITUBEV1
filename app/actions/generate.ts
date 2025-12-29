'use server'

import { createClient } from '@supabase/supabase-js'
import { analyzeRefImage, type VisionAnalysis } from './vision'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY
const ARK_ENDPOINT_ID = process.env.VOLC_IMAGE_ENDPOINT_ID
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

const STYLE_PRESETS: Record<string, string> = {
  "realistic": "cinematic lighting, photorealistic, 8k, masterpiece, movie still, arri alexa, high detail, real photo",
  "anime_jp": "anime style, studio ghibli, makoto shinkai, vibrant colors, clean lines",
  "anime_us": "western comic book style, marvel comics, bold lines, dynamic shading",
  "cyberpunk": "cyberpunk 2077 style, neon lights, high contrast, futuristic, tech noir",
  "noir": "film noir, black and white photography, dramatic shadows, high contrast, grainy",
  "pixar": "pixar 3d animation style, disney, unreal engine 5 render, cute, 3d character",
  "watercolor": "watercolor painting, artistic, soft edges, dreamy atmosphere",
  "ink": "traditional chinese ink painting, sumi-e, artistic, brush strokes"
};

const RATIO_MAP: Record<string, string> = {
  "16:9": "2560x1440",  
  "9:16": "1440x2560",
  "1:1": "2048x2048",   
  "4:3": "2304x1728",   
  "3:4": "1728x2304",
  "2.39:1": "3072x1280" 
};

// 🛡️ 辅助：盲猜强度策略
function calculateBlindStrength(shotType: string): number {
    const upper = shotType.toUpperCase();
    if (upper.includes("CLOSE") || upper.includes("FACE") || upper.includes("HEAD")) return 0.85; 
    if (upper.includes("FULL") || upper.includes("WIDE")) return 0.50;
    return 0.65; 
}

// 🛑 优化：根据景别和风格生成“负面提示词” (核心修复：防止风格漂移和构图残留)
function getNegativePrompt(shotType: string, stylePreset: string): string {
    const upper = shotType.toUpperCase();
    let baseNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands";
    
    // 🔥 风格防御：如果是写实风格，严禁出现动漫特征
    if (stylePreset === 'realistic' || stylePreset === 'noir') {
        baseNegative += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting, digital art";
    }
    
    // 如果是特写 -> 严禁出现下半身任何元素
    if (upper.includes("CLOSE") || upper.includes("FACE") || upper.includes("HEAD")) {
        return `${baseNegative}, legs, feet, shoes, lower body, full body, wide shot, distant view, standing, walking, running, body out of frame`;
    }
    
    // 如果是全景 -> 严禁切头
    if (upper.includes("FULL") || upper.includes("WIDE")) {
        return `${baseNegative}, close up, face shot, headshot, cropped head`;
    }
    
    return baseNegative;
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("Image conversion failed:", error);
    return null;
  }
}

export async function generateShotImage(
  shotId: string | number, 
  actionPrompt: string, 
  projectId: string,
  isDraftMode: boolean, 
  stylePreset: string = 'realistic',
  aspectRatio: string = '16:9',
  shotType: string = 'MID SHOT',
  characterId?: string,
  referenceImageUrl?: string, 
  sceneImageUrl?: string      
) {
  try {
    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) throw new Error("API Key Missing");

    console.log(`[Server] Gen Start | Type: ${shotType}`);

    // 1. 启动视觉感知
    let visionAnalysis: VisionAnalysis | null = null;
    let visualDescription = "";

    if (referenceImageUrl) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis?.description) {
                visualDescription = visionAnalysis.description;
            }
        } catch (e) { 
            console.log("Vision skipped or failed", e); 
        }
    }

    // 2. 准备 Prompt 部件
    const stylePart = isDraftMode 
      ? "rough storyboard sketch, black and white line art, minimal detail"
      : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);
    
    const isCloseUp = shotType.toUpperCase().includes("CLOSE") || shotType.toUpperCase().includes("FACE");
    
    // 镜头加权
    let shotPart = isCloseUp 
        ? `(((${shotType} shot)):2.0), (head and shoulders only:1.8), (face focus:1.5)` 
        : `(${shotType} shot of:1.5)`; 

    let characterPart = "";
    if (characterId) {
      const { data: char } = await supabaseAdmin
        .from('characters')
        .select('description')
        .eq('id', characterId)
        .single();
      if (char) characterPart = `(Character: ${char.description})`; 
    }

    if (visualDescription) {
        characterPart += `, (Visual Ref Features: ${visualDescription})`;
    }

    // 🧱 拼装 Prompt
    let finalPrompt = `${shotPart}, ${actionPrompt}, ${characterPart}`;

    // 场景增强
    if (referenceImageUrl && sceneImageUrl) {
        finalPrompt += `, (detailed background environment:1.6)`; 
    } else if (sceneImageUrl) {
        finalPrompt += `, (background environment consistency)`;
    }
    
    // 🔥 风格锁：末尾再次强化风格，防止高 Strength 下风格漂移
    finalPrompt += `, (${stylePart}:1.4)`;

    // 3. 构造 Payload
    const imageSize = RATIO_MAP[aspectRatio] || "2560x1440";
    const negativePrompt = getNegativePrompt(shotType, stylePreset);

    const payload: any = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      negative_prompt: negativePrompt, 
      size: imageSize, 
      n: 1
    };

    // 4. Img2Img 逻辑
    const targetRefImage = referenceImageUrl || sceneImageUrl;

    if (targetRefImage) {
        const base64Image = await imageUrlToBase64(targetRefImage);
        
        if (base64Image) {
            payload.image_url = base64Image;

            // 🧠 智能决策 Strength
            let strength = 0.65; 

            if (visionAnalysis && visionAnalysis.shot_type) {
                const refShot = visionAnalysis.shot_type; 
                const targetShot = shotType;             
                
                console.log(`[Smart Logic] 视觉对比: 原图[${refShot}] vs 目标[${targetShot}]`);

                if (refShot.includes("Full") && isCloseUp) {
                    console.log("👉 决策: 大幅裁剪 (Full -> Close)");
                    strength = 0.85; 
                    // 高重绘下必须补强指令
                    payload.prompt += ", (crop to face:1.6), (ignore legs and lower body:1.8)";
                } else if (refShot.includes("Mid") && targetShot.toUpperCase().includes("MID")) {
                    strength = 0.45; 
                } else if (refShot.includes("Close") && targetShot.toUpperCase().includes("FULL")) {
                    strength = 0.90; 
                } else {
                    strength = calculateBlindStrength(shotType);
                }
            } else {
                strength = calculateBlindStrength(shotType);
            }

            console.log(`[Server] Img2Img Active | Strength: ${strength}`);
            payload.strength = strength;
            payload.ref_strength = strength;
        }
    }

    // 5. 发送请求
    const response = await fetch(ARK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        console.error("API Error Detail:", JSON.stringify(data));
        const errorMsg = data.error?.message?.toLowerCase() || "";
        if (errorMsg.includes("param") || errorMsg.includes("unrecognized") || data.error?.code === 'invalid_parameter') {
             console.warn("⚠️ 参数报错，降级重试...");
             delete payload.image_url;
             delete payload.strength;
             delete payload.ref_strength;
             delete payload.negative_prompt; 

             const retryResponse = await fetch(ARK_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify(payload)
            });
            const retryData = await retryResponse.json();
            if (!retryResponse.ok) throw new Error(retryData.error?.message || "Retry Failed");
            return processResponse(retryData, shotId, projectId);
        }
        throw new Error(data.error?.message || "Generation Failed");
    }

    return processResponse(data, shotId, projectId);

  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message };
  }
}

async function processResponse(data: any, shotId: string | number, projectId: string) {
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image url returned");
    const imageRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const fileName = `cineflow/${projectId}/${Date.now()}_${shotId}.png`;
    await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
    const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
    return { success: true, url: publicUrl };
}