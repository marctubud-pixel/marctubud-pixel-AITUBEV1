'use server'

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL_PRO = process.env.VOLC_IMAGE_ENDPOINT_ID; 

const RATIO_MAP: Record<string, string> = {
  "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048", 
  "4:3": "2304x1728", "3:4": "1728x2304", "2.39:1": "3072x1280" 
};

// 🟢 经典线稿风格 (强制黑白)
const DRAFT_PROMPT_CLASSIC = "monochrome storyboard sketch, rough pencil drawing, black and white, minimal lines, high contrast, loose strokes, (no color:2.0), professional storyboard, greyscale, lineart";

// 🟢 强力负面 (禁止颜色，禁止复杂背景渲染)
// 🔥 关键：把 color, rgb 放在最前面，权重拉满，封杀所有常见颜色词
const DRAFT_NEGATIVE_BASE = "(color:2.0), (rgb:2.0), (colorful:2.0), painting, realistic, photorealistic, 3d render, complex details, shading, gradient, text, watermark, (cyberpunk:2.0), (sci-fi:2.0), (city:2.0), (modern buildings:2.0), pink, blue, red, green, yellow, purple, cyan, teal, orange, magenta, brown, golden, silver, blonde";

// 🟢 辅助函数：清洗角色描述中的环境词和颜色词
function cleanCharacterDescription(desc: string): string {
    // 移除可能导致背景污染的词汇 + 颜色词汇
    const banList = [
        // 环境/风格干扰词
        'cyberpunk', 'city', 'neon', 'future', 'sci-fi', 'urban', 'street', 'night', 'lights', 'building', 'skyscraper', 'modern',
        // 颜色干扰词 (扩充版)
        'blue', 'pink', 'red', 'green', 'yellow', 'purple', 'orange', 'colorful', 'cyan', 'teal', 'magenta', 'brown', 'gold', 'silver', 'blonde', 'dark', 'light'
    ];
    let cleaned = desc.toLowerCase();
    banList.forEach(word => {
        // 使用正则替换，确保替换掉完整的词 (比如 'blue hair' 变成 ' hair')
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    // 清理多余的空格
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
            // 🔥 关键步骤：转灰度，彻底移除 RGB 通道信息
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
    isDraftMode: boolean = false 
) {
    try {
        console.log(`\n========== [REPAINT: Shot ${shotId}] ==========`);
        console.log(`1. Mode: ${isDraftMode ? 'DRAFT (Force Grayscale & Clean Prompt)' : 'RENDER'}`);
        console.log(`2. Ratio: ${aspectRatio}`);

        if (!ARK_API_KEY) throw new Error("API Key Missing");

        const { data: char, error } = await supabaseAdmin
            .from('characters')
            .select('name, description, avatar_url')
            .eq('id', characterId)
            .single();

        if (error || !char) throw new Error("Character not found");

        // 🟢 1. 准备底图
        // 如果是 Draft 模式，原图和角色图全部强制转黑白 (makeGrayscale = true)
        const originBase64 = await fetchImageAsBase64(originImageUrl, isDraftMode);
        // 虽然 API 主要参考 originBase64，但如果在其他逻辑中用到 charBase64，确保它也是黑白的
        // const charBase64 = char.avatar_url ? await fetchImageAsBase64(char.avatar_url, isDraftMode) : null;

        if (!originBase64) throw new Error("Failed to process original image");

        let finalPrompt = "";
        let finalNegative = "";

        if (isDraftMode) {
            // 🟢 Draft 模式策略：
            // 1. 清洗角色描述 (剔除颜色和环境词)
            const cleanDesc = cleanCharacterDescription(char.description);
            console.log(`[Draft Mode] Cleaned Character Desc: "${cleanDesc}"`);
            
            // 2. 强力 Prompt 约束
            finalPrompt = `
                (${DRAFT_PROMPT_CLASSIC}), 
                (Character visual features: ${cleanDesc} in sketch style), 
                ${prompt}, 
                (keep original background:2.0), (ignore character environment), 
                lineart, rough sketch, (white background:1.2)
            `.trim();
            
            finalNegative = DRAFT_NEGATIVE_BASE; 
        } else {
            // Render 模式：正常策略
            finalPrompt = `(Character: ${char.description}), ${prompt}, (same composition:1.5), (maintain pose:1.4), high quality`;
            finalNegative = "nsfw, low quality, bad anatomy, distortion, watermark, text, logo";
        }

        const payload: any = {
            model: MODEL_PRO,
            prompt: finalPrompt,
            negative_prompt: finalNegative,
            size: RATIO_MAP[aspectRatio] || "2560x1440", 
            image_url: originBase64,
            strength: 0.75, // 0.75 是保持构图与换脸的最佳平衡点
            ref_strength: 0.8
        };

        console.log(`[Repaint] Prompt: ${finalPrompt.substring(0, 100)}...`);

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