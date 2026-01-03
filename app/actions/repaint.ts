'use server'

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'; 
import Replicate from "replicate"; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ✅ [V6.0] 使用 zsxkib 的稳定版
const INSTANT_ID_MODEL = "zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789";

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

// 🟢 辅助函数
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

// 🟢 图片处理函数 [核心升级: 物理去色锁 - 修复版]
async function fetchImageAsBase64(url: string, makeGrayscale: boolean = false): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${url}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        
        let processor = sharp(buffer);
        
        if (makeGrayscale) {
            // 🔒 [The Grayscale Lock] 
            processor = processor
                .grayscale() // 1. 物理去色
                // 2. 使用 linear 替代 modulate 来实现高对比度
                // multiplier(1.5) > 1 增加对比度
                // offset(-40) 拉低整体亮度，使线条更黑更实
                .linear(1.5, -40) 
                .sharpen({ // 3. 锐化边缘
                    sigma: 1.5, 
                    m1: 1.0, 
                    m2: 1.0 
                }); 
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
    useInstantID: boolean = false
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
        // 🟢 V6.0 分支: InstantID (zsxkib 版本) - 逻辑守恒
        // =================================================================
        if (useInstantID && !isDraftMode && char.avatar_url) {
            console.log("🚀 [V6.0 Repaint] 触发 InstantID (zsxkib) 重绘...");
            
            const instantPrompt = `(Character: ${char.description}), ${prompt}, masterpiece, best quality, 8k, cinematic lighting`;
            const instantNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, anime, cartoon, sketch";

            const output = await replicate.run(
                INSTANT_ID_MODEL as any,
                {
                    input: {
                        prompt: instantPrompt,
                        negative_prompt: instantNegative,
                        image: char.avatar_url, 
                        pose_image: originImageUrl, 
                        sdxl_weights: "protovision-xl-high-fidel",
                        scheduler: "K_EULER_ANCESTRAL",
                        num_inference_steps: 30,
                        guidance_scale: 5,
                        control_strength: 0.6,
                        ip_adapter_scale: 0.8,
                        width: Number(RATIO_MAP[aspectRatio]?.split('x')[0] || 1280),
                        height: Number(RATIO_MAP[aspectRatio]?.split('x')[1] || 720),
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
        // 🟠 原有流程: Doubao / Volcengine
        // =================================================================

        // 核心修改：isDraftMode 传给 fetchImageAsBase64，触发物理去色锁
        const originBase64 = await fetchImageAsBase64(originImageUrl, isDraftMode);
        if (!originBase64) throw new Error("Failed to process original image");

        let finalPrompt = "";
        let finalNegative = "";

        if (isDraftMode) {
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