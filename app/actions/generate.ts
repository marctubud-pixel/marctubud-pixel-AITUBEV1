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

/**
 * 💡 语义检查：判断提示词是否描述的是非面部局部细节
 */
function isNonFaceDetail(prompt: string): boolean {
    const keywords = ['hand', 'finger', 'keyboard', 'feet', 'shoe', 'eye', 'typing', 'holding', 'tool', 'object', 'close-up of'];
    const lower = prompt.toLowerCase();
    return keywords.some(k => lower.includes(k));
}

function getNegativePrompt(shotType: string, stylePreset: string, actionPrompt: string): string {
    const upper = shotType.toUpperCase();
    let baseNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands";
    
    if (stylePreset === 'realistic' || stylePreset === 'noir') {
        baseNegative += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting, digital art";
    }

    // 🔥 细节特写模式下，极度强化负面屏蔽词
    if (isNonFaceDetail(actionPrompt)) {
        baseNegative += ", (face:2.0), (head:2.0), (eyes:1.8), (lips:1.8), (nose:1.8), (hair:1.8), portrait, woman, girl, man, boy, person, human silhouette, look at camera";
    }
    
    if (upper.includes("CLOSE") || upper.includes("FACE") || upper.includes("HEAD")) {
        return `${baseNegative}, legs, feet, shoes, lower body, full body, wide shot, distant view`;
    }
    
    return baseNegative;
}

async function processImageRef(
  url: string, 
  vision: VisionAnalysis | null, 
  targetShot: string
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed`);
    const buffer = Buffer.from(await res.arrayBuffer());

    let finalBuffer: Buffer = buffer; 
    const isTargetClose = targetShot.toUpperCase().includes("CLOSE");

    if (vision?.shot_type.includes("Full") && isTargetClose && vision.subject_composition?.head_y_range) {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        const [startY, endY] = vision.subject_composition.head_y_range;
        const top = Math.max(0, Math.floor(startY * metadata.height * 0.7)); 
        const cropHeight = Math.min(metadata.height - top, Math.floor((endY - startY + 0.3) * metadata.height));
        
        finalBuffer = await sharp(buffer)
          .extract({ left: 0, top: top, width: metadata.width, height: cropHeight })
          .resize(metadata.width, metadata.height, { fit: 'cover' })
          .toBuffer();
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

    const isDetailShot = isNonFaceDetail(actionPrompt);
    const isCloseUp = shotType.toUpperCase().includes("CLOSE");

    console.log(`[Server] Gen Start | Mode: ${isDetailShot ? 'DETACHED DETAIL' : 'CHARACTER SHOT'}`);

    // 1. 启动深度视觉感知
    let visionAnalysis: VisionAnalysis | null = null;
    let visualDescription = "";
    let keyFeaturesPrompt = "";

    if (referenceImageUrl) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis) {
                visualDescription = visionAnalysis.description;
                // 如果是局部特写，完全过滤掉面部描述词
                keyFeaturesPrompt = visionAnalysis.key_features
                    ?.filter(f => !isDetailShot || !['eye', 'lip', 'nose', 'face', 'hair'].some(k => f.includes(k.toLowerCase())))
                    .map(f => `(${f}:1.1)`).join(", ") || "";
            }
        } catch (e) { console.warn("[Vision] 分析跳过", e); }
    }

    // 2. 动态构建熔断式 Prompt
    const stylePart = isDraftMode 
      ? "rough storyboard sketch, black and white line art, minimal detail"
      : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);
    
    let finalPrompt = "";
    let characterPart = "";

    // 获取角色描述（如果不是细节分镜，则全量获取）
    if (characterId) {
      const { data: char } = await supabaseAdmin.from('characters').select('description').eq('id', characterId).single();
      if (char && !isDetailShot) {
          characterPart = `(Character: ${char.description}), `;
      } else if (char && isDetailShot) {
          // 细节模式下只保留肤色和服装色，绝对不提人脸
          characterPart = `(skin and texture focus:1.2), `;
      }
    }

    if (isDetailShot) {
        // 🔥 熔断逻辑：细节分镜完全重新拼写 Prompt，强制物体优先
        finalPrompt = `((${actionPrompt}:2.5)), ${characterPart} ${keyFeaturesPrompt}, (extreme close-up view:1.4), (macro photography style:1.3), (strictly no people:1.5), (no face:1.5), ${stylePart}`;
    } else {
        // 正常人像分镜
        const shotPart = isCloseUp 
            ? `(((${shotType} shot)):2.0), (head and shoulders focus:1.8), (highly detailed face:1.5)`
            : `(${shotType} shot:1.5)`;
        finalPrompt = `${shotPart}, ${actionPrompt}, ${characterPart} ${keyFeaturesPrompt}, (${stylePart}:1.4)`;
    }

    // 3. Payload 构造
    const payload: any = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      negative_prompt: getNegativePrompt(shotType, stylePreset, actionPrompt), 
      size: RATIO_MAP[aspectRatio] || "2560x1440", 
      n: 1,
      guidance_scale: 7.5 // 保持适中的引导强度
    };

    // 4. 参考图处理
    const targetRefImage = referenceImageUrl || sceneImageUrl;
    if (targetRefImage) {
        const base64Image = await processImageRef(targetRefImage, visionAnalysis, shotType);
        if (base64Image) {
            payload.image_url = base64Image;
            // 细节特写如果带参考图，需要极高的强度来摆脱原有的“人”的构图
            payload.strength = isDetailShot ? 0.88 : 0.65;
            payload.ref_strength = isDetailShot ? 0.88 : 0.65;
        }
    }

    console.log(`[Final Prompt] ${finalPrompt.substring(0, 100)}...`);

    // 5. 请求发送
    const response = await fetch(ARK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Generation Failed");

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