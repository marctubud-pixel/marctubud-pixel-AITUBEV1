'use server'

import { createClient } from '@supabase/supabase-js'
import { analyzeRefImage, type VisionAnalysis } from './vision'; 
import sharp from 'sharp'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

// 🟢 配置：双模型路由
const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 
const MODEL_DRAFT = process.env.VOLC_IMAGE_DRAFT_ENDPOINT_ID || process.env.VOLC_IMAGE_ENDPOINT_ID; 

// 🟢 配置：景别权重图
const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME LONG SHOT": "(tiny figure in distance:1.6), (massive environment:2.0), (wide angle lens:1.5), aerial view, <subject> only occupies 10% of frame",
    "LONG SHOT": "(full body visible:1.5), (feet visible:1.5), (surrounding environment visible:1.3), distance shot, wide angle",
    "FULL SHOT": "(full body from head to toe:1.8), (feet visible:1.5), standing pose, environment visible",
    "MID SHOT": "(waist up:1.5), (head and torso focus:1.5), portrait composition",
    "CLOSE-UP": "(face focus:1.8), (head and shoulders:1.5), (background blurred:1.2), depth of field",
    "EXTREME CLOSE-UP": "(macro photography:2.0), (extreme detail:1.5), (focus on single part:2.0), crop to detail"
};

// 🟢 配置：草图模式专用风格
const DRAFT_PROMPT_PREFIX = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0)";
const DRAFT_NEGATIVE = "color, realistic, photorealistic, 3d render, painting, anime, complex details, shading, gradient";

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
 * 作用：当检测到这些词时，强制屏蔽人脸，防止"车轮上长脸"或"脚上长脸"
 */
function isNonFaceDetail(prompt: string): boolean {
    const keywords = [
      'hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand',
      // 🔥 车辆与驾驶关键词 (与 Director 的 Override 对应)
      'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt',
      '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿',
      '车', '轮', '轮胎', '驾驶'
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
    if (!ARK_API_KEY) throw new Error("API Key Missing");

    // 🚨 模式判定
    const isNonFace = isNonFaceDetail(actionPrompt); 
    const isFaceMacroShot = isFaceMacro(actionPrompt);
    const isCloseUp = shotType.toUpperCase().includes("CLOSE") || isFaceMacroShot;

    console.log(`[Server] 生成开始 | 模式: ${isDraftMode ? '草图(Draft)' : '精绘(Pro)'} | 语义: ${isNonFace ? '肢体/物体/车辆' : (isFaceMacroShot ? '微距' : '常规')} | 景别: ${shotType}`);

    // 1. 视觉分析与清洗
    let visionAnalysis: VisionAnalysis | null = null;
    let keyFeaturesPrompt = "";
    
    if (referenceImageUrl && !isDraftMode) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis && visionAnalysis.key_features) {
                const cleanedFeatures = cleanVisualFeatures(visionAnalysis.key_features, isCloseUp);
                const finalFeatures = cleanedFeatures.filter(f => 
                    !isNonFace || !['eye', 'lip', 'nose', 'face', 'hair'].some(k => f.includes(k.toLowerCase()))
                );
                keyFeaturesPrompt = finalFeatures.map(f => `(${f}:1.1)`).join(", ");
            }
        } catch (e) { console.warn("[Vision] 分析跳过", e); }
    }

    // 2. 场景/记忆污染隔离
    const hasEnvironmentPrompt = ['beach', 'sea', 'city', 'room', 'forest', 'sand', 'sky', 'outdoor', 'indoor', 'street'].some(k => actionPrompt.toLowerCase().includes(k));
    let sceneControlPrompt = "";
    
    if (sceneImageUrl) {
        sceneControlPrompt = `(background consistency:1.5)`; 
    } else if (hasEnvironmentPrompt) {
        sceneControlPrompt = `(ignore character background:1.5), (focus on environment description:1.4)`;
    }

    // 3. Prompt 组装
    let finalPrompt = "";
    let characterPart = "";

    // 角色描述处理
    if (characterId) {
      const { data: char } = await supabaseAdmin.from('characters').select('description').eq('id', characterId).single();
      if (char) {
          if (isNonFace) {
             console.log("[Logic] 触发非人脸/物体特写模式，已移除角色描述注入");
             characterPart = ""; 
          } else if (isFaceMacroShot) {
             characterPart = `(Character features: ${char.description.substring(0, 50)}), `;
          } else {
             characterPart = `(Character: ${char.description}), `;
          }
      }
    }

    const shotWeightPrompt = SHOT_PROMPTS[shotType.toUpperCase()] || SHOT_PROMPTS["MID SHOT"];

    if (isDraftMode) {
        finalPrompt = `${DRAFT_PROMPT_PREFIX}, ${shotWeightPrompt}, ${actionPrompt}, ${characterPart} storyboard sketch`;
    } else if (isNonFace) {
        finalPrompt = `((${actionPrompt}:2.8)), ${keyFeaturesPrompt}, (macro view:1.4), (strictly no people:1.8), (no face:1.8), ${stylePreset}`;
    } else if (isFaceMacroShot) {
        finalPrompt = `((${actionPrompt}:2.5)), (macro photography:1.5), (extreme detail:1.4), (focus on face:1.2), ${characterPart} ${keyFeaturesPrompt}, ${stylePreset}`;
    } else {
        finalPrompt = `${shotWeightPrompt}, ${actionPrompt}, ${characterPart} ${keyFeaturesPrompt} ${sceneControlPrompt}, (${STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']}:1.4)`;
    }

    // 4. Payload 构造
    const currentModel = isDraftMode ? MODEL_DRAFT : MODEL_PRO;
    
    const payload: any = {
      model: currentModel, 
      prompt: finalPrompt, 
      negative_prompt: isDraftMode ? DRAFT_NEGATIVE : getStrictNegative(shotType, isNonFace, stylePreset), 
      size: RATIO_MAP[aspectRatio] || "2560x1440", 
      n: 1,
      steps: isDraftMode ? 25 : 40,
      guidance_scale: isDraftMode ? 5.0 : 7.5
    };

    if (referenceImageUrl && !isDraftMode) {
        const base64Image = await processImageRef(referenceImageUrl, visionAnalysis, shotType);
        if (base64Image) {
            payload.image_url = base64Image;
            const highStrength = isNonFace || isFaceMacroShot;
            payload.strength = highStrength ? 0.92 : 0.65;
            payload.ref_strength = highStrength ? 0.92 : 0.65;
        }
    }

    console.log(`[Gen] API Req | Model: ${isDraftMode ? 'DRAFT' : 'PRO'} | Prompt: ${finalPrompt.substring(0, 80)}...`);

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