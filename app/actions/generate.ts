'use server'

import { createClient } from '@/utils/supabase/server'
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// 强制代理配置 (保留不动)
if (process.env.NODE_ENV === 'development') {
  try {
    const proxyUrl = 'http://127.0.0.1:7890';
    const dispatcher = new ProxyAgent({
      uri: proxyUrl,
      connect: { timeout: 60000 }
    });
    setGlobalDispatcher(dispatcher);
  } catch (err) {
    console.error('代理设置失败:', err);
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ 新增参数: isDraft (是否为草图模式)
export async function generateShotImage(shotId: string, prompt: string, projectId: string, isDraft: boolean = false) {
  const supabase = await createClient();
  const MAX_RETRIES = 3;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // =========================================================
      // 🎨 核心修改：根据模式选择不同的模型和画风
      // =========================================================
      let finalPrompt = "";
      let model = "";

      if (isDraft) {
        // ✏️ 线稿模式：速度快，黑白草图，特征清晰
        // 使用 turbo 模型 (生成速度极快)
        model = "turbo"; 
        finalPrompt = encodeURIComponent(
          prompt + ", rough storyboard sketch, pencil drawing, loose lines, minimal detail, black and white, thick strokes, high contrast, white background"
        );
      } else {
        // 🎬 渲染模式：画质高，光影强
        // 使用 flux 模型 (慢但精细)
        model = "flux"; 
        finalPrompt = encodeURIComponent(
          prompt + ", cinematic lighting, 8k, photorealistic, movie scene, detailed texture, depth of field"
        );
      }

      const imageUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=1280&height=720&model=${model}&seed=${Math.random()}&nologo=true`; 

      // 2. 下载图片
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(60000)
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // 3. 上传存储桶
      const fileName = `${projectId}/${shotId}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('shots').upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: true
      });

      if (uploadError) throw new Error("上传失败");

      const { data: { publicUrl } } = supabase.storage.from('shots').getPublicUrl(fileName);

      return { success: true, url: publicUrl };

    } catch (error: any) {
      console.warn(`Attempt ${i+1} failed:`, error.message);
      if (i === MAX_RETRIES - 1) return { success: false, message: error.message };
      await delay(1000);
    }
  }
  return { success: false, message: "Unknown error" };
}