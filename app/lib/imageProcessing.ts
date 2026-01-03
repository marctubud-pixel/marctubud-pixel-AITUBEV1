import sharp from 'sharp';

/**
 * 图像物理清洗引擎
 * 用于强制去色、提取边缘，确保 Draft 模式的纯净度
 */

// 辅助：从 URL 获取 Buffer
async function fetchImageBuffer(urlOrBase64: string): Promise<Buffer> {
  // 如果是 Base64
  if (urlOrBase64.startsWith('data:')) {
    const base64Data = urlOrBase64.split(';base64,').pop();
    if (!base64Data) throw new Error('Invalid Base64 string');
    return Buffer.from(base64Data, 'base64');
  }
  
  // 如果是 URL
  if (urlOrBase64.startsWith('http')) {
    const response = await fetch(urlOrBase64);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error('Unsupported image format');
}

/**
 * 强制灰度化处理 (The "Grayscale Lock")
 * @param input - 图片 URL 或 Base64
 * @returns Base64 格式的灰度图片 (Data URI)
 */
export async function forceGrayscale(input: string): Promise<string> {
  try {
    const buffer = await fetchImageBuffer(input);
    
    // 使用 Sharp 进行物理去色
    // .grayscale() 强制转为 B-W
    // .toFormat('png') 统一输出格式
    const processedBuffer = await sharp(buffer)
      .grayscale() 
      // 可选：增加一点对比度，让线条更清晰
      .linear(1.1, 0) 
      .toFormat('png')
      .toBuffer();

    return `data:image/png;base64,${processedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('❌ [ImageProcessing] Grayscale conversion failed:', error);
    // 兜底策略：如果处理失败，返回原图，避免流程阻断
    return input;
  }
}

/**
 * (预留) 边缘提取 - 甚至可以做 Canny 提取
 */
export async function extractEdges(input: string): Promise<string> {
   // 留待后续更激进的线稿化使用
   return input; 
}