module.exports = [
"[project]/utils/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    // 1. 等待 Cookie Store (Next.js 15 必须加 await)
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    // 2. 打印调试日志
    const allCookies = cookieStore.getAll();
    console.log(`🍪 [Debug Server] 收到 Cookie 数量: ${allCookies.length}`);
    if (allCookies.length > 0) {
        // 打印前两个 Cookie 的名字验证一下
        console.log(`🍪 [Debug Server] Cookie 示例: ${allCookies.slice(0, 2).map((c)=>c.name).join(', ')}`);
    } else {
        console.error(`❌ [Debug Server] 警告：没有收到任何 Cookie！认证将失败。`);
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://muwpfhwzfxocqlcxbsoa.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            // 🛠️ 修复点：加回了 ": any"，防止 TypeScript 报错
            setAll (cookiesToSet) {
                try {
                    // 这里的参数也要加 ": any"
                    cookiesToSet.forEach(({ name, value, options })=>{
                    // Server Action 中通常不需要实际写入 Cookie，这里留空或者是为了兼容性
                    });
                } catch (error) {
                // ignore
                }
            }
        }
    });
}
}),
"[project]/app/actions/generate.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"7064ff3c51eedcf1e037d979362ec0d6ac5e7fa9c1":"generateShotImage"},"",""] */ __turbopack_context__.s([
    "generateShotImage",
    ()=>generateShotImage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
async function generateShotImage(shotId, prompt, projectId) {
    console.log("🚀 [AI] 开始生成镜头:", shotId);
    try {
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
        // 1. 使用 Pollinations AI 生成 (免费、无需 Key)
        // 它是通过 URL 直接返回图片的，非常方便
        // 我们对 prompt 进行编码，防止特殊字符报错
        const encodedPrompt = encodeURIComponent(prompt + ", cinematic lighting, 8k, photorealistic");
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux`; // 使用 flux 模型，效果更好
        console.log("🎨 请求 Pollinations:", imageUrl);
        // 2. 下载生成的图片 (获取二进制流)
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`图片生成失败: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        // 3. 上传到 Supabase Storage
        const fileName = `${projectId}/${shotId}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('shots').upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
        });
        if (uploadError) {
            console.error("Storage Upload Error:", uploadError);
            throw new Error("图片上传到存储桶失败");
        }
        // 4. 获取公开链接
        const { data: { publicUrl } } = supabase.storage.from('shots').getPublicUrl(fileName);
        // 5. 更新数据库
        const { error: dbError } = await supabase.from('shots').update({
            image_url: publicUrl,
            status: 'completed'
        }).eq('id', shotId);
        if (dbError) throw dbError;
        console.log("✅ [AI] 生成并上传成功:", publicUrl);
        return {
            success: true,
            url: publicUrl
        };
    } catch (error) {
        console.error("🔥 [AI Fail]:", error);
        // 失败时记录状态
        const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
        await supabase.from('shots').update({
            status: 'failed'
        }).eq('id', shotId);
        return {
            success: false,
            message: error.message
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    generateShotImage
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(generateShotImage, "7064ff3c51eedcf1e037d979362ec0d6ac5e7fa9c1", null);
}),
"[project]/.next-internal/server/app/tools/cineflow/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/generate.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/generate.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/tools/cineflow/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/generate.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "7064ff3c51eedcf1e037d979362ec0d6ac5e7fa9c1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateShotImage"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$tools$2f$cineflow$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/tools/cineflow/[id]/page/actions.js { ACTIONS_MODULE0 => "[project]/app/actions/generate.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/generate.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_c710642b._.js.map