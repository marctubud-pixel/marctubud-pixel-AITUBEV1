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
const VOLC_API_KEY = process.env.VOLC_API_KEY;
const VOLC_ENDPOINT_ID = process.env.VOLC_ENDPOINT_ID;
const VOLC_IMAGE_ENDPOINT_ID = process.env.VOLC_IMAGE_ENDPOINT_ID; // 🟢 优先使用专用图像端点
const STORAGE_BUCKET = "cineflow-public";

// 🟢 [模型定义] 
const MODEL_DRAFT = "doubao-seedream-4.0"; // 线稿模式
const MODEL_SCENE_GEN = "qwen-image-plus"; // 渲染模式 (纯文生图)
// 注意：MODEL_SCENE_ANCHOR (Edit) 已被移除，后续将迁移至独立文件

// Replicate 模型常量 (ControlNet)
const MODEL_CN_DEPTH = "diffusers/controlnet-depth-sdxl-1.0:a926d7f027cc7f0c5a2468725832a89047970d4c82b1373510e42f9b87b7677d";
const MODEL_CN_CANNY = "diffusers/controlnet-canny-sdxl-1.0:f0298a83236e3e5c7a23c8a996f0012297127163013d8d7b3a7263c965e8a7d3";
const MODEL_CN_OPENPOSE = "thibaud/controlnet-openpose-sdxl-1.0:6f9039327827e87178873752243003025211933c026d3027b5454647906d2892";

// --- [辅助函数] ---

function getSmartCharacterPrompt(charName: string, charDesc: string, shotType: string): string {
    const shot = shotType.toUpperCase();
    const cleanDesc = charDesc.replace(/\.$/, "");
    if (shot.includes("WIDE") || shot.includes("LONG") || shot.includes("FULL")) {
        return `(Character: ${charName}, full body shot of ${cleanDesc}, walking or standing, detailed clothing, shoes visible, no close-up on face)`;
    } else if (shot.includes("CLOSE")) {
        return `(Character: ${charName}, face focus close-up of ${cleanDesc}, detailed eyes, detailed skin texture, emotion focus)`;
    } else {
        return `(Character: ${charName}, ${cleanDesc})`;
    }
}

function getSmartStyleSuffix(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    let suffix = ", cinematic lighting, analog film texture, Kodak Portra 400 style, photorealistic details, 8k resolution";
    const isDarkShot = lowerPrompt.includes("low key") || lowerPrompt.includes("noir") || lowerPrompt.includes("silhouette") || lowerPrompt.includes("shadow") || lowerPrompt.includes("night");
    if (isDarkShot) suffix += ", high contrast, chiaroscuro, dramatic shadows, hard lighting";
    else suffix += ", soft film lighting, cinematic grainy texture";
    return suffix;
}

function getStrictNegative(shotType: string, isNonFace: boolean, stylePreset?: string, isDraftMode?: boolean): string {
    let base = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, extra digits, bad hands, missing fingers";
    if (shotType.includes("WIDE") || shotType.includes("LONG")) {
        base += ", close up, portrait, face focus, headshot, macro, crop, zoomed in";
    }
    if (isDraftMode) {
        base += ", color, realistic, photorealistic, 3d render, painting, anime, complex details, shading, gradient, smooth digital art, clean vector lines, gray fill";
    } else if (stylePreset === 'realistic') {
        base += ", anime, cartoon, illustration, drawing, 2d, 3d render, sketch, painting";
    }
    if (shotType.includes("WIDE") || shotType.includes("LONG") || shotType.includes("FULL")) {
        base += ", close up, portrait, face focus, headshot, macro";
    }
    if (isNonFace) {
        return `${base}, (face:2.0), (head:2.0), (eyes:2.0), portrait, (person:5.0), woman, girl, man, boy, (humanoid silhouette:1.5), look at camera, upper body, torso, selfie, hair`;
    }
    return base;
}

function isNonFaceDetail(prompt: string): boolean {
    const keywords = ['hand', 'finger', 'keyboard', 'feet', 'shoe', 'typing', 'holding', 'tool', 'object', 'ground', 'sand', 'car', 'wheel', 'tire', 'vehicle', 'driving', 'brake', 'asphalt', 'pedal', '手', '指', '键盘', '脚', '足', '鞋', '沙滩', '物体', '腰', '腿', '积水', '步伐', '脚步', '水花', '踩', '车', '轮', '轮胎', '驾驶', '风景', '场景', '背景', '环境'];
    return keywords.some(k => prompt.toLowerCase().includes(k));
}

// 轮询任务状态 (DashScope)
async function pollDashScopeTask(taskId: string): Promise<string> {
    const maxAttempts = 60;
    const url = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
    for (let i = 0; i < maxAttempts; i++) {
        const res = await fetch(url, { headers: { "Authorization": `Bearer ${DASHSCOPE_API_KEY}` } });
        const data = await res.json();
        if (data.output?.task_status === 'SUCCEEDED') return data.output.results?.[0]?.url || data.output.image_url || "";
        if (data.output?.task_status === 'FAILED') throw new Error(`Task Failed: ${data.output?.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("Timeout");
}

// 🟢 [辅助] 锚点图转公有链接
// 仅保留用于 Replicate 模式，Qwen 模式不再调用
async function ensurePublicAnchor(inputUrl: string, projectId: string): Promise<string> {
    if (inputUrl.includes(`/${STORAGE_BUCKET}/`)) return inputUrl;

    try {
        console.log("🌉 [Bridge] Converting private anchor to public...");
        const res = await fetch(inputUrl);
        if (!res.ok) throw new Error(`Failed to fetch source image`);

        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || 'image/png';

        let extension = 'png';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
        else if (contentType.includes('webp')) extension = 'webp';

        const fileName = `temp_anchors/${projectId}/${Date.now()}_anchor.${extension}`;
        const { error } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, buffer, { contentType: contentType, upsert: true });

        if (error) throw error;
        const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
        return data.publicUrl;
    } catch (err: any) {
        console.error("❌ [Bridge] Failed:", err);
        return inputUrl;
    }
}

const SHOT_PROMPTS: Record<string, string> = {
    "EXTREME WIDE SHOT": "(tiny figure:1.8), (massive environment:2.0), wide angle lens 14mm, aerial view, subject is small in frame",
    "WIDE SHOT": "(full body visible from head to toe:2.0), (shoes visible:1.8), (environment focus:1.5), distance shot, wide angle lens 24mm",
    "FULL SHOT": "(full body visible:2.0), (head to toe:1.8), standing pose, environment context",
    "MID SHOT": "(waist up:1.5), (head and torso:1.5), portrait composition, standard cinematic shot 50mm",
    "CLOSE-UP": "(face focus:1.8), (head and shoulders:1.5), depth of field, blurred background, emotion focus 85mm",
    "EXTREME CLOSE-UP": "(macro photography:1.5), (eyes focus:2.0), (skin texture:1.5), (part of face:1.5)"
};
const ANGLE_PROMPTS: Record<string, string> = {
    "EYE LEVEL": "eye level shot, neutral angle",
    "LOW ANGLE": "low angle shot, looking up from ground, imposing",
    "HIGH ANGLE": "high angle shot, looking down from above, vulnerable",
    "OVERHEAD SHOT": "directly overhead, top down view, 90 degree angle",
    "DUTCH ANGLE": "dutch angle, tilted camera, dynamic composition",
    "OVER-THE-SHOULDER": "over the shoulder shot, blurred foreground shoulder"
};
const RATIO_MAP: Record<string, string> = {
    "16:9": "1280*720", "9:16": "720*1280", "1:1": "1024*1024", "4:3": "1280*960", "3:4": "960*1280", "2.39:1": "1280*720"
};
const DRAFT_PROMPT_CLASSIC = "(hand-drawn manga storyboard sketch:1.7), rough ink brush strokes, cross-hatching, black and white, minimal lines, high contrast, loose strokes, (no color:2.0), professional storyboard, greyscale, lineart";

// --- [主生成函数：纯净版] ---
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
        console.log(`\n========== [GENERATE: Shot ${shotId}] ==========`);

        // Mock Mode
        if (useMock) return { success: true, url: "https://picsum.photos/1280/720" };

        const isNonFace = isNonFaceDetail(actionPrompt);
        const isCompositionMode = !!referenceImageUrl;

        // 🟢 智能锚点桥接 (仅 High Precision 使用)
        // 渲染模式 (Qwen) 忽略此步骤
        let publicAnchorUrl = referenceImageUrl;
        if (useHighPrecision && referenceImageUrl) {
            publicAnchorUrl = await ensurePublicAnchor(referenceImageUrl, projectId);
        }

        // Prompt 组装
        let characterPart = "";
        if (characterId) {
            const { data: char } = await supabaseAdmin.from('characters').select('name, description').eq('id', characterId).maybeSingle();
            if (char) characterPart = isNonFace ? "" : getSmartCharacterPrompt(char.name, char.description || "", shotType);
        }

        const shotWeightPrompt = SHOT_PROMPTS[shotType.toUpperCase()] || SHOT_PROMPTS["MID SHOT"];
        const angleWeightPrompt = ANGLE_PROMPTS[cameraAngle.toUpperCase()] || ANGLE_PROMPTS["EYE LEVEL"];

        let finalPrompt = "";
        let finalNegative = "";

        // 🟢 [分支 A] Replicate (High Precision / ControlNet)
        // 唯一支持垫图的分支
        if (useHighPrecision && isCompositionMode && publicAnchorUrl) {
            console.log("🚀 Mode: Replicate (High Precision + Anchor)");
            let controlModel = MODEL_CN_DEPTH;
            if (publicAnchorUrl.includes("canny")) controlModel = MODEL_CN_CANNY;
            if (publicAnchorUrl.includes("openpose")) controlModel = MODEL_CN_OPENPOSE;

            finalPrompt = `(${shotWeightPrompt}), (${angleWeightPrompt}), (${actionPrompt}:1.3), ${characterPart}`;
            finalNegative = getStrictNegative(shotType, isNonFace, stylePreset, false);

            const w = aspectRatio.startsWith("16") ? 1024 : 576;
            const h = aspectRatio.startsWith("16") ? 576 : 1024;

            const output = await replicate.run(controlModel as any, {
                input: {
                    prompt: finalPrompt,
                    negative_prompt: finalNegative,
                    image: publicAnchorUrl,
                    controlnet_conditioning_scale: controlStrength,
                    num_inference_steps: 30,
                    width: w, height: h,
                }
            });
            const imageUrl = Array.isArray(output) ? output[0] : output;
            return processResponse({ url: imageUrl }, shotId, projectId);
        }

        // 🟢 [分支 B] 线稿模式 (Doubao)
        if (isDraftMode) {
            if (!VOLC_API_KEY) throw new Error("Missing VOLC_API_KEY");
            console.log("🚀 Mode: Draft (Doubao)");

            finalPrompt = `(${DRAFT_PROMPT_CLASSIC}), (${actionPrompt}:1.6), ${characterPart} (${shotWeightPrompt}), (${angleWeightPrompt}), lineart`;
            finalNegative = getStrictNegative(shotType, isNonFace, stylePreset, true);

            const rawSize = RATIO_MAP[aspectRatio] || "1280*720";
            const doubaoSize = rawSize.replace('*', 'x');

            const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${VOLC_API_KEY}` },
                body: JSON.stringify({
                    model: VOLC_IMAGE_ENDPOINT_ID || VOLC_ENDPOINT_ID, // 优先使用图像专用端点
                    prompt: finalPrompt,
                    size: doubaoSize,
                    n: 1
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Doubao Failed");
            return processResponse({ url: data.data?.[0]?.url }, shotId, projectId);
        }

        // 🟢 [分支 C] 渲染模式 (Qwen-Plus) - 纯文生图
        // 即使有 referenceImageUrl 也强制忽略，只用 Prompt 生成
        else {
            if (!DASHSCOPE_API_KEY) throw new Error("Missing DASHSCOPE_API_KEY");
            console.log("🚀 Mode: Render (Qwen-Plus) - Text to Image Only");

            finalPrompt = `(${shotWeightPrompt}), (${angleWeightPrompt}), (${actionPrompt}:1.3), ${characterPart}`;
            finalPrompt += getSmartStyleSuffix(actionPrompt); // false = 无 anchor 逻辑
            finalNegative = `${getStrictNegative(shotType, isNonFace, stylePreset, false)}${negativePrompt ? `, ${negativePrompt}` : ""}`;

            const zSize = RATIO_MAP[aspectRatio] || "1280*720";

            const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
                    "X-DashScope-Async": "enable"
                },
                body: JSON.stringify({
                    model: MODEL_SCENE_GEN, // ✅ Qwen-Plus
                    input: { prompt: finalPrompt },
                    parameters: { size: zSize, n: 1 }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "DashScope Failed");

            const imageUrl = data.output?.task_id ? await pollDashScopeTask(data.output.task_id) : data.output.results[0].url;
            return processResponse({ url: imageUrl }, shotId, projectId);
        }

    } catch (error: any) {
        console.error("❌ Generation Error:", error);
        return { success: false, message: error.message };
    }
}

// 结果处理：下载图片 -> 上传 Public Bucket
async function processResponse(data: { url: string }, shotId: string | number, projectId: string) {
    const imageUrl = data.url;
    if (!imageUrl) throw new Error("No URL returned");

    const imageRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const fileName = `workspace/${projectId}/${Date.now()}_${shotId}.png`;

    const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true, duplex: 'half' });

    if (error) throw new Error(`Upload Failed: ${error.message}`);
    const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return { success: true, url: publicUrl };
}