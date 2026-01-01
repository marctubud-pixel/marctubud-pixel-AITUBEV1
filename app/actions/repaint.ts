'use server'

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'; 
import Replicate from "replicate"; // 🟢 [V6.0] 新增依赖

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🟢 [V6.0] Replicate 配置 (InstantID)
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 使用 Lightning 版本以获得更快的速度
// 确认代码里是这行：
const INSTANT_ID_MODEL = "wangfuyun/instantid:c6411132e18585481d68324869c3a50993096d27457d19c1186e8a09289255a6";

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 

const RATIO_MAP: Record<string, string> = {
  "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048", 
  "4:3": "2304x1728", "3:4": "1728x2304", "2.39:1": "3072x1280" 
};

// 🟢 经典线稿风格 (强制黑白)
const DRAFT_PROMPT_CLASSIC = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0), professional storyboard, greyscale, lineart";

// 🟢 强力负面
const DRAFT_NEGATIVE_BASE = "(color:2.0), (rgb:2.0), (colorful:2.0), painting, realistic, photorealistic, 3d render, complex details, shading, gradient, text, watermark, (cyberpunk:2.0), (sci-fi:2.0), (city:2.0), (modern buildings:2.0), pink, blue, red, green, yellow, purple, cyan, teal, orange, magenta, brown, golden, silver, blonde";

// 🟢 辅助函数：清洗角色描述中的环境词和颜色词
function cleanCharacterDescription(desc: string): string {
    const banList = [
        'cyberpunk', 'city', 'neon', 'future', 'sci-fi', 'urban', 'street', 'night', 'lights', 'building', 'skyscraper', 'modern',
        'blue', 'pink', 'red', 'green', 'yellow', 'purple', 'orange', 'colorful', 'cyan', 'teal', 'magenta', 'brown', 'gold', 'silver', 'blonde', 'dark', 'light'
    ];
    let cleaned = desc.toLowerCase();
    banList.forEach(word => {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    return cleaned.replace(/\s+/g, ' ').trim();
}

// 🟢 图片处理函数升级：强制转黑白，物理去除色度信息
async function fetchImageAsBase64(url: string, makeGrayscale: boolean = false): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${url}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        
        let processor = sharp(buffer);
        
        if (makeGrayscale) {
            processor = processor.grayscale(); 
        }

        const resizedBuffer = await processor
            .resize({ width: 1536, height: 1536, fit: 'inside' }) 
            .toBuffer();
            
        return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
    } catch (e) {
        console.error("[Repaint] Image fetch failed:", e);
        return null;
    }
}

export async function repaintShotWithCharacter(
    shotId: string,
    originImageUrl: string,
    characterId: string,
    prompt: string,
    projectId: string,
    aspectRatio: string = "16:9",
    isDraftMode: boolean = false,
    useInstantID: boolean = false // 🟢 [V6.0] 新增参数
) {
    try {
        console.log(`\n========== [REPAINT: Shot ${shotId}] ==========`);
        console.log(`1. Mode: ${isDraftMode ? 'DRAFT' : 'RENDER'} | InstantID: ${useInstantID}`);

        if (!ARK_API_KEY) throw new Error("API Key Missing");

        const { data: char, error } = await supabaseAdmin
            .from('characters')
            .select('name, description, avatar_url')
            .eq('id', characterId)
            .single();

        if (error || !char) throw new Error("Character not found");

        // =================================================================
        // 🟢 V6.0 分支: InstantID (专用于 Render 模式下的完美换人)
        // =================================================================
        if (useInstantID && !isDraftMode && char.avatar_url) {
            console.log("🚀 [V6.0 Repaint] 触发 InstantID 换人重绘...");
            
            // InstantID 逻辑：
            // Face Image = 角色头像 (ID源)
            // Pose Image = 原始分镜图 (构图源)
            // Prompt = 角色描述 + 动作描述
            
            const instantPrompt = `(Character: ${char.description}), ${prompt}, masterpiece, best quality, 8k, cinematic lighting`;
            const instantNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, anime, cartoon, sketch";

            const output = await replicate.run(
                INSTANT_ID_MODEL as any,
                {
                    input: {
                        prompt: instantPrompt,
                        negative_prompt: instantNegative,
                        face_image: char.avatar_url, // 核心：ID 来源
                        pose_image: originImageUrl,  // 核心：构图/Pose 来源 (传入 URL 即可)
                        control_strength: 0.65,      // 稍微降低控制力度，允许角色特征适配
                        identity_strength: 0.85,     // 提高 ID 权重，确保像本人
                        num_inference_steps: 4,      // Lightning 极速版
                        guidance_scale: 1.5,
                        width: Number(RATIO_MAP[aspectRatio]?.split('x')[0] || 1280),
                        height: Number(RATIO_MAP[aspectRatio]?.split('x')[1] || 720),
                        scheduler: "K_EULER",
                    }
                }
            );

            if (Array.isArray(output) && output.length > 0) {
                const rawUrl = output[0];
                const res = await fetch(rawUrl);
                const buffer = Buffer.from(await res.arrayBuffer());
                const fileName = `cineflow/${projectId}/iid_repaint_${Date.now()}_${shotId}.png`;
                
                await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
                const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
                return { success: true, url: publicUrl };
            } else {
                throw new Error("InstantID returned no images");
            }
        }

        // =================================================================
        // 🟠 原有流程: Doubao / Volcengine (Draft Mode 或 Fallback)
        // =================================================================

        // 🟢 1. 准备底图 (Draft 模式强制黑白)
        const originBase64 = await fetchImageAsBase64(originImageUrl, isDraftMode);
        if (!originBase64) throw new Error("Failed to process original image");

        let finalPrompt = "";
        let finalNegative = "";

        if (isDraftMode) {
            // 清洗 Prompt
            const cleanDesc = cleanCharacterDescription(char.description);
            finalPrompt = `
                (${DRAFT_PROMPT_CLASSIC}), 
                (Character visual features: ${cleanDesc} in sketch style), 
                ${prompt}, 
                (keep original background:2.0), (ignore character environment), 
                lineart, rough sketch, (white background:1.2)
            `.trim();
            finalNegative = DRAFT_NEGATIVE_BASE; 
        } else {
            // Render 模式 (非 InstantID)
            finalPrompt = `(Character: ${char.description}), ${prompt}, (same composition:1.5), (maintain pose:1.4), high quality`;
            finalNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo";
        }

        const payload: any = {
            model: MODEL_PRO,
            prompt: finalPrompt,
            negative_prompt: finalNegative,
            size: RATIO_MAP[aspectRatio] || "2560x1440", 
            image_url: originBase64,
            strength: 0.75, 
            ref_strength: 0.8
        };

        const response = await fetch(ARK_API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${ARK_API_KEY}` 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Repaint Failed");

        const newImageUrl = data.data?.[0]?.url;
        if (!newImageUrl) throw new Error("No image returned");

        const imageRes = await fetch(newImageUrl);
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        const fileName = `cineflow/${projectId}/${Date.now()}_repaint_${shotId}.png`;
        
        await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);

        return { success: true, url: publicUrl };

    } catch (error: any) {
        console.error(error);
        return { success: false, message: error.message };
    }
}