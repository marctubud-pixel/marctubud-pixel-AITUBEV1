'use server'

import { createClient } from '@supabase/supabase-js'
import { analyzeRefImage } from './vision'; 
import sharp from 'sharp'; 
import Replicate from "replicate"; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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

function injectHairFeature(charDesc: string): string {
    const hairKeywords = ['ponytail', 'braid', 'twintail', 'long hair', 'short hair', 'curly hair', 'bangs', 'bun', '马尾', '辫', '长发', '短发', '卷发', '刘海', '丸子头'];
    const foundFeatures = hairKeywords.filter(k => charDesc.toLowerCase().includes(k.toLowerCase()));
    return foundFeatures.length > 0 ? foundFeatures.map(f => `(${f}:1.6)`).join(", ") + ", " : "";
}

function selectAssetForPrompt(assets: any, prompt: string, defaultAvatar: string): { url: string, isBackView: boolean, type: 'back'|'side'|'front' } {
    if (!assets || typeof assets !== 'object') return { url: defaultAvatar, isBackView: false, type: 'front' };
    const p = prompt.toLowerCase();
    
    if (/back view|rear view|behind|背影|背对|背向|背身|后背/.test(p) && assets["back"]) 
        return { url: assets["back"], isBackView: true, type: 'back' };
    if (/side view|profile|from side|侧面|侧脸|侧身|侧颜|回眸/.test(p) && assets["side"]) 
        return { url: assets["side"], isBackView: false, type: 'side' };
    
    return { url: defaultAvatar, isBackView: false, type: 'front' };
}

async function fetchImageAsBase64(url: string, makeGrayscale: boolean = false): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${url}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        let processor = sharp(buffer);
        if (makeGrayscale) processor = processor.grayscale().linear(1.5, -40).sharpen({ sigma: 1.5 }); 
        const resizedBuffer = await processor.resize({ width: 1536, height: 1536, fit: 'inside' }).toBuffer();
        return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
    } catch (e) { return null; }
}

export async function repaintShotWithCharacter(
    shotId: string, originImageUrl: string, characterId: string, prompt: string, projectId: string, aspectRatio: string = "16:9", isDraftMode: boolean = false, useInstantID: boolean = false
) {
    try {
        console.log(`\n========== [REPAINT: Shot ${shotId}] ==========`);
        if (!ARK_API_KEY) throw new Error("API Key Missing");

        const { data: char, error } = await supabaseAdmin
            .from('characters')
            .select('name, description, avatar_url, assets, description_map')
            .eq('id', characterId)
            .single();

        if (error || !char) throw new Error("Character not found");

        const { url: activeRefUrl, isBackView, type: angleType } = selectAssetForPrompt(char.assets, prompt, char.avatar_url);
        
        // 🟢 智能描述选择
        let targetDescription = char.description || "";
        const descMap = char.description_map || {};

        if (angleType === 'back' && descMap.back) {
            console.log("📖 [Smart Desc] 切换至【背影专属描述】");
            targetDescription = descMap.back; 
        } else if (angleType === 'side' && descMap.side) {
            console.log("📖 [Smart Desc] 切换至【侧面专属描述】");
            targetDescription = descMap.side;
        }

        // 🟢 视觉桥接
        let visualBridgePrompt = "";
        if (activeRefUrl && activeRefUrl !== char.avatar_url) {
             console.log("👁️ [Visual Bridge] 分析参考图特征...");
             try {
                 const visionData = await analyzeRefImage(activeRefUrl);
                 if (visionData && visionData.description) { // 类型已修复
                     const rawVis = visionData.description.replace(/photo of|image of|drawing of/gi, "");
                     // 如果是背面，强制加前缀引导 AI
                     const prefix = isBackView ? "back view of " : ""; 
                     visualBridgePrompt = `(Visual Reference: ${prefix}${rawVis}), `;
                 }
             } catch (e) {}
        }

        const originBase64 = await fetchImageAsBase64(originImageUrl, isDraftMode);
        if (!originBase64) throw new Error("Failed to process original image");

        let finalPrompt = "";
        let finalNegative = "";
        
        // 🟢 最终定稿：动态强度配置 (Production Config)
        // Back View: 0.95 (给予 AI 极大自由度去重构衣服，但保留 5% 的构图参考)
        // Other: 0.55 (保持对草图构图的尊重)
        const dynamicStrength = isBackView ? 0.95 : 0.55; 
        const dynamicRefStrength = isBackView ? 1.0 : 0.95;

        if (isDraftMode) {
            const hairAnchor = injectHairFeature(targetDescription);

            let characterPromptPart = `(Character: ${targetDescription})`;
            if (isBackView) {
                // 引导词加固
                characterPromptPart = `(rear view structure:2.0), (no face:2.0), (view from behind: ${targetDescription})`;
            }

            finalPrompt = `
                (exact same pose and composition:1.5), (solo:2.0), 
                ${hairAnchor} ${visualBridgePrompt} (${prompt}:1.7), 
                (${DRAFT_PROMPT_CLASSIC}), ${characterPromptPart}, lineart
            `.trim();

            let repaintNegative = DRAFT_NEGATIVE_BASE;
            if (isBackView) {
                // 核弹级负面词保留
                repaintNegative += ", (face:2.0), (eye:2.0), (mouth:2.0), (tie:2.0), (logo:2.0), (buttons:2.0), (chest:2.0), (collar:1.5)";
            }
            finalNegative = repaintNegative;
        } else {
            finalPrompt = `(solo:1.5), ${visualBridgePrompt} (Character: ${targetDescription}), (${prompt}:1.4), masterpiece`;
            finalNegative = "nsfw, low quality, bad anatomy, multiple people";
        }

        const payload: any = {
            model: isDraftMode ? MODEL_DRAFT : MODEL_PRO,
            prompt: finalPrompt, negative_prompt: finalNegative,
            size: RATIO_MAP[aspectRatio] || "2560x1440", image_url: originBase64, 
            strength: dynamicStrength,
            ref_strength: dynamicRefStrength
        };

        const response = await fetch(ARK_API_URL, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
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

    } catch (error: any) { console.error(error); return { success: false, message: error.message }; }
}