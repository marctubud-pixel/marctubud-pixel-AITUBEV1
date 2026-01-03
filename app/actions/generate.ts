'use server'

import { createClient } from '@supabase/supabase-js'
import { analyzeRefImage, type VisionAnalysis } from './vision'; 
import sharp from 'sharp'; 
import Replicate from "replicate"; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const INSTANT_ID_MODEL = "zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789";
const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 
const MODEL_DRAFT = process.env.VOLC_IMAGE_DRAFT_ENDPOINT_ID || process.env.VOLC_IMAGE_ENDPOINT_ID; 

// --- [常量配置] ---

const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME WIDE SHOT": "(tiny figure:1.5), (massive environment:2.0), wide angle lens, aerial view, <subject> only occupies 5% of frame, (no close up:2.0), (no portrait:2.0)",
    "WIDE SHOT": "(full body visible:1.6), (feet visible:1.6), (head to toe:1.5), distance shot, wide angle, environment focus, (no crop:1.5)",
    "FULL SHOT": "(full body from head to toe:1.8), (feet visible:1.6), standing pose, environment visible, (no close up:1.5)",
    "MID SHOT": "(waist up:1.5), (head and torso focus:1.5), portrait composition, standard cinematic shot",
    "CLOSE-UP": "(both eyes visible:1.8), (face focus:1.8), (head and shoulders:1.5), depth of field, emotion focus",
    "EXTREME CLOSE-UP": "(both eyes visible:2.0), (upper face focus:1.8), (macro photography:1.2), (extreme facial detail:1.5), (no single eye:2.0)"
};

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

const STYLE_PRESETS: Record<string, string> = {
  "realistic": "cinematic lighting, photorealistic, 8k, masterpiece, movie still, arri alexa, high detail, real photo",
  "anime_jp": "anime style, studio ghibli, makoto shinkai, vibrant colors, clean lines",
  "anime_us": "western comic book style, marvel comics, bold lines, dynamic shading",
  "cyberpunk": "cyberpunk 2077 style, neon lights, high contrast, futuristic, tech noir",
  "noir": "film noir, black and white photography, dramatic shadows, high contrast, grainy",
  "pixar": "pixar 3d animation style, disney, unreal engine 5 render, cute, 3d character",
  "watercolor": "watercolor painting, artistic, soft edges, dreamy atmosphere",
  "ink": "traditional chinese ink painting, sumi-e, artistic, brush strokes",
  "sketch": "rough storyboard sketch, architectural line drawing, black and white, ink lines, comic style, high contrast, professional composition"
};

const RATIO_MAP: Record<string, string> = {
  "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048", "4:3": "2304x1728", "3:4": "1728x2304", "2.39:1": "3072x1280" 
};

const DRAFT_PROMPT_CLASSIC = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0), professional storyboard, greyscale, lineart";
const DRAFT_NEGATIVE_BASE = "color, realistic, photorealistic, 3d render, painting, anime, complex details, shading, gradient, text, watermark, (yellow:1.5), (orange:1.5), (purple:1.5), (golden:1.5)";

function isNonFaceDetail(prompt: string): boolean {
    const keywords = ['hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand', 'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt', 'pedal', '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿', '积水', '步伐', '脚步', '水花', '踩', '车', '轮', '轮胎', '驾驶', '风景', '场景', '背景', '环境'];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

function getStrictNegative(shotType: string, isNonFace: boolean, stylePreset?: string, isDraftMode?: boolean): string {
    let base = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands";
    if (isDraftMode) {
        base = DRAFT_NEGATIVE_BASE;
    } else if (stylePreset === 'realistic') {
        base += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting";
    }
    if (shotType.includes("WIDE") || shotType.includes("LONG") || shotType.includes("FULL")) {
        base += ", close up, portrait, face focus, headshot, macro";
    }
    if (isNonFace) {
        return `${base}, (face:2.0), (head:2.0), (eyes:2.0), portrait, (person:5.0), woman, girl, man, boy, (humanoid silhouette:1.5), look at camera, upper body, torso, selfie, hair`;
    } else {
        return shotType.toUpperCase().includes("CLOSE") 
            ? `${base}, legs, feet, shoes, socks, pants, skirt, lower body, full body` 
            : base;
    }
}

async function processImageRef(url: string, vision: VisionAnalysis | null, targetShot: string, makeGrayscale: boolean = false): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed`);
        const buffer = Buffer.from(await res.arrayBuffer());
        let processor = sharp(buffer);
        if (makeGrayscale) {
             processor = processor.grayscale().linear(1.5, -40).sharpen({ sigma: 1.5 }); 
        }
        const metadata = await processor.metadata(); 
        let finalBuffer: Buffer;
        const isTargetClose = targetShot.toUpperCase().includes("CLOSE");
        const isFaceStart = vision?.shot_type.includes("Full");
        if (isFaceStart && isTargetClose && vision?.subject_composition?.head_y_range && metadata.width && metadata.height) {
             const [startY, endY] = vision.subject_composition.head_y_range;
             const top = Math.max(0, Math.floor(startY * metadata.height * 0.7)); 
             const cropHeight = Math.min(metadata.height - top, Math.floor((endY - startY + 0.3) * metadata.height));
             processor = processor.extract({ left: 0, top: top, width: metadata.width, height: cropHeight });
        }
        finalBuffer = await processor.resize({ width: 1536, height: 1536, fit: 'inside' }).toBuffer();
        return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
      } catch (error) {
        console.error("[Sharp] 图像处理失败:", error);
        return null;
      }
}

// --- [主生成函数] ---

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
  cameraAngle: string = 'EYE LEVEL',
  useInstantID: boolean = false,
  negativePrompt?: string
) {
  try {
    console.log(`\n========== [DEBUG: Shot ${shotId}] ==========`);
    const isNonFace = isNonFaceDetail(actionPrompt); 

    if (useMock) { return { success: true, url: "https://picsum.photos/1280/720" }; }

    let activeRefImage = referenceImageUrl;
    let characterPart = "";
    let characterNegative = ""; 

    if (characterId) {
      // 🟢 [新架构] 查询 description_map
      const { data: char } = await supabaseAdmin.from('characters')
        .select('name, description, negative_prompt, avatar_url, assets, description_map')
        .eq('id', characterId).maybeSingle(); 
      
      if (char) {
          if (!isNonFace) {
             const p = actionPrompt.toLowerCase();
             let targetDescription = char.description || "";
             const descMap = char.description_map || {};
             
             // 🟢 智能资产与描述匹配 (Generate 版)
             // 只要命中背影/侧脸资产，就自动切换为对应的干净描述
             let isBackView = false;
             
             if (!activeRefImage && char.assets) {
                 // 宽容匹配
                 if (/back view|rear|behind|背影|背对|背向|背身|后背/.test(p) && char.assets["back"]) {
                     console.log("🎯 [Generate] 命中背影资产 -> 切换背影描述");
                     activeRefImage = char.assets["back"];
                     if(descMap.back) targetDescription = descMap.back; // 切换！
                     isBackView = true;
                 } else if (/side|profile|侧/.test(p) && char.assets["side"]) {
                     console.log("🎯 [Generate] 命中侧脸资产 -> 切换侧脸描述");
                     activeRefImage = char.assets["side"];
                     if(descMap.side) targetDescription = descMap.side; // 切换！
                 }
             }

             if (isDraftMode) {
                 characterPart = `(Character: ${targetDescription}), `;
                 if(isBackView) {
                     characterPart = `(rear view structure:1.5), (back of: ${targetDescription}), `;
                 }
             } else {
                 characterPart = `(Character: ${targetDescription}), `;
             }
          }
          if (char.negative_prompt) characterNegative = `, ${char.negative_prompt}`;
          
          if (!activeRefImage && char.avatar_url && !isNonFace && !useInstantID) {
              activeRefImage = char.avatar_url;
          }
      }
    }

    const extraNegative = negativePrompt ? `, ${negativePrompt}` : "";

    if (!ARK_API_KEY) throw new Error("API Key Missing");

    let visionAnalysis: VisionAnalysis | null = null;
    if (activeRefImage) {
        try { visionAnalysis = await analyzeRefImage(activeRefImage); } catch (e) {}
    }
    
    const shotDictionary = isNonFace ? OBJECT_SHOT_PROMPTS : SHOT_PROMPTS;
    const shotWeightPrompt = shotDictionary[shotType.toUpperCase()] || shotDictionary["MID SHOT"];
    const angleWeightPrompt = ANGLE_PROMPTS[cameraAngle.toUpperCase()] || ANGLE_PROMPTS["EYE LEVEL"];
    
    let finalPrompt = "";
    let finalNegative = "";

    if (isDraftMode) {
      finalPrompt = `(${DRAFT_PROMPT_CLASSIC}), (${actionPrompt}:1.6), ${characterPart} (${shotWeightPrompt}), (${angleWeightPrompt}), lineart, (white background:1.2)`;
      
      let dynamicNegative = getStrictNegative(shotType, isNonFace, stylePreset, true);
      // 虽然换了描述，但加上负面词双重保险也没坏处
      if (actionPrompt.includes("back view") || actionPrompt.includes("背影")) {
          dynamicNegative += ", (face:2.0), (looking at camera:2.0), eyes, nose, mouth, (tie:2.0), (logo:2.0)";
      }
      finalNegative = `${dynamicNegative}${extraNegative}`;
    } else {
        finalPrompt = `(${shotWeightPrompt}), (${angleWeightPrompt}), (${actionPrompt}:1.3), ${characterPart} (${STYLE_PRESETS[stylePreset] || STYLE_PRESETS['realistic']}:1.4)`; 
        finalNegative = `${getStrictNegative(shotType, isNonFace, stylePreset, false)}${characterNegative}${extraNegative}`;
    }

    const payload: any = {
      model: isDraftMode ? MODEL_DRAFT : MODEL_PRO, prompt: finalPrompt, negative_prompt: finalNegative, 
      size: RATIO_MAP[aspectRatio] || "2560x1440", n: 1
    };

    if (activeRefImage) { 
        const base64Image = await processImageRef(activeRefImage, visionAnalysis, shotType, isDraftMode);
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