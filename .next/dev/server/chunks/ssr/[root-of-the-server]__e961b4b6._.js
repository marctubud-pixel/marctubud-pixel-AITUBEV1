module.exports = [
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/querystring [external] (querystring, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("querystring", () => require("querystring"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/node:stream/promises [external] (node:stream/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream/promises", () => require("node:stream/promises"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/app/actions/director.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"7fcf3a16334304d1e04a6c1130bcb6eee817055d48":"analyzeScript"},"",""] */ __turbopack_context__.s([
    "analyzeScript",
    ()=>analyzeScript
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@google/genai/dist/node/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
// ❌ 删掉了复杂的代理代码，回归最简模式
const ai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["GoogleGenAI"]({
    apiKey: process.env.GOOGLE_API_KEY
});
const analyzeScript = async (script)=>{
    // 这里使用 Google 的 2.0 Flash 模型，速度快且免费
    const model = "gemini-2.0-flash-exp";
    const systemInstruction = `
    You are a world-class Hollywood cinematographer and storyboard artist. 
    Your task is to analyze a short script and break it down into exactly 4 key visual panels (beats) for a 2x2 grid storyboard.
    For each panel, determine the Shot Type (CS=Close Shot, MS=Medium Shot, LS=Long Shot).
    Create a highly detailed Stable Diffusion style prompt for a black and white sketch style image.
    The visual prompt must describe the scene content, the angle, the lighting, and strictly specify "black and white ink sketch style".
  `;
    const responseSchema = {
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].OBJECT,
        properties: {
            panels: {
                type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].ARRAY,
                items: {
                    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].OBJECT,
                    properties: {
                        sceneNumber: {
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].STRING
                        },
                        description: {
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].STRING
                        },
                        shotType: {
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].STRING
                        },
                        visualPrompt: {
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$genai$2f$dist$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Type"].STRING
                        }
                    },
                    required: [
                        "sceneNumber",
                        "description",
                        "shotType",
                        "visualPrompt"
                    ]
                }
            }
        },
        required: [
            "panels"
        ]
    };
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Analyze this script and generate a 4-panel breakdown: "${script}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema
            }
        });
        if (!response.text) {
            throw new Error("Gemini 没有返回文本");
        }
        return JSON.parse(response.text);
    } catch (error) {
        console.error("AI Analysis Failed:", error);
        throw new Error(`剧本分析失败: ${error.message}`);
    }
};
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    analyzeScript
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(analyzeScript, "7fcf3a16334304d1e04a6c1130bcb6eee817055d48", null);
}),
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
"[project]/.next-internal/server/app/tools/cineflow/storyboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/director.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/app/actions/generate.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$director$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/director.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/generate.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/.next-internal/server/app/tools/cineflow/storyboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions/director.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/app/actions/generate.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "7064ff3c51eedcf1e037d979362ec0d6ac5e7fa9c1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateShotImage"],
    "7fcf3a16334304d1e04a6c1130bcb6eee817055d48",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$director$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["analyzeScript"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$tools$2f$cineflow$2f$storyboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$actions$2f$director$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/tools/cineflow/storyboard/page/actions.js { ACTIONS_MODULE0 => "[project]/app/actions/director.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/app/actions/generate.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$director$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/director.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2f$generate$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions/generate.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e961b4b6._.js.map