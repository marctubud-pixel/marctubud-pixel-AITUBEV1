'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
// ⚠️ 务必确认 .env.local 里配置了这个 ID
const VISION_ENDPOINT_ID = process.env.VOLC_VISION_ENDPOINT_ID; 
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 导出类型定义，解决 generate.ts 里的红线
export type VisionAnalysis = {
  shot_type: string; 
  description: string;
}

export async function analyzeRefImage(imageUrl: string): Promise<VisionAnalysis | null> {
  if (!VISION_ENDPOINT_ID || !ARK_API_KEY) {
    console.warn("[Vision] 缺少 API Key 或 Endpoint ID，跳过视觉分析");
    return null;
  }

  try {
    console.log(`[Vision] 正在分析参考图特征...`);

    const payload = {
      model: VISION_ENDPOINT_ID,
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `你是一个专业的电影摄影师。请分析这张图片。
              请务必只返回纯 JSON 格式字符串，不要包含 Markdown 标记。
              JSON 需包含两个字段：
              1. "shot_type": 判断人物在画面中的占比。必须是以下四个值之一："Close-up" (特写/大头), "Mid Shot" (半身/腰部以上), "Full Shot" (全身), "Wide Shot" (远景/大场景)。
              2. "description": 用简练的英文描述人物的外貌特征。` 
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
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("[Vision] 分析过程失败:", error);
    return null;
  }
}