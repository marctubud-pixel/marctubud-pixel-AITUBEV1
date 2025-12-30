'use server'

import { createClient } from '@supabase/supabase-js'
import { analyzeRefImage, type VisionAnalysis } from './vision'; 
import sharp from 'sharp'; 

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

/**
 * 核心逻辑：物理裁剪预处理器 (修复版)
 */
async function processImageRef(
  url: string, 
  vision: VisionAnalysis | null, 
  targetShot: string
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    let finalBuffer: Buffer = buffer; 
    const isTargetClose = targetShot.toUpperCase().includes("CLOSE") || targetShot.toUpperCase().includes("FACE");

    // 🔥 物理裁剪触发判断
    if (vision?.shot_type.includes("Full") && isTargetClose && vision.subject_composition?.head_y_range) {
      console.log("[Sharp] 启动物理裁剪流程...");
      
      const metadata = await sharp(buffer).metadata();
      
      if (metadata.width && metadata.height) {
        const [startY, endY] = vision.subject_composition.head_y_range;
        const top = Math.max(0, Math.floor(startY * metadata.height * 0.7)); 
        const cropHeight = Math.min(metadata.height - top, Math.floor((endY - startY + 0.3) * metadata.height));
        
        // 修正链式调用语法
        finalBuffer = await sharp(buffer)
          .extract({ 
            left: 0, 
            top: top, 
            width: metadata.width, 
            height: cropHeight 
          })
          .resize(metadata.width, metadata.height, { fit: 'cover' })
          .toBuffer();
          
        console.log("[Sharp] 裁剪完成");
      }
    }

    return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
  } catch (error) {
    console.error("[Sharp] 图像处理失败:", error);
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

    let visionAnalysis: VisionAnalysis | null = null;
    let visualDescription = "";
    let keyFeaturesPrompt = "";

    if (referenceImageUrl) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis) {
                visualDescription = visionAnalysis.description;
                keyFeaturesPrompt = visionAnalysis.key_features?.map(f => `(${f}:1.2)`).join(", ") || "";
            }
        } catch (e) { 
            console.warn("[Vision] 分析跳过", e); 
        }
    }

    const stylePart = isDraftMode 
      ? "rough storyboard sketch, black and white line art, minimal detail"
      : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);
    
    const isCloseUp = shotType.toUpperCase().includes("CLOSE") || shotType.toUpperCase().includes("FACE");
    
    let shotPart = isCloseUp 
        ? `(((${shotType} shot)):2.0), (head and shoulders focus:1.8), (highly detailed face:1.5)` 
        : `(${shotType} shot:1.5)`; 

    let characterPart = "";
    if (characterId) {
      const { data: char } = await supabaseAdmin.from('characters').select('description').eq('id', characterId).single();
      if (char) characterPart = `(Character: ${char.description})`; 
    }

    if (keyFeaturesPrompt) characterPart += `, ${keyFeaturesPrompt}`;

    let finalPrompt = `${shotPart}, ${actionPrompt}, ${characterPart}`;
    finalPrompt += `, (${stylePart}:1.4)`;

    const imageSize = RATIO_MAP[aspectRatio] || "2560x1440";
    const negativePrompt = getNegativePrompt(shotType, stylePreset);

    const payload: any = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      negative_prompt: negativePrompt, 
      size: imageSize, 
      n: 1
    };

    const targetRefImage = referenceImageUrl || sceneImageUrl;

    if (targetRefImage) {
        const base64Image = await processImageRef(targetRefImage, visionAnalysis, shotType);
        
        if (base64Image) {
            payload.image_url = base64Image;
            let strength = 0.65; 

            if (visionAnalysis) {
                const refShot = visionAnalysis.shot_type; 
                const targetShot = shotType.toUpperCase();             
                
                if (refShot.includes("Full") && isCloseUp) {
                    strength = 0.82; 
                    payload.prompt += ", (zoomed in portrait:1.5), (ignore reference background:1.2)";
                } else if (refShot.includes("Close") && targetShot.includes("FULL")) {
                    strength = 0.92;
                } else if (refShot.replace(" ","").toUpperCase() === targetShot.replace(" ","")) {
                    strength = 0.45; 
                }
            }

            console.log(`[Server] Final Strength: ${strength}`);
            payload.strength = strength;
            payload.ref_strength = strength;
        }
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
    
    if (!response.ok) {
        if (data.error?.code === 'invalid_parameter') {
             delete payload.image_url;
             delete payload.strength;
             const retryRes = await fetch(ARK_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify(payload)
            });
            return processResponse(await retryRes.json(), shotId, projectId);
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