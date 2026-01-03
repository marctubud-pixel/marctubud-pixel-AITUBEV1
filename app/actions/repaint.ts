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

        const originBase64 = await fetchImageAsBase64(originImageUrl, isDraftMode);
        if (!originBase64) throw new Error("Failed to process original image");

        let finalPrompt = "";
        let finalNegative = "";

        if (isDraftMode) {
            const cleanDesc = cleanCharacterDescription(char.description);
            // 🛡️ 铁律：重绘时导演指令 (prompt) 绝对置顶并暴力加权
            finalPrompt = `
                (exact same pose and composition:1.9), 
                (${prompt}:1.6), 
                (${DRAFT_PROMPT_CLASSIC}), 
                (Character: ${cleanDesc}), 
                lineart, (keep original background:2.0)
            `.trim();

            // 🛡️ 动态负面拦截
            let repaintNegative = DRAFT_NEGATIVE_BASE;
            if (prompt.includes("back view") || prompt.includes("no face")) {
                repaintNegative += ", (face:2.0), (looking at camera:2.0), eyes, nose, mouth";
            }
            if (prompt.includes("eyes tightly closed") || prompt.includes("no smile")) {
                repaintNegative += ", (smile:2.0), (laughter:2.0), (open eyes:2.0)";
            }
            finalNegative = repaintNegative;
        } else {
            finalPrompt = `(Character: ${char.description}), (${prompt}:1.4), (exact same pose:1.5), (exact same composition:1.5), masterpiece`;
            finalNegative = "nsfw, low quality, bad anatomy, changed pose, changed composition";
        }

        const payload: any = {
            model: isDraftMode ? MODEL_DRAFT : MODEL_PRO,
            prompt: finalPrompt,
            negative_prompt: finalNegative,
            size: RATIO_MAP[aspectRatio] || "2560x1440", 
            image_url: originBase64,
            strength: 0.55, // 🔒 结构锁死：极致保留原分镜骨架
            ref_strength: 0.9
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
        let buffer = Buffer.from(await imageRes.arrayBuffer());

        if (isDraftMode) {
            const processed = await sharp(buffer as any).grayscale().linear(1.5, -40).sharpen({ sigma: 1.5 }).toBuffer();
            buffer = Buffer.from(processed);
        }

        const fileName = `cineflow/${projectId}/${Date.now()}_repaint_${shotId}.png`;
        await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        const { data: finalUrlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);

        return { success: true, url: finalUrlData.publicUrl };

    } catch (error: any) {
        console.error(error);
        return { success: false, message: error.message };
    }
}