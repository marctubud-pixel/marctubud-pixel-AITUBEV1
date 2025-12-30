'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const VISION_ENDPOINT_ID = process.env.VOLC_VISION_ENDPOINT_ID; 
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 增强型分析结果类型定义
export type VisionAnalysis = {
  shot_type: "Close-up" | "Mid Shot" | "Full Shot" | "Wide Shot"; 
  description: string;
  subject_composition: {
    head_y_range: [number, number]; // [top, bottom] 比例 (0-1)
    body_y_range: [number, number]; 
  };
  key_features: string[]; // 提取关键视觉特征点
}

export async function analyzeRefImage(imageUrl: string): Promise<VisionAnalysis | null> {
  if (!VISION_ENDPOINT_ID || !ARK_API_KEY) {
    console.warn("[Vision] 缺少 API Key 或 Endpoint ID，跳过视觉分析");
    return null;
  }

  try {
    console.log(`[Vision] 正在进行深度视觉感知分析...`);

    const payload = {
      model: VISION_ENDPOINT_ID,
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `你是一个专业的电影摄影师和AI图像算法工程师。请分析这张图片。
              必须只返回纯 JSON 格式字符串，禁止 Markdown。
              
              JSON 结构要求：
              1. "shot_type": "Close-up", "Mid Shot", "Full Shot", "Wide Shot" 之一。
              2. "description": 英文描述人物的核心特征（发型、服饰颜色、材质）。
              3. "subject_composition": 
                 - "head_y_range": 头部在垂直方向的占比，格式为 [起始, 结束] (例如 [0.1, 0.25])。
                 - "body_y_range": 躯干在垂直方向的占比，格式为 [起始, 结束]。
              4. "key_features": 一个字符串数组，包含5个最重要的视觉特征词（如 "platinum blonde", "cyberpunk goggles"）。` 
            },
            { 
              type: "image_url", 
              image_url: { url: imageUrl } 
            }
          ]
        }
      ],
      temperature: 0.1,
    };

    const res = await fetch(ARK_CHAT_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${ARK_API_KEY}` 
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.error) {
        console.error("[Vision API Error]", data.error);
        return null;
    }

    const content = data.choices?.[0]?.message?.content || "{}";
    // 鲁棒性更强的 JSON 清洗
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').replace(/[\r\n]/g, '').trim();
    
    const parsed = JSON.parse(cleanJson) as VisionAnalysis;
    console.log(`[Vision] 分析完成: ${parsed.shot_type}, 特征词: ${parsed.key_features.join(', ')}`);
    
    return parsed;

  } catch (error) {
    console.error("[Vision] 分析过程失败:", error);
    return null;
  }
}