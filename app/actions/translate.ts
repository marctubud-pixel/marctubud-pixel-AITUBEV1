'use server'

export async function translateToEnglish(text: string): Promise<string> {
  // 1. 空值与纯英文检查
  if (!text || text.trim().length === 0) return "";
  
  // 如果没有中文，直接返回，节省 Token
  if (!/[\u4e00-\u9fa5]/.test(text)) {
    return text;
  }

  console.log(`[AI Translate] 正在匹配英文片名: ${text}`);

  try {
    // 2. 调用豆包/Volcengine API
    // 优先读取 VOLC_API_KEY
    const apiKey = process.env.VOLC_API_KEY || process.env.OPENAI_API_KEY; 
    
    // 豆包 Endpoint
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    // 模型 ID (必须是推理接入点 ID，如 ep-xxxx)
    const modelId = process.env.VOLC_MODEL_ID || 'ep-20241231165209-66w74'; 

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId, 
        messages: [
          {
            role: 'system',
            // 🟢 核心修改：强化“电影名”概念
            // 指令：你是电影资料库专家。将用户输入翻译为官方英文片名或电影关键词。
            content: 'You are a movie database expert. Your task is to translate user input into the OFFICIAL English movie title or cinematic keywords. Examples: "变形金刚" -> "Transformers"; "千与千寻" -> "Spirited Away"; "黑客帝国" -> "The Matrix"; "王家卫风格" -> "Wong Kar-wai style, cinematic lighting". Output ONLY the English result.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        // 🟢 降低温度：减少随机性，确保片名匹配准确
        temperature: 0.1 
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("[Translate API Error]", errText);
        // 失败降级：返回原文
        return text; 
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim() || "";
    
    // 如果返回结果包含引号（有些模型喜欢加引号），去掉它
    const cleanText = translatedText.replace(/^["']|["']$/g, '');

    console.log(`[AI Translate] 结果: ${cleanText}`);
    return cleanText || text;

  } catch (error) {
    console.error("[Translate Failed] 连接失败:", error);
    return text; 
  }
}