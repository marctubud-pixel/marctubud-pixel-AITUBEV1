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

const INSTANT_ID_MODEL = "zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789";

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 
const MODEL_DRAFT = process.env.VOLC_IMAGE_DRAFT_ENDPOINT_ID || process.env.VOLC_IMAGE_ENDPOINT_ID; 

const RATIO_MAP: Record<string, string> = {
  "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048", 
  "4:3": "2304x1728", "3:4": "1728x2304", "2.39:1": "3072x1280" 
};

const DRAFT_PROMPT_CLASSIC = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0), professional storyboard, greyscale, lineart";
const DRAFT_NEGATIVE_BASE = "(color:2.0), (rgb:2.0), (colorful:2.0), painting, realistic, photorealistic, 3d render, complex details, shading, gradient, text, watermark, (cyberpunk:2.0), (sci-fi:2.0), (city:2.0), (modern buildings:2.0), pink, blue, red, green, yellow, purple, cyan, teal, orange, magenta, brown, golden, silver, blonde";

function cleanCharacterDescription(desc: string): string {
    if (!desc) return "";
    const banList = [
        'cyberpunk', 'city', 'neon', 'future', 'sci-fi', 'urban', 'street', 'night', 'lights', 'building', 'skyscraper', 'modern',
        'blue', 'pink', 'red', 'green', 'yellow', 'purple', 'orange', 'colorful', 'cyan', 'teal', 'magenta', 'brown', 'gold', 'silver', 'blonde', 'dark', 'light',
        '粉色', '粉', '红色', '红', '蓝色', '蓝', '绿色', '绿', '黄色', '黄', '紫色', '紫', 
        '金色', '金', '银色', '银', '黑色', '黑', '白色', '白', '彩色', '霓虹', '城市', '科技感'
    ];
    const regex = new RegExp(banList.join('|'), 'gi');
    return desc.replace(regex, '').replace(/\s+/g, ' ').trim();
}

async function fetchImageAsBase64(url: string, makeGrayscale: boolean = false): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${url}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        
        let processor = sharp(buffer);
        if (makeGrayscale) {
            // ✅ 修复截屏1：使用 linear 替代错误的 modulate contrast
            processor = processor.grayscale().linear(1.5, -40).sharpen({ sigma: 1.5 }); 
        }
        const resizedBuffer = await processor.resize({ width: 1536, height: 1536, fit: 'inside' }).toBuffer();
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

        if (!ARK_API_KEY) throw new Error("API Key Missing");

        const { data: char, error } = await supabaseAdmin
            .from('characters')
            .select('name, description, avatar_url')
            .eq('id', characterId)
            .single();

        if (error || !char) throw new Error("Character not found");

        if (isDraftMode && useInstantID) {
             useInstantID = false;
        }

        if (useInstantID && !isDraftMode && char.avatar_url) {
            const instantPrompt = `(Character: ${char.description}), ${prompt}, masterpiece, best quality, 8k, cinematic lighting`;
            const instantNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, anime, cartoon, sketch";
            const output = await replicate.run(
                INSTANT_ID_MODEL as any,
                {
                    input: {
                        prompt: instantPrompt, negative_prompt: instantNegative,
                        image: char.avatar_url, pose_image: originImageUrl, 
                        sdxl_weights: "protovision-xl-high-fidel", scheduler: "K_EULER_ANCESTRAL",
                        num_inference_steps: 30, guidance_scale: 5, control_strength: 0.6, ip_adapter_scale: 0.8,
                        width: Number(RATIO_MAP[aspectRatio]?.split('x')[0] || 1280),
                        height: Number(RATIO_MAP[aspectRatio]?.split('x')[1] || 720),
                    }
                }
            );

            if (Array.isArray(output) && output.length > 0) {
                const rawUrl = output[0];
                const res = await fetch(rawUrl);
                const resultBuffer = Buffer.from(await res.arrayBuffer());
                const fileName = `cineflow/${projectId}/iid_repaint_${Date.now()}_${shotId}.png`;
                await supabaseAdmin.storage.from('images').upload(fileName, resultBuffer, { contentType: 'image/png', upsert: true });
                
                // ✅ 修复截屏4：Supabase 公开 URL 获取方式
                const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
                return { success: true, url: urlData.publicUrl };
            } else {
                throw new Error("InstantID returned no images");
            }
        }

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
                (exact same pose and composition:1.8), 
                (keep original background:2.0), 
                lineart, rough sketch
            `.trim();
            finalNegative = DRAFT_NEGATIVE_BASE; 
        } else {
            finalPrompt = `(Character: ${char.description}), ${prompt}, (exact same pose:1.5), (exact same composition:1.5), masterpiece, high quality`;
            finalNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo, changed pose, changed composition";
        }

        const payload: any = {
            model: isDraftMode ? MODEL_DRAFT : MODEL_PRO,
            prompt: finalPrompt,
            // ✅ 修正 1：在负面词中暴力拦截“脸”和“笑容”，专门针对背影和特定表情场景
            negative_prompt: `${finalNegative}, (looking at camera:2.0), (face:1.5), (smile:2.0), (laugh:2.0), eyes open`,
            size: RATIO_MAP[aspectRatio] || "2560x1440", 
            image_url: originBase64,
            
            // ✅ 修正 2：下调强度至 0.55。这是保留原图结构的“核武器”级参数。
            // 0.55 意味着原图的像素结构拥有 45% 的绝对统治权。
            strength: 0.55, 
            ref_strength: 0.9  // 提高参考强度，确保在低 strength 下角色特征（发型、衣服）依然能刷上去
        };

        const response = await fetch(ARK_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Repaint Failed");

        const newImageUrl = data.data?.[0]?.url;
        if (!newImageUrl) throw new Error("No image returned");

        const imageRes = await fetch(newImageUrl);
        
        // ✅ 修复截屏2、3：使用 let 声明 buffer，并使用 Buffer.from 处理 sharp 返回值
        let buffer = Buffer.from(await imageRes.arrayBuffer());

        if (isDraftMode) {
            console.log("🔒 [Repaint] 正在应用最终输出去色锁...");
            // 使用 (buffer as any) 解决 Sharp 内部 Buffer 类型定义冲突
            const processed = await sharp(buffer as any).grayscale().linear(1.5, -40).sharpen({ sigma: 1.5 }).toBuffer();
            buffer = Buffer.from(processed);
            console.log("🔒 [Repaint] 输出图像已物理转为黑白线稿。");
        }

        const fileName = `cineflow/${projectId}/${Date.now()}_repaint_${shotId}.png`;
        await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        
        // ✅ 修复截屏4：解构 data 属性以匹配 SDK 返回结构
        const { data: finalUrlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);

        return { success: true, url: finalUrlData.publicUrl };

    } catch (error: any) {
        console.error(error);
        return { success: false, message: error.message };
    }
}