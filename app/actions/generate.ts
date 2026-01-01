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

// 🟢 1. 强化景别控制 (加入反向抑制)
const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME WIDE SHOT": "(tiny figure:1.5), (massive environment:2.0), wide angle lens, aerial view, <subject> only occupies 5% of frame, (no close up:2.0), (no portrait:2.0)",
    "WIDE SHOT": "(full body visible:1.6), (feet visible:1.6), (head to toe:1.5), distance shot, wide angle, environment focus, (no crop:1.5)",
    "FULL SHOT": "(full body from head to toe:1.8), (feet visible:1.6), standing pose, environment visible, (no close up:1.5)",
    "MID SHOT": "(waist up:1.5), (head and torso focus:1.5), portrait composition, standard cinematic shot",
    "CLOSE-UP": "(face focus:1.8), (head and shoulders:1.5), (background blurred:1.2), depth of field, emotion focus",
    "EXTREME CLOSE-UP": "(macro photography:2.0), (extreme detail:1.5), (focus on single part:2.0), crop to detail, (no full body:2.0)"
};

// 2. 拍摄角度词库
const ANGLE_PROMPTS: Record<string, string> = {
    "EYE LEVEL": "eye level shot, neutral angle, straight on",
    "LOW ANGLE": "low angle shot, (looking up at subject:1.4), worm's eye view, imposing, floor level camera",
    "HIGH ANGLE": "high angle shot, (looking down at subject:1.4), bird's eye view, vulnerable, camera above head",
    "OVERHEAD SHOT": "directly overhead, top down view, god's eye view, 90 degree angle down, map view",
    "DUTCH ANGLE": "dutch angle, tilted camera, slanted horizon, dynamic composition, unease",
    "OVER-THE-SHOULDER": "over the shoulder shot, focus on subject, blurred foreground shoulder"
};

const OBJECT_SHOT_PROMPTS: Record<string, string> = {
    "CLOSE-UP": "(macro view:1.5), (object focus:1.8), (detail shot:1.5), low angle, depth of field, (no face:2.0)",
    "EXTREME CLOSE-UP": "(microscopic detail:2.0), (texture focus:1.8), macro photography, (no face:2.0)",
    "MID SHOT": "(object center frame:1.5), (clear view:1.5), (no face:1.5)",
    "FULL SHOT": "(full object visible:1.5), (environment context:1.2)"
};

// 🟢 3. 回归经典线稿风格 (Classic V3 Style)
const DRAFT_PROMPT_CLASSIC = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0), professional storyboard";
const DRAFT_NEGATIVE_BASE = "color, realistic, photorealistic, 3d render, painting, anime, complex details, shading, gradient, text, watermark";

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
    const keywords = ['hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand', 'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt', 'pedal', '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿', '积水', '步伐', '脚步', '水花', '踩', '车', '轮', '轮胎', '驾驶'];
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

    // 🟢 针对全景/远景的强力负面 (防止大头照)
    if (shotType.includes("WIDE") || shotType.includes("LONG") || shotType.includes("FULL")) {
        base += ", close up, portrait, face focus, headshot, macro";
    }

    if (isNonFace) {
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
  useMock: boolean = false,
  cameraAngle: string = 'EYE LEVEL'
  // 移除 draftStyle 参数
) {
  try {
    console.log(`\n========== [DEBUG: Shot ${shotId}] ==========`);
    console.log(`1. Mode: ${isDraftMode ? 'DRAFT' : 'RENDER'} | Ratio: ${aspectRatio} | Angle: ${cameraAngle}`);

    if (useMock) { return { success: true, url: "https://picsum.photos/1280/720" }; }
    if (!ARK_API_KEY) throw new Error("API Key Missing");

    const isNonFace = isNonFaceDetail(actionPrompt); 

    let activeRefImage = referenceImageUrl;
    let characterPart = "";
    let characterNegative = ""; 

    // Render模式下注入角色
    const shouldInjectCharacter = characterId && !isDraftMode; 

    if (shouldInjectCharacter && characterId) {
      const { data: char } = await supabaseAdmin
        .from('characters')
        .select('name, description, negative_prompt, avatar_url')
        .eq('id', characterId)
        .maybeSingle(); 
        
      if (char) {
          if (!isNonFace) characterPart = `(Character: ${char.description}), `;
          if (char.negative_prompt) characterNegative = `, ${char.negative_prompt}`;
          
          if (!activeRefImage && char.avatar_url && !isNonFace) {
              activeRefImage = char.avatar_url;
              console.log(`✅ [Render Mode] 角色头像注入`);
          }
      }
    }

    let visionAnalysis: VisionAnalysis | null = null;
    let keyFeaturesPrompt = "";
    if (activeRefImage) {
        try { visionAnalysis = await analyzeRefImage(activeRefImage); } catch (e) {}
    }
    
    const shotDictionary = isNonFace ? OBJECT_SHOT_PROMPTS : SHOT_PROMPTS;
    const shotWeightPrompt = shotDictionary[shotType.toUpperCase()] || shotDictionary["MID SHOT"];
    const angleWeightPrompt = ANGLE_PROMPTS[cameraAngle.toUpperCase()] || ANGLE_PROMPTS["EYE LEVEL"];
    
    let finalPrompt = "";
    let finalNegative = "";

    if (isDraftMode) {
        // 🟢 经典线稿风格
        finalPrompt = `(${DRAFT_PROMPT_CLASSIC}), (${shotWeightPrompt}), (${angleWeightPrompt}), ${actionPrompt}`;
        finalNegative = `${DRAFT_NEGATIVE_BASE}`;
    } else {
        finalPrompt = `(${shotWeightPrompt}), (${angleWeightPrompt}), ${actionPrompt}, ${characterPart} ${keyFeaturesPrompt} (${STYLE_PRESETS[stylePreset]}:1.4)`; 
        finalNegative = `${getStrictNegative(shotType, isNonFace, stylePreset, isDraftMode)}${characterNegative}`;
    }

    const payload: any = {
      model: isDraftMode ? MODEL_DRAFT : MODEL_PRO, 
      prompt: finalPrompt, 
      negative_prompt: finalNegative, 
      size: RATIO_MAP[aspectRatio] || "2560x1440", 
      n: 1
    };

    if (activeRefImage) { 
        const base64Image = await processImageRef(activeRefImage, visionAnalysis, shotType);
        if (base64Image) {
            payload.image_url = base64Image;
            payload.strength = 0.65;
            payload.ref_strength = 0.65;
        }
    }

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