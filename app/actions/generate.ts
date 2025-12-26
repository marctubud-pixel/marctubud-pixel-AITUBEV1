'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Google Gemini (Imagen) 的 API 地址
const GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict";

export async function generateShotImage(shotId: string, prompt: string, projectId: string) {
  console.log("🚀 [AI] 开始生成镜头:", shotId);

  try {
    const supabase = await createClient();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("缺少 GOOGLE_API_KEY 环境变量");
    }

    // 1. 调用 Google Imagen 3 API
    const response = await fetch(`${GOOGLE_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          { prompt: prompt }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9" // 默认生成 16:9
        }
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Google API Error:", errText);
        throw new Error(`Google API 调用失败: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Google 返回的是 Base64 编码的图片数据
    const base64Image = result.predictions?.[0]?.bytesBase64Encoded;
    
    if (!base64Image) {
        throw new Error("API 未返回图片数据");
    }

    // 2. 将 Base64 转换为 Buffer (二进制文件)
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // 3. 上传到 Supabase Storage ('shots' bucket)
    // 文件名格式: project_id/shot_id_时间戳.png
    const fileName = `${projectId}/${shotId}_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('shots') // 确保存储桶名字叫 'shots'
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
        console.error("Storage Upload Error:", uploadError);
        throw new Error("图片上传到存储桶失败");
    }

    // 4. 获取公开访问链接 (Public URL)
    const { data: { publicUrl } } = supabase
      .storage
      .from('shots')
      .getPublicUrl(fileName);

    // 5. 更新数据库 shots 表
    const { error: dbError } = await supabase
      .from('shots')
      .update({
        image_url: publicUrl,
        status: 'completed'
      })
      .eq('id', shotId);

    if (dbError) throw dbError;

    console.log("✅ [AI] 生成并上传成功:", publicUrl);
    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error("🔥 [AI Fail]:", error);
    
    // 更新状态为失败
    const supabase = await createClient();
    await supabase.from('shots').update({ status: 'failed' }).eq('id', shotId);

    return { success: false, message: error.message };
  }
}
