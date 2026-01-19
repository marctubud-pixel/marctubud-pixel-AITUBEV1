'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🟢 配置区域：使用火山引擎 (Volcengine)
const VOLC_API_KEY = process.env.VOLC_API_KEY; 
const VOLC_ENDPOINT_ID = process.env.VOLC_IMAGE_ENDPOINT_ID; 
const STORAGE_BUCKET = "cineflow-public"; 

export async function changeShotScene(
    originalImageUrl: string, 
    newScenePrompt: string, 
    shotId: string | number,
    projectId: string,
    refImageUrl?: string 
) {
    try {
        console.log(`\n========== [EDIT: Change Scene (Volcengine) for Shot ${shotId}] ==========`);
        
        // 1. 检查配置
        if (!VOLC_API_KEY || !VOLC_ENDPOINT_ID) {
            throw new Error("Config Error: VOLC_API_KEY or VOLC_IMAGE_ENDPOINT_ID is missing.");
        }

        // 2. 构造 Prompt
        let finalPrompt = `(Change background to: ${newScenePrompt}), keep the character appearance consistent, cinematic lighting, high quality, 8k`;
        
        console.log(`🚀 [Edit] Calling Volcengine (Endpoint: ${VOLC_ENDPOINT_ID})...`);
        
        // 3. 调用火山引擎 (Ark 接口)
        const payload = {
            model: VOLC_ENDPOINT_ID,
            prompt: finalPrompt,
            n: 1,
            // 🟢 [核心修复] 调高分辨率以满足 "at least 3686400 pixels" 的要求
            // 2048x2048 = 4,194,304 pixels > 3,686,400
            size: "2048x2048", 
            // 尝试传入参考图以保持一致性 (如果模型支持)
            image_url: originalImageUrl 
        };

        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${VOLC_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("❌ Volcengine Error:", JSON.stringify(data, null, 2));
            throw new Error(data.error?.message || "Volcengine Generation Failed");
        }

        const newImageUrl = data.data?.[0]?.url;
        if (!newImageUrl) throw new Error("No image returned from Volcengine");

        console.log(`✅ [Edit] Success: ${newImageUrl}`);

        // 4. 转存结果
        console.log("💾 [Edit] Saving result...");
        const imageRes = await fetch(newImageUrl);
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        const fileName = `workspace/${projectId}/edited_${Date.now()}_${shotId}.png`;
        
        const { error } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true, duplex: 'half' });

        if (error) throw error;

        const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
        
        return { success: true, url: publicUrl };

    } catch (error: any) {
        console.error("❌ Edit Error:", error);
        return { success: false, message: error.message };
    }
}