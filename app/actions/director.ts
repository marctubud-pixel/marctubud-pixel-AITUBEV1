'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
// 火山引擎方舟的文字对话接口
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export async function analyzeScript(scriptText: string) {
  // 1. 打印基础日志（用于 Vercel 调试）
  console.log("[Director] 开始分析剧本，长度:", scriptText?.length || 0);

  // 2. 严格检查环境变量
  if (!ARK_API_KEY) {
    console.error("[Director] 错误: 缺失 VOLC_ARK_API_KEY");
    throw new Error("服务器配置错误：API Key 缺失");
  }
  if (!ARK_TEXT_ENDPOINT_ID) {
    console.error("[Director] 错误: 缺失 VOLC_TEXT_ENDPOINT_ID");
    throw new Error("服务器配置错误：模型接入点 ID 缺失");
  }

  try {
    const systemPrompt = `
      你是一位专业的电影分镜导演。请将剧本拆解成一系列的关键分镜镜头。
      
      输出要求：
      - 必须是纯粹的 JSON 格式。
      - 返回格式示例：{"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
      - 每个镜头包含：
         1. description: 画面内容的详细视觉描述（中文）。
         2. visualPrompt: 用于 AI 绘画的英文提示词（包含光影、环境细节、动作）。
         3. shotType: 景别 (如: "Close-up", "Medium Shot", "Wide Shot", "Extreme Wide Shot")。
      - 不要包含任何解释性文字或 Markdown 标签。
    `;

    console.log("[Director] 正在调用火山引擎 API...");

    const response = await fetch(ARK_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: ARK_TEXT_ENDPOINT_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `请拆解以下剧本：\n\n${scriptText}` }
        ],
        temperature: 0.6, // 略微调低随机性，增强 JSON 格式稳定性
        max_tokens: 4000
      }),
      // 注意：Vercel 免费版超时限制为 10s，如果 API 响应慢可能会超时
      cache: 'no-store' 
    });

    const resJson = await response.json();

    if (!response.ok) {
      console.error("[Volcengine Error Detail]", JSON.stringify(resJson));
      throw new Error(resJson.error?.message || `HTTP Error ${response.status}`);
    }

    let content = resJson.choices?.[0]?.message?.content || "";
    
    // 3. 增强版内容清洗：去除 Markdown 标签及其前后的空白
    content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
    
    console.log("[Director] 成功接收 AI 返回内容 (前100字):", content.substring(0, 100));

    // 4. 解析 JSON
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.error("[Director] JSON 解析失败，原始内容为:", content);
        throw new Error("AI 返回格式不正确，未能解析为 JSON");
    }

    // 5. 兼容性格式化处理
    if (Array.isArray(data)) {
        return { panels: data };
    }
    
    if (!data.panels || !Array.isArray(data.panels)) {
        console.error("[Director] 返回数据缺少 panels 数组:", data);
        throw new Error("剧本拆解失败：AI 返回数据格式缺失分镜列表");
    }

    return data;

  } catch (error: any) {
    console.error("[Director Runtime Error]", error);
    // 抛出友好的错误信息给前端 toast
    throw new Error(error.message || "剧本分析过程中发生未知错误");
  }
}