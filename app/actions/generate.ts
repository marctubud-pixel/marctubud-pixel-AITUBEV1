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
 * 💡 语义检查 1：非面部肢体/物体细节 (开启 No Face 模式)
 * ❌ 移除了 'eye', '眼', 'mouth', 'lip'
 */
function isNonFaceDetail(prompt: string): boolean {
    const keywords = [
      'hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand',
      '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿'
    ];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

/**
 * 💡 语义检查 2：面部微距特写 (开启 Face 模式，但过滤衣服)
 */
function isFaceMacro(prompt: string): boolean {
    const keywords = ['eye', 'lip', 'mouth', 'nose', 'lash', '眼', '嘴', '唇', '鼻', '睫毛', 'pupil', 'iris'];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

/**
 * 🧹 特征清洗器：如果是特写，过滤掉下半身衣物
 */
function cleanVisualFeatures(features: string[], isCloseUp: boolean): string[] {
    if (!isCloseUp) return features;
    
    // 垃圾词库：特写时不应该出现的词
    const banList = [
        'skirt', 'dress', 'pants', 'jeans', 'trousers', 'shoe', 'boot', 'sock', 'leg', 'knee', 'thigh', 'waist', 
        'standing', 'walking', 'full body', 'pleated', 'uniform', 'bag'
    ];
    
    return features.filter(f => !banList.some(ban => f.toLowerCase().includes(ban)));
}

function getStrictNegative(shotType: string, isNonFace: boolean, stylePreset: string): string {
    let base = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands";
    
    if (stylePreset === 'realistic') {
        base += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting";
    }

    if (isNonFace) {
        // 肢体/物体特写：封杀人脸
        return `${base}, face, head, eyes, portrait, person, woman, girl, man, human silhouette, look at camera`;
    } else {
        // 人像/眼部特写：允许脸，但禁止下半身干扰
        return shotType.toUpperCase().includes("CLOSE") 
            ? `${base}, legs, feet, shoes, socks, pants, skirt, lower body, full body` 
            : base;
    }
}

async function processImageRef(url: string, vision: VisionAnalysis | null, targetShot: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed`);
    const buffer = Buffer.from(await res.arrayBuffer());
    let finalBuffer: Buffer = buffer; 
    
    // 只有在全景转非面部特写时才裁剪
    const isTargetClose = targetShot.toUpperCase().includes("CLOSE");
    const isFaceStart = vision?.shot_type.includes("Full");

    if (isFaceStart && isTargetClose && vision?.subject_composition?.head_y_range) {
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

    // 🚨 模式判定
    const isNonFace = isNonFaceDetail(actionPrompt); // 拍手、脚 -> No Face
    const isFaceMacroShot = isFaceMacro(actionPrompt); // 拍眼、嘴 -> Face OK, No Body
    const isCloseUp = shotType.toUpperCase().includes("CLOSE") || isFaceMacroShot;

    console.log(`[Server] 生成模式: ${isNonFace ? '肢体/物体' : (isFaceMacroShot ? '面部微距' : '常规人像')}`);

    // 1. 视觉分析与清洗
    let visionAnalysis: VisionAnalysis | null = null;
    let keyFeaturesPrompt = "";
    if (referenceImageUrl) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis && visionAnalysis.key_features) {
                // 🔥 核心修复：如果是特写，强制过滤掉 skirt, socks 等干扰词
                const cleanedFeatures = cleanVisualFeatures(visionAnalysis.key_features, isCloseUp);
                
                // 如果是 No Face 模式，进一步过滤五官
                const finalFeatures = cleanedFeatures.filter(f => 
                    !isNonFace || !['eye', 'lip', 'nose', 'face', 'hair'].some(k => f.includes(k.toLowerCase()))
                );

                keyFeaturesPrompt = finalFeatures.map(f => `(${f}:1.1)`).join(", ");
                console.log(`[Features] 原始: ${visionAnalysis.key_features.length} -> 清洗后: ${finalFeatures.length} (${finalFeatures.join(',')})`);
            }
        } catch (e) { console.warn("[Vision] 跳过", e); }
    }

    // 2. Prompt 组装
    const stylePart = isDraftMode ? "sketch" : (STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']);
    let finalPrompt = "";
    let characterPart = "";

    // 角色描述注入
    if (characterId) {
      const { data: char } = await supabaseAdmin.from('characters').select('description').eq('id', characterId).single();
      if (char) {
          if (isNonFace) {
             characterPart = ""; // 拍脚时不带人设
          } else if (isFaceMacroShot) {
             // 拍眼时，只保留人设的前半部分（通常是发色瞳色），截断衣服描述
             characterPart = `(Character features: ${char.description.substring(0, 50)}), `;
          } else {
             characterPart = `(Character: ${char.description}), `;
          }
      }
    }

    if (isNonFace) {
        // 🦵 肢体模式：脚、手
        finalPrompt = `((${actionPrompt}:2.8)), ${keyFeaturesPrompt}, (macro view:1.4), (strictly no people:1.8), (no face:1.8), ${stylePart}`;
    } else if (isFaceMacroShot) {
        // 👁️ 面部微距：眼、嘴 (允许 Character，但在 Vision 阶段已过滤掉衣服)
        finalPrompt = `((${actionPrompt}:2.5)), (macro photography:1.5), (extreme detail:1.4), (focus on face:1.2), ${characterPart} ${keyFeaturesPrompt}, ${stylePart}`;
    } else {
        // 👤 常规模式
        const shotPart = isCloseUp 
            ? `(((${shotType} shot)):2.0), (head and shoulders focus:1.8), (highly detailed face:1.5)`
            : `(${shotType} shot:1.5)`;
        finalPrompt = `${shotPart}, ${actionPrompt}, ${characterPart} ${keyFeaturesPrompt}, (${stylePart}:1.4)`;
    }

    // 3. Payload
    const payload: any = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, 
      negative_prompt: getStrictNegative(shotType, isNonFace, stylePreset), 
      size: RATIO_MAP[aspectRatio] || "2560x1440", 
      n: 1,
      guidance_scale: 8.0 
    };

    // 4. Img2Img
    const targetRefImage = referenceImageUrl || sceneImageUrl;
    if (targetRefImage) {
        const base64Image = await processImageRef(targetRefImage, visionAnalysis, shotType);
        if (base64Image) {
            payload.image_url = base64Image;
            // 眼部微距也需要较高强度来摆脱原图构图
            const highStrength = isNonFace || isFaceMacroShot;
            payload.strength = highStrength ? 0.92 : 0.65;
            payload.ref_strength = highStrength ? 0.92 : 0.65;
        }
    }

    // Log
    console.log("--- [DEBUG: API PAYLOAD] ---");
    console.log("PROMPT:", payload.prompt);
    console.log("NEG:", payload.negative_prompt);
    console.log("----------------------------");

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