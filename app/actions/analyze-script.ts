'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
// 火山引擎方舟的文字对话接口
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export async function analyzeScript(scriptText: string) {
  // 1. 打印基础日志
  console.log("[Director] 开始分析剧本，长度:", scriptText?.length || 0);

  // 2. 严格检查环境变量
  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) {
    console.error("[Director] 错误: 缺失 API Key 或 Endpoint ID");
    throw new Error("服务器配置错误：AI 服务未连接");
  }

  try {
    // 🔥 核心升级：导演智能体 System Prompt
    // 这里包含了我们刚才讨论的“动作拆分”和“智能景别”逻辑
    const systemPrompt = `
      你是一位经验丰富的电影分镜导演。你的任务是将用户的剧本拆解为一系列具体的、可视化的分镜画面。

      ### 核心原则 (必须严格遵守)
      1. **动作拆分 (Action Splitting)**：
         - 如果一句剧本包含连续动作（例如：“他走进房间，环顾四周，然后惊恐地盯着角落”），**必须**拆解为 3 个独立的分镜，严禁合并在同一个画面中。
         - 每个分镜只表现一个核心动作或状态。
      
      2. **智能景别推断 (Smart Shot Inference)**：
         请根据画面内容，从以下列表中选择最精准的景别（Shot Type）：
         - "EXTREME LONG SHOT": 展现宏大场景、城市全貌、远处的山脉、孤独渺小的人影。
         - "LONG SHOT": 人物全身可见，强调人物与大环境的关系。
         - "FULL SHOT": 人物从头到脚完整可见，用于表现肢体动作、行走。
         - "MID SHOT": 人物腰部以上，用于对话、上半身动作。
         - "CLOSE-UP": 面部特写，展现情绪、表情。
         - "EXTREME CLOSE-UP": 局部特写（眼睛、嘴唇、手指、物品细节）。

      3. **视觉翻译 (Visual Translation)**：
         - description: 简练的中文剧情描述。
         - visualPrompt: 纯英文提示词，用于 AI 绘画。必须包含：主体(Subject)、动作(Action)、光影(Lighting)、环境(Environment)。
         - **注意**：如果剧本未描写背景，请根据上下文自动补全合理的背景（如：cyberpunk city, sunny beach, dark room），防止背景缺失。

      ### 输出格式
      必须只返回纯 JSON 格式，不要包含 Markdown 标记：
      {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
    `;

    console.log("[Director] 正在调用火山引擎 API (Smart Splitting)...");

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
          { role: "user", content: `请拆解以下剧本，注意将长动作拆分为不同分镜：\n\n${scriptText}` }
        ],
        temperature: 0.7, // 稍微提高创造性，以便更好地补全画面细节
        max_tokens: 4000
      }),
      cache: 'no-store' 
    });

    const resJson = await response.json();

    if (!response.ok) {
      console.error("[Volcengine Error Detail]", JSON.stringify(resJson));
      throw new Error(resJson.error?.message || `HTTP Error ${response.status}`);
    }

    let content = resJson.choices?.[0]?.message?.content || "";
    
    // 3. 内容清洗：去除 Markdown 标签及其前后的空白
    content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
    
    console.log("[Director] AI 返回内容 (Preview):", content.substring(0, 100));

    // 4. 解析 JSON
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.error("[Director] JSON 解析失败:", content);
        // 简单的自动修复尝试
        if (content.trim().endsWith("}")) {
             throw new Error("AI 返回格式不正确");
        } else {
             throw new Error("AI 返回内容截断，请尝试缩短剧本");
        }
    }

    // 5. 格式标准化
    if (Array.isArray(data)) {
        return { panels: data };
    }
    
    if (!data.panels || !Array.isArray(data.panels)) {
        throw new Error("AI 返回数据缺少 panels 列表");
    }

    return data;

  } catch (error: any) {
    console.error("[Director Runtime Error]", error);
    throw new Error(error.message || "剧本分析服务暂时不可用");
  }
}