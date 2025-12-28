'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
// 火山引擎方舟的文字对话接口
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export async function analyzeScript(scriptText: string) {
  console.log("[Director] 开始分析剧本 (Using Volcengine)...");

  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) {
    throw new Error("请在 .env.local 中配置 VOLC_ARK_API_KEY 和 VOLC_TEXT_ENDPOINT_ID");
  }

  try {
    const systemPrompt = `
      你是一位专业的电影分镜导演。请将下面的剧本拆解成一系列的关键分镜镜头。
      
      要求：
      1. 输出必须是纯粹的 JSON 格式，不要包含 Markdown 标记（不要写 \`\`\`json）。
      2. 返回一个 JSON 对象，包含 "panels" 数组。
      3. 每个镜头包含：
         - description: 画面内容的详细视觉描述（中文）。
         - visualPrompt: 用于 AI 绘画的英文提示词（包含光影、风格、细节）。
         - shotType: 景别 (如: "Close-up", "Medium Shot", "Wide Shot")。
    `;

    // 构造请求
    const response = await fetch(ARK_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: ARK_TEXT_ENDPOINT_ID, // 使用文字模型接入点
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `剧本内容：\n"${scriptText}"` }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    const resJson = await response.json();

    if (!response.ok) {
      console.error("[Volcengine Error]", resJson);
      throw new Error(resJson.error?.message || "火山引擎调用失败");
    }

    let content = resJson.choices?.[0]?.message?.content || "";
    console.log("[Director] 原始返回:", content.slice(0, 100) + "...");

    // 清洗可能存在的 Markdown 符号
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    // 解析 JSON
    const data = JSON.parse(content);

    // 兼容性处理：如果AI直接返回了数组而非对象
    if (Array.isArray(data)) {
        return { panels: data };
    }
    
    if (!data.panels) {
        throw new Error("AI 返回格式缺少 panels 字段");
    }

    return data;

  } catch (error: any) {
    console.error("[Director Error]", error);
    // 如果是 JSON 解析失败，通常意味着 AI 没有按格式返回
    if (error instanceof SyntaxError) {
        throw new Error("AI 返回内容不是有效的 JSON，请重试");
    }
    throw new Error("剧本拆解失败: " + error.message);
  }
}