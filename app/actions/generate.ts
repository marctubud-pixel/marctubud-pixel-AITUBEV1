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

function calculateBlindStrength(shotType: string): number {
    const upper = shotType.toUpperCase();
    if (upper.includes("CLOSE") || upper.includes("FACE") || upper.includes("HEAD")) return 0.85; 
    if (upper.includes("FULL") || upper.includes("WIDE")) return 0.50;
    return 0.65; 
}

function getNegativePrompt(shotType: string, stylePreset: string): string {
    const upper = shotType.toUpperCase();
    let baseNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands";
    
    if (stylePreset === 'realistic' || stylePreset === 'noir') {
        baseNegative += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting, digital art";
    }
    
    if (upper.includes("CLOSE") || upper.includes("FACE") || upper.includes("HEAD")) {
        return `${baseNegative}, legs, feet, shoes, lower body, full body, wide shot, distant view, standing, walking, running, body out of frame`;
    }
    
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

    console.log(`[Server] Gen Start | Target Shot: ${shotType}`);

    // 1. 启动深度视觉感知 (Vision 2.0)
    let visionAnalysis: VisionAnalysis | null = null;
    let visualDescription = "";
    let keyFeaturesPrompt = "";

    if (referenceImageUrl) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis) {
                visualDescription = visionAnalysis.description;
                // 将提取的关键特征转化为 Prompt 权重
                keyFeaturesPrompt = visionAnalysis.key_features?.map(f => `(${f}:1.2)`).join(", ") || "";
            }
        } catch (e) { 
            console.warn("[Vision] 分析跳过", e); 
        }
    }

    // 2. 动态构建 Prompt
    const stylePart = isDraftMode 
      ? "rough storyboard sketch, black and white line art, minimal detail"
      : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);
    
    const isCloseUp = shotType.toUpperCase().includes("CLOSE") || shotType.toUpperCase().includes("FACE");
    
    // 构图增强：如果是特写，强行通过 Prompt 锚定头部
    let shotPart = isCloseUp 
        ? `(((${shotType} shot)):2.0), (head and shoulders focus:1.8), (highly detailed face:1.5)` 
        : `(${shotType} shot:1.5)`; 

    let characterPart = "";
    if (characterId) {
      const { data: char } = await supabaseAdmin.from('characters').select('description').eq('id', characterId).single();
      if (char) characterPart = `(Character: ${char.description})`; 
    }

    // 融合视觉特征
    if (keyFeaturesPrompt) {
        characterPart += `, ${keyFeaturesPrompt}`;
    }

    let finalPrompt = `${shotPart}, ${actionPrompt}, ${characterPart}`;
    
    // 场景与风格锁
    if (referenceImageUrl && sceneImageUrl) finalPrompt += `, (detailed background environment:1.6)`; 
    finalPrompt += `, (${stylePart}:1.4)`;

    // 3. Payload 构造
    const imageSize = RATIO_MAP[aspectRatio] || "2560x1440";
    const negativePrompt = getNegativePrompt(shotType, stylePreset);

    const payload: any = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      negative_prompt: negativePrompt, 
      size: imageSize, 
      n: 1
    };

    // 4. 高级 Img2Img 策略 (修复构图残留)
    const targetRefImage = referenceImageUrl || sceneImageUrl;

    if (targetRefImage) {
        const base64Image = await imageUrlToBase64(targetRefImage);
        
        if (base64Image) {
            payload.image_url = base64Image;
            let strength = 0.65; 

            if (visionAnalysis) {
                const refShot = visionAnalysis.shot_type; 
                const targetShot = shotType.toUpperCase();             
                
                console.log(`[Smart Logic] 视觉对比: 原图[${refShot}] -> 目标[${targetShot}]`);

                // 核心修复逻辑：景别跨度过大处理
                if (refShot.includes("Full") && isCloseUp) {
                    // 全身转特写：最高重绘，彻底否定腿部坐标
                    strength = 0.88; 
                    payload.prompt += ", (zoomed in:1.5), (waist up:1.8), (ignore legs:2.0)";
                    
                    // 如果 Vision 识别到了头部位置，这里理论上可以做前置裁剪 (Canvas)，目前通过 Prompt 暴力重定向
                    if (visionAnalysis.subject_composition?.head_y_range) {
                        payload.prompt += `, (focus on upper portion of reference:1.4)`;
                    }
                } else if (refShot.includes("Close") && targetShot.includes("FULL")) {
                    // 特写转全身：必须极高强度以补全身体
                    strength = 0.92;
                    payload.prompt += ", (full body standing:1.6), (complete outfit:1.4)";
                } else if (refShot.replace(" ","").toUpperCase() === targetShot.replace(" ","")) {
                    // 景别一致：低重绘，保持一致性
                    strength = 0.40; 
                } else {
                    strength = calculateBlindStrength(shotType);
                }
            } else {
                strength = calculateBlindStrength(shotType);
            }

            console.log(`[Server] Final Strength Decision: ${strength}`);
            payload.strength = strength;
            payload.ref_strength = strength;
        }
    }

    // 5. 请求与重试
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
        // ... (保持原有的降级重试逻辑)
        console.error("API Error:", data.error);
        if (data.error?.code === 'invalid_parameter') {
             delete payload.image_url;
             delete payload.strength;
             const retryRes = await fetch(ARK_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify(payload)
            });
            const retryData = await retryRes.json();
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