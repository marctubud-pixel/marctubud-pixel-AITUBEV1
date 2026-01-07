'use server'

import { createClient } from '@supabase/supabase-js'
import Replicate from "replicate"; 

// 初始化 Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 初始化 Replicate (用于 High Precision 模式)
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// --- [配置区域] ---

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY; 

// 🟢 [修改 1] 定义模型列表
const MODEL_RENDER = "z-image-turbo"; // 渲染/写实模式专用 (极速)

// 🟢 [修改 3 - 关键] 调整线稿模式优先级
// 将 wanx-v1 至于首位，利用其原生的 <sketch> 参数保证风格最大统一
const DRAFT_MODELS = [
    "wanx-v1",           // 首选：风格最统一
    "wanx2.1-t2i-turbo", // 备选
    "wanx2.1-t2i-plus"   // 兜底
];

// Replicate 模型常量
const MODEL_CN_DEPTH = "diffusers/controlnet-depth-sdxl-1.0:a926d7f027cc7f0c5a2468725832a89047970d4c82b1373510e42f9b87b7677d";
const MODEL_CN_CANNY = "diffusers/controlnet-canny-sdxl-1.0:f0298a83236e3e5c7a23c8a996f0012297127163013d8d7b3a7263c965e8a7d3";
const MODEL_CN_OPENPOSE = "thibaud/controlnet-openpose-sdxl-1.0:6f9039327827e87178873752243003025211933c026d3027b5454647906d2892";

// --- [智能辅助函数] ---

function getSmartStyleSuffix(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    let suffix = ", film grain, analog film texture, Kodak Portra 400 style, photorealistic details, 8k resolution";
    const isDarkShot = lowerPrompt.includes("low key") || lowerPrompt.includes("noir") || lowerPrompt.includes("silhouette") || lowerPrompt.includes("shadow") || lowerPrompt.includes("night");
    if (isDarkShot) {
        suffix += ", high contrast, chiaroscuro, dramatic shadows, hard lighting";
    } else {
        suffix += ", soft film lighting, cinematic grainy texture";
    }
    return suffix;
}

function getStrictNegative(shotType: string, isNonFace: boolean, stylePreset?: string, isDraftMode?: boolean): string {
    let base = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands, missing fingers";
    if (shotType.includes("WIDE") || shotType.includes("LONG")) {
        base += ", extra people, multiple characters, 2 people, crowd, dual composition, ghost";
    }
    if (isDraftMode) {
        base += ", " + DRAFT_NEGATIVE_BASE; 
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

function isNonFaceDetail(prompt: string): boolean {
    const keywords = ['hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand', 'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt', 'pedal', '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿', '积水', '步伐', '脚步', '水花', '踩', '车', '轮', '轮胎', '驾驶', '风景', '场景', '背景', '环境'];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

async function pollDashScopeTask(taskId: string): Promise<string> {
    const maxAttempts = 90; 
    const url = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
    for (let i = 0; i < maxAttempts; i++) {
        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${DASHSCOPE_API_KEY}` }
        });
        const data = await res.json();
        const status = data.output?.task_status;
        if (status === 'SUCCEEDED') {
            return data.output.results[0].url;
        } else if (status === 'FAILED' || status === 'CANCELED') {
            throw new Error(`Task Failed: ${data.output?.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Generation Task Timed Out");
}

// --- [Prompt 字典] ---

const ANGLE_PROMPTS: Record<string, string> = {
    "EYE LEVEL": "(eye level shot:1.5), neutral angle, straight on",
    "LOW ANGLE": "(low angle shot:1.6), (worm's eye view:1.5), (looking up at subject:1.6), imposing, dramatic perspective, floor level camera",
    "HIGH ANGLE": "(high angle shot:1.6), (bird's eye view:1.5), (looking down at subject:1.6), vulnerable, camera above head",
    "OVERHEAD SHOT": "(directly overhead:1.7), (top down view:1.7), (god's eye view:1.5), 90 degree angle down, map view",
    "DUTCH ANGLE": "(dutch angle:1.6), (tilted camera:1.6), (slanted horizon:1.5), dynamic composition, unease, unstable",
    "OVER-THE-SHOULDER": "(over the shoulder shot:1.6), focus on subject, blurred foreground shoulder, depth of field"
};

const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME WIDE SHOT": "(tiny figure:1.5), (massive environment:2.0), wide angle lens, aerial view, <subject> only occupies 5% of frame, (no close up:2.0), (no portrait:2.0)",
    "WIDE SHOT": "(full body visible:1.6), (feet visible:1.6), (head to toe:1.5), distance shot, wide angle, environment focus, (no crop:1.5)",
    "FULL SHOT": "(full body from head to toe:1.8), (feet visible:1.6), standing pose, environment visible, (no close up:1.5)",
    "MID SHOT": "(waist up:1.5), (head and torso focus:1.5), portrait composition, standard cinematic shot",
    "CLOSE-UP": "(both eyes visible:1.8), (face focus:1.8), (head and shoulders:1.5), depth of field, emotion focus",
    "EXTREME CLOSE-UP": "(both eyes visible:2.0), (upper face focus:1.8), (macro photography:1.2), (extreme facial detail:1.5), (no single eye:2.0)"
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
  "16:9": "1280*720", "9:16": "720*1280", "1:1": "1024*1024", "4:3": "1280*960", "3:4": "960*1280", "2.39:1": "1280*720"
};

// 🟢 [修改 1 - 关键] 新版线稿 Prompt：强调手绘、墨水笔触、排线纹理
const DRAFT_PROMPT_CLASSIC = "(hand-drawn manga storyboard sketch:1.7), (rough ink brush strokes:1.5), visible pencil lines, cross-hatching texture for shading, black and white on textured paper, loose composition, varied line weight, unfinished feel, comic panel style";

// 🟢 [修改 2 - 关键] 新版负向词：禁止平滑数字感和灰色填充
const DRAFT_NEGATIVE_BASE = "color, 3d render, photorealistic, (smooth digital art:1.5), (clean vector lines:1.5), gray fill, gradient shading, shiny, photograph, complex details";

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
  controlStrength: number = 0.75,
  useMock: boolean = false,
  cameraAngle: string = 'EYE LEVEL',
  useInstantID: boolean = false,
  negativePrompt?: string,
  useHighPrecision: boolean = false 
) {
  try {
    console.log(`\n========== [DEBUG: Shot ${shotId}] ==========`);
    const isNonFace = isNonFaceDetail(actionPrompt); 

    if (useMock) { return { success: true, url: "https://picsum.photos/1280/720" }; }

    const isCompositionMode = !!referenceImageUrl;
    let characterPart = "";
    let characterNegative = ""; 

    if (characterId) {
      const { data: char } = await supabaseAdmin.from('characters')
        .select('name, description, negative_prompt')
        .eq('id', characterId).maybeSingle(); 
      
      if (char) {
          const p = actionPrompt.toLowerCase();
          const targetDescription = char.description || "";
          if (!isNonFace) {
             characterPart = `(Character: ${targetDescription}), `;
          }
          if (char.negative_prompt) characterNegative = `, ${char.negative_prompt}`;
      }
    }

    const extraNegative = negativePrompt ? `, ${negativePrompt}` : "";
    const shotDictionary = isNonFace ? OBJECT_SHOT_PROMPTS : SHOT_PROMPTS;
    const shotWeightPrompt = shotDictionary[shotType.toUpperCase()] || shotDictionary["MID SHOT"];
    const angleWeightPrompt = ANGLE_PROMPTS[cameraAngle.toUpperCase()] || ANGLE_PROMPTS["EYE LEVEL"];
    
    let finalPrompt = "";
    let finalNegative = "";

    // 构建基础 Prompt
    if (isDraftMode) {
      // 线稿模式提示词 (已更新为粗糙/漫画风)
      finalPrompt = `(${DRAFT_PROMPT_CLASSIC}), (${actionPrompt}:1.6), ${characterPart} (${shotWeightPrompt}), (${angleWeightPrompt}), lineart`;
      finalNegative = `${getStrictNegative(shotType, isNonFace, stylePreset, true)}${extraNegative}`;
    } else {
        // 渲染模式提示词
        finalPrompt = `(${shotWeightPrompt}), (${angleWeightPrompt}), (${actionPrompt}:1.3), ${characterPart}`;
        finalNegative = `${getStrictNegative(shotType, isNonFace, stylePreset, false)}${characterNegative}${extraNegative}`;
    }

    // 🟢 [分支 A] Replicate (精准构图 + 垫图模式)
    if (useHighPrecision && isCompositionMode && referenceImageUrl) {
        console.log("🚀 [Generate] 激活 Replicate (精准构图模式), URL:", referenceImageUrl);
        
        let controlModel = MODEL_CN_DEPTH; 
        if (referenceImageUrl.includes("canny")) controlModel = MODEL_CN_CANNY;
        if (referenceImageUrl.includes("openpose")) controlModel = MODEL_CN_OPENPOSE;

        const w = aspectRatio.startsWith("16") ? 1024 : 576;
        const h = aspectRatio.startsWith("16") ? 576 : 1024;

        const output = await replicate.run(
            controlModel as any,
            {
              input: {
                prompt: finalPrompt + ", " + (STYLE_PRESETS[stylePreset] || ""),
                negative_prompt: finalNegative,
                image: referenceImageUrl,
                controlnet_conditioning_scale: controlStrength,
                num_inference_steps: 30,
                width: w,
                height: h,
              }
            }
        );

        const imageUrl = Array.isArray(output) ? output[0] : output;
        return processResponse({ url: imageUrl }, shotId, projectId);
    }

    // 🟢 [分支 B] 阿里云 DashScope (Z-Image Turbo / Wanx 轮换)
    if (!DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY Missing");

    const zSize = RATIO_MAP[aspectRatio] || "1280*720";
    let imageUrl = "";

    // 🟢 [逻辑 1] 渲染/写实模式 (Z-Image Turbo)
    if (!isDraftMode) {
        console.log("🚀 [Generate] 模式: 渲染 (Z-Image Turbo)");
        finalPrompt += getSmartStyleSuffix(actionPrompt);
        
        const payload = {
            model: MODEL_RENDER,
            input: { messages: [{ role: "user", content: [{ text: finalPrompt }] }] },
            parameters: { prompt_extend: false, size: zSize, n: 1 }
        };
        const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DASHSCOPE_API_KEY}` },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Z-Image Turbo Error");
        
        if (data.output?.choices?.[0]?.message?.content) {
            const img = data.output.choices[0].message.content.find((i:any)=>i.image);
            if(img) imageUrl = img.image;
        } else if (data.output?.task_id) {
            imageUrl = await pollDashScopeTask(data.output.task_id);
        } else {
            throw new Error("Unknown Format");
        }
    } 
    
    // 🟢 [逻辑 2] 线稿/Draft 模式 (Wanx 系列轮换)
    else {
        console.log("🚀 [Generate] 模式: 线稿 (Wanx 系列轮询)");
        let lastError = null;

        for (const modelName of DRAFT_MODELS) {
            try {
                console.log(`   🔄 尝试模型: ${modelName}...`);
                
                let endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
                let payload: any = {
                    model: modelName,
                    input: { prompt: finalPrompt },
                    parameters: { size: zSize, n: 1 }
                };

                // ⚠️ 关键点：如果是 wanx-v1，强制加上 sketch 风格参数，保证统一性
                if (modelName === "wanx-v1") {
                    payload.parameters.style = "<sketch>";
                    console.log("   👉 已启用 wanx-v1 原生 sketch 风格参数");
                }

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
                        "X-DashScope-Async": "enable"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || data.code || "API Error");

                if (data.output?.task_id) {
                    console.log(`   ⏳ Task ID: ${data.output.task_id} - 等待结果...`);
                    imageUrl = await pollDashScopeTask(data.output.task_id);
                    console.log(`   ✅ 模型 ${modelName} 生成成功!`);
                    break; 
                } else {
                    throw new Error("No Task ID returned");
                }
            } catch (e: any) {
                console.warn(`   ❌ 模型 ${modelName} 失败: ${e.message}`);
                lastError = e;
            }
        }
        if (!imageUrl) throw new Error(`All Draft models failed. Last error: ${lastError?.message}`);
    }

    return processResponse({ url: imageUrl }, shotId, projectId);

  } catch (error: any) {
    console.error("❌ Generation Error:", error);
    return { success: false, message: error.message };
  }
}

// 辅助函数
async function processResponse(data: { url: string }, shotId: string | number, projectId: string) {
    const imageUrl = data.url;
    if (!imageUrl) throw new Error("No image url returned");
    const imageRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const fileName = `cineflow/${projectId}/${Date.now()}_${shotId}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
        .from('images')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
    if (uploadError) throw new Error("Upload failed: " + uploadError.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
    return { success: true, url: publicUrl };
}