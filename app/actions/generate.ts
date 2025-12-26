'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateShotImage(shotId: string, prompt: string, projectId: string) {
  console.log("🚀 [AI] 开始生成镜头:", shotId);

  try {
    const supabase = await createClient();

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

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('shots')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
        console.error("Storage Upload Error:", uploadError);
        throw new Error("图片上传到存储桶失败");
    }

    // 4. 获取公开链接
    const { data: { publicUrl } } = supabase
      .storage
      .from('shots')
      .getPublicUrl(fileName);

    // 5. 更新数据库
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
    
    // 失败时记录状态
    const supabase = await createClient();
    await supabase.from('shots').update({ status: 'failed' }).eq('id', shotId);

    return { success: false, message: error.message };
  }
}
