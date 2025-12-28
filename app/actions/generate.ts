'use server'

import { createClient } from '@supabase/supabase-js'

// 初始化 Supabase Admin (用于上传图片)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 火山引擎方舟配置
const ARK_API_KEY = process.env.VOLC_ARK_API_KEY
const ARK_ENDPOINT_ID = process.env.VOLC_IMAGE_ENDPOINT_ID
// 方舟文生图的标准兼容端点
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

export async function generateShotImage(
  shotId: string | number, 
  prompt: string, 
  projectId: string,
  isDraftMode: boolean = true
) {
  console.log(`[Server] 即梦AI 开始生成: ${shotId}`);

  try {
    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) {
      throw new Error("请先配置 VOLC_ARK_API_KEY 和 VOLC_IMAGE_ENDPOINT_ID");
    }

    // 1. 构造即梦 (Seedream) 请求
    // 即梦对中文 Prompt 支持极好，不需要翻译
    const payload = {
      model: ARK_ENDPOINT_ID, // 这是你的接入点 ID，例如 ep-20250101...
      prompt: prompt,
      size: "1024x1024", // 即梦标准比例
      n: 1
      // 可以在这里添加更多参数，如 guidance_scale 等，视具体模型支持而定
    };

    // 2. 发送请求给火山引擎
    const response = await fetch(ARK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Volcengine Error]", data);
      throw new Error(data.error?.message || "即梦API调用失败");
    }

    // 获取图片 URL (通常在 data.data[0].url)
    const imageUrl = data.data?.[0]?.url;
    console.log(`[Server] 即梦返回 URL: ${imageUrl}`);

    if (!imageUrl) throw new Error("AI 未返回图片 URL");

    // 3. 将图片转存到 Supabase Storage
    // (逻辑与之前一样，必须转存，因为生成的临时链接有效期很短)
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `cineflow/${projectId}/${Date.now()}_${shotId}.png`;
    
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error("[Upload Error]", uploadError);
      throw new Error("图片上传存储桶失败");
    }

    // 4. 获取公开访问链接
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('images')
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error("[Generate Error]", error);
    return { success: false, message: error.message || '生成服务出错' };
  }
}