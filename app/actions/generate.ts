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

// ✅ [V6.0] 使用 zsxkib 的稳定版 (参数标准: image = ID, pose_image = 参考图)
const INSTANT_ID_MODEL = "zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789";

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 
const MODEL_DRAFT = process.env.VOLC_IMAGE_DRAFT_ENDPOINT_ID || process.env.VOLC_IMAGE_ENDPOINT_ID; 

// --- [常量配置保持不变] ---

const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME WIDE SHOT": "(tiny figure:1.5), (massive environment:2.0), wide angle lens, aerial view, <subject> only occupies 5% of frame, (no close up:2.0), (no portrait:2.0)",
    "WIDE SHOT": "(full body visible:1.6), (feet visible:1.6), (head to toe:1.5), distance shot, wide angle, environment focus, (no crop:1.5)",
    "FULL SHOT": "(full body from head to toe:1.8), (feet visible:1.6), standing pose, environment visible, (no close up:1.5)",
    "MID SHOT": "(waist up:1.5), (head and torso focus:1.5), portrait composition, standard cinematic shot",
    "CLOSE-UP": "(face focus:1.8), (head and shoulders:1.5), (background blurred:1.2), depth of field, emotion focus",
    "EXTREME CLOSE-UP": "(macro photography:2.0), (extreme detail:1.5), (focus on single part:2.0), crop to detail, (no full body:2.0)"
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

// --- [辅助函数] ---

function isNonFaceDetail(prompt: string): boolean {
    const keywords = ['hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand', 'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt', 'pedal', '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿', '积水', '步伐', '脚步', '水花', '踩', '车', '轮', '轮胎', '驾驶'];
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
  useInstantID: boolean = false
) {
  try {
    console.log(`\n========== [DEBUG: Shot ${shotId}] ==========`);
    console.log(`1. Mode: ${isDraftMode ? 'DRAFT' : 'RENDER'} | UseMock: ${useMock} | InstantID: ${useInstantID}`);

    if (useMock) { return { success: true, url: "https://picsum.photos/1280/720" }; }

    const isNonFace = isNonFaceDetail(actionPrompt); 
    let activeRefImage = referenceImageUrl;
    let characterPart = "";
    let characterNegative = ""; 
    let characterAvatarUrl = ""; 

    // --- 角色信息获取 ---
    if (characterId) {
      const { data: char } = await supabaseAdmin
        .from('characters')
        .select('name, description, negative_prompt, avatar_url')
        .eq('id', characterId)
        .maybeSingle(); 
        
      if (char) {
          if (!isNonFace) characterPart = `(Character: ${char.description}), `;
          if (char.negative_prompt) characterNegative = `, ${char.negative_prompt}`;
          characterAvatarUrl = char.avatar_url; 
          
          if (!activeRefImage && char.avatar_url && !isNonFace && !useInstantID) {
              activeRefImage = char.avatar_url;
          }
      }
    }

    // =================================================================
    // 🟢 V6.0 分支: InstantID (zsxkib 版本)
    // =================================================================
    if (useInstantID && characterId && !isDraftMode && !isNonFace && characterAvatarUrl) {
        console.log("🚀 [V6.0] 触发 InstantID 生成流程 (zsxkib)...");

        // 1. 准备姿态/构图图 (Pose/ControlNet)
        let poseImageBase64 = null;
        if (activeRefImage) {
             poseImageBase64 = await processImageRef(activeRefImage, null, shotType);
        }

        // 2. 准备 Prompt
        const shotWeightPrompt = SHOT_PROMPTS[shotType.toUpperCase()] || SHOT_PROMPTS["MID SHOT"];
        const angleWeightPrompt = ANGLE_PROMPTS[cameraAngle.toUpperCase()] || ANGLE_PROMPTS["EYE LEVEL"];
        const instantIdPrompt = `${shotWeightPrompt}, ${angleWeightPrompt}, ${actionPrompt}, ${STYLE_PRESETS[stylePreset]}, masterpiece, best quality, 8k`;
        const instantIdNegative = `${getStrictNegative(shotType, isNonFace, stylePreset, false)}${characterNegative}`;

        // 3. 调用 Replicate (修正参数名: face_image -> image)
        const output = await replicate.run(
            INSTANT_ID_MODEL as any,
            {
                input: {
                    prompt: instantIdPrompt,
                    negative_prompt: instantIdNegative,
                    
                    // ✅ 修正：使用 'image' 参数传递角色头像
                    image: characterAvatarUrl,      
                    
                    // ✅ 构图参考
                    pose_image: poseImageBase64,    
                    
                    // ✅ 画质增强参数
                    sdxl_weights: "protovision-xl-high-fidel",
                    scheduler: "K_EULER_ANCESTRAL",
                    num_inference_steps: 30, // 提升步数以保证画质
                    guidance_scale: 5,
                    
                    control_strength: 0.7,
                    ip_adapter_scale: 0.8,
                    width: Number(RATIO_MAP[aspectRatio]?.split('x')[0] || 1280),
                    height: Number(RATIO_MAP[aspectRatio]?.split('x')[1] || 720),
                }
            }
        );

        // 4. 处理结果
        if (Array.isArray(output) && output.length > 0) {
            const rawUrl = output[0];
            const res = await fetch(rawUrl);
            const buffer = Buffer.from(await res.arrayBuffer());
            const fileName = `cineflow/${projectId}/iid_${Date.now()}_${shotId}.png`;
            
            await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
            const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
            return { success: true, url: publicUrl };
        } else {
            throw new Error("InstantID returned no images");
        }
    }

    // =================================================================
    // 🟠 原有流程: Doubao / Volcengine
    // =================================================================

    if (!ARK_API_KEY) throw new Error("API Key Missing");

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