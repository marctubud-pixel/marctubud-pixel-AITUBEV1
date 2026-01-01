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

const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 
const MODEL_DRAFT = process.env.VOLC_IMAGE_DRAFT_ENDPOINT_ID || process.env.VOLC_IMAGE_ENDPOINT_ID; 

const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME LONG SHOT": "(tiny figure in distance:1.6), (massive environment:2.0), (wide angle lens:1.5), aerial view, <subject> only occupies 10% of frame",
    "LONG SHOT": "(full body visible:1.5), (feet visible:1.5), (surrounding environment visible:1.3), distance shot, wide angle",
    "FULL SHOT": "(full body from head to toe:1.8), (feet visible:1.5), standing pose, environment visible",
    "MID SHOT": "(waist up:1.5), (head and torso focus:1.5), portrait composition",
    "CLOSE-UP": "(face focus:1.8), (head and shoulders:1.5), (background blurred:1.2), depth of field",
    "EXTREME CLOSE-UP": "(macro photography:2.0), (extreme detail:1.5), (focus on single part:2.0), crop to detail"
};

// [Hallucination Killer] 物体特写专用定义
const OBJECT_SHOT_PROMPTS: Record<string, string> = {
    "CLOSE-UP": "(macro view:1.5), (object focus:1.8), (detail shot:1.5), low angle, depth of field, (no face:2.0)",
    "EXTREME CLOSE-UP": "(microscopic detail:2.0), (texture focus:1.8), macro photography, (no face:2.0)",
    "MID SHOT": "(object center frame:1.5), (clear view:1.5), (no face:1.5)",
    "FULL SHOT": "(full object visible:1.5), (environment context:1.2)"
};

const DRAFT_PROMPT_PREFIX = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0)";
const DRAFT_NEGATIVE_BASE = "color, realistic, photorealistic, 3d render, painting, anime, complex details, shading, gradient";

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
  "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048", "4:3": "2304x1728", "3:4": "1728x2304", "2.39:1": "3072x1280" 
};

function isNonFaceDetail(prompt: string): boolean {
    const keywords = [
      'hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand',
      'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt', 'pedal',
      '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿', 
      '积水', '步伐', '脚步', '水花', '踩', 
      '车', '轮', '轮胎', '驾驶'
    ];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

function isFaceMacro(prompt: string): boolean {
    const keywords = ['eye', 'lip', 'mouth', 'nose', 'lash', '眼', '嘴', '唇', '鼻', '睫毛', 'pupil', 'iris'];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

function cleanVisualFeatures(features: string[], isCloseUp: boolean): string[] {
    if (!isCloseUp) return features;
    const banList = ['skirt', 'dress', 'pants', 'jeans', 'trousers', 'shoe', 'boot', 'sock', 'leg', 'knee', 'thigh', 'waist', 'standing', 'walking', 'full body', 'pleated', 'uniform', 'bag'];
    return features.filter(f => !banList.some(ban => f.toLowerCase().includes(ban)));
}

function getStrictNegative(shotType: string, isNonFace: boolean, stylePreset?: string, isDraftMode?: boolean): string {
    let base = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands";
    
    if (isDraftMode) {
        base = DRAFT_NEGATIVE_BASE; 
    } else if (stylePreset === 'realistic') {
        base += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting";
    }

    if (isNonFace) {
        // [Hallucination Killer] 强力压制非人脸镜头中的人脸
        return `${base}, face, head, eyes, portrait, person, woman, girl, man, boy, human silhouette, look at camera, upper body, torso, selfie, hair`;
    } else {
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
            finalBuffer = await sharp(buffer).extract({ left: 0, top: top, width: metadata.width, height: cropHeight }).resize(metadata.width, metadata.height, { fit: 'cover' }).toBuffer();
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
  sceneImageUrl?: string,
  useMock: boolean = false 
) {
  try {
    // 🛑 Mock 拦截器
    if (useMock) {
        console.log(`[Mock Mode] Skipping AI generation for Shot ${shotId}`);
        await new Promise(resolve => setTimeout(resolve, 800)); // 模拟延迟
        
        // 随机返回一张高质量占位图，用于测试UI布局
        const seeds = [10, 20, 30, 40, 50, 60];
        const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
        const width = aspectRatio === '9:16' ? 720 : 1280;
        const height = aspectRatio === '9:16' ? 1280 : 720;
        const mockUrl = `https://picsum.photos/seed/${randomSeed + Number(shotId)}/${width}/${height}`; 
        
        return { success: true, url: mockUrl };
    }

    if (!ARK_API_KEY) throw new Error("API Key Missing");

    const isNonFace = isNonFaceDetail(actionPrompt); 
    const isFaceMacroShot = isFaceMacro(actionPrompt);
    const isCloseUp = shotType.toUpperCase().includes("CLOSE") || isFaceMacroShot;

    console.log(`[Server] 生成开始 | Type:${shotType} | NonFace:${isNonFace} | Prompt: ${actionPrompt.substring(0, 30)}...`);

    // 1. 视觉分析
    let visionAnalysis: VisionAnalysis | null = null;
    let keyFeaturesPrompt = "";
    if (referenceImageUrl && !isDraftMode) {
        try {
            visionAnalysis = await analyzeRefImage(referenceImageUrl);
            if (visionAnalysis && visionAnalysis.key_features) {
                const cleanedFeatures = cleanVisualFeatures(visionAnalysis.key_features, isCloseUp);
                const finalFeatures = cleanedFeatures.filter(f => !isNonFace || !['eye', 'lip', 'nose', 'face', 'hair'].some(k => f.includes(k.toLowerCase())));
                keyFeaturesPrompt = finalFeatures.map(f => `(${f}:1.1)`).join(", ");
            }
        } catch (e) { console.warn("[Vision] 分析跳过", e); }
    }

    // 2. 场景隔离
    const hasEnvironmentPrompt = ['beach', 'sea', 'city', 'room', 'forest', 'sand', 'sky', 'outdoor', 'indoor', 'street'].some(k => actionPrompt.toLowerCase().includes(k));
    let sceneControlPrompt = "";
    if (sceneImageUrl) {
        sceneControlPrompt = `(background consistency:1.5)`; 
    } else if (hasEnvironmentPrompt) {
        sceneControlPrompt = `(ignore character background:1.5), (focus on environment description:1.4)`;
    }

    // 3. Prompt 组装与清洗
    let finalPrompt = "";
    let characterPart = "";
    let characterNegative = ""; // [New] 角色专属负面提示词

    let cleanedActionPrompt = actionPrompt;
    
    // [Hallucination Killer] 主语清洗 - 使用单词边界 \b 防止误杀
    if (isNonFace) {
        cleanedActionPrompt = cleanedActionPrompt
            .replace(/他/g, "")
            .replace(/她/g, "")
            .replace(/男人/g, "")
            .replace(/女人/g, "")
            .replace(/侦探/g, "")
            .replace(/主角/g, "")
            .replace(/\bman\b/gi, "")       // 使用正则边界，防止替换 mansion -> sion
            .replace(/\bwoman\b/gi, "")
            .replace(/\bhe\b/gi, "")
            .replace(/\bshe\b/gi, "")
            .replace(/\bperson\b/gi, "")
            .replace(/\bdetective\b/gi, "");
    }

    // [New] 角色数据加载 (包含 negative_prompt)
    if (characterId) {
      const { data: char } = await supabaseAdmin
        .from('characters')
        .select('description, negative_prompt')
        .eq('id', characterId)
        .single();
        
      if (char) {
          // A. 处理正向描述
          if (isNonFace) {
             characterPart = ""; // 特写镜头移除角色描述
          } else if (isFaceMacroShot) {
             characterPart = `(Character features: ${char.description.substring(0, 50)}), `;
          } else {
             characterPart = `(Character: ${char.description}), `;
          }

          // B. 处理负面描述 (追加到 Negative Prompt)
          if (char.negative_prompt) {
             characterNegative = `, ${char.negative_prompt}`;
          }
      }
    }

    const shotDictionary = isNonFace ? OBJECT_SHOT_PROMPTS : SHOT_PROMPTS;
    const shotWeightPrompt = shotDictionary[shotType.toUpperCase()] || shotDictionary["MID SHOT"] || "";

    if (isDraftMode) {
        if (isNonFace) {
            finalPrompt = `${DRAFT_PROMPT_PREFIX}, ${shotWeightPrompt}, ((${cleanedActionPrompt}:1.5)), (strictly no people:2.0), storyboard sketch`;
        } else {
            finalPrompt = `${DRAFT_PROMPT_PREFIX}, ${shotWeightPrompt}, ${cleanedActionPrompt}, ${characterPart} storyboard sketch`;
        }
    } else {
        if (isNonFace) {
             finalPrompt = `((${cleanedActionPrompt}:2.8)), ${shotWeightPrompt}, ${keyFeaturesPrompt}, (macro view:1.4), (strictly no people:2.0), (no face:2.0), ${stylePreset}`;
        } else if (isFaceMacroShot) {
             finalPrompt = `((${cleanedActionPrompt}:2.5)), ${shotWeightPrompt}, (focus on face:1.2), ${characterPart} ${keyFeaturesPrompt}, ${stylePreset}`;
        } else {
             finalPrompt = `${shotWeightPrompt}, ${cleanedActionPrompt}, ${characterPart} ${keyFeaturesPrompt} ${sceneControlPrompt}, (${STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']}:1.4)`;
        }
    }

    const currentModel = isDraftMode ? MODEL_DRAFT : MODEL_PRO;
    
    // [New] 组合负面提示词
    const baseNegative = getStrictNegative(shotType, isNonFace, stylePreset, isDraftMode);
    const finalNegative = `${baseNegative}${characterNegative}`;

    const payload: any = {
      model: currentModel, 
      prompt: finalPrompt, 
      negative_prompt: finalNegative, 
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

    console.log(`[Gen] API Req | NonFace:${isNonFace} | Prompt: ${finalPrompt.substring(0, 50)}... | Neg: ${finalNegative.substring(0, 20)}...`);

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