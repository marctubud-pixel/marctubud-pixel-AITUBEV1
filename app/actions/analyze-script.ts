'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 🔨 强制规则函数：标准化 + 暴力修正
function enforceCinematicRules(panels: any[]) {
  return panels.map((panel, index) => {
    const desc = (panel.description || "").trim();
    // 🔍 预处理：标准化 shotType 为全大写，防止前端匹配失败
    let shotType = (panel.shotType || "MID SHOT").toUpperCase().replace("SHOT", " SHOT").replace("  ", " ").trim();
    let prompt = (panel.visualPrompt || "").toLowerCase();

    // 日志追踪：看看原始数据是啥
    console.log(`[Panel ${index}] 原始: ${shotType} | 描述: ${desc}`);

    // 🔴 规则 1：脚部动作 -> 强制特写
    // 扩充了关键词库，防止漏网之鱼
    if (
        desc.includes("停下") || desc.includes("脚步") || desc.includes("迈步") || 
        desc.includes("脚踩") || desc.includes("止步") || desc.includes("走动") ||
        desc.includes("站定") || desc.includes("鞋")
    ) {
      console.log(`⚡️ [Override] 触发脚部特写规则 -> 修正为 CLOSE-UP`);
      shotType = "CLOSE-UP";
      
      if (!prompt.includes("feet") && !prompt.includes("shoes")) {
        panel.visualPrompt = `${panel.visualPrompt}, close-up shot of feet, focus on shoes, low angle, ground level view`;
      }
    }

    // 🔴 规则 2：眼神/凝视 -> 强制特写
    else if (desc.includes("眼神") || desc.includes("凝视") || desc.includes("盯着") || desc.includes("瞳孔") || desc.includes("看")) {
      console.log(`⚡️ [Override] 触发眼神特写规则 -> 修正为 CLOSE-UP`);
      shotType = "CLOSE-UP";
      panel.visualPrompt = `${panel.visualPrompt}, extreme close-up of eyes, focus on facial emotion`;
    }

    // 🔴 规则 3：标准化修正 (容错处理)
    // 防止 AI 返回 "Close Up" (没横杠) 导致前端匹配不上
    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";
    if (shotType === "LONGSHOT") shotType = "LONG SHOT";

    // 赋值回 panel
    panel.shotType = shotType;
    return panel;
  });
}

export async function analyzeScript(scriptText: string) {
  console.log("[Director] 收到分析请求，长度:", scriptText?.length || 0);

  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) {
    throw new Error("配置错误：Missing API Key");
  }

  try {
    const systemPrompt = `
      你是一位分镜导演。请将剧本拆解为 JSON 列表。
      JSON 结构: {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
      
      ShotType 词汇表 (必须精准):
      - EXTREME LONG SHOT
      - LONG SHOT
      - FULL SHOT
      - MID SHOT
      - CLOSE-UP
      - EXTREME CLOSE-UP

      **关键指令**：遇到“停下脚步”、“迈步”等脚部动作，ShotType 必须填 "CLOSE-UP"。
    `;

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
          { role: "user", content: `拆解剧本：${scriptText}` }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
      cache: 'no-store' 
    });

    const resJson = await response.json();
    if (!response.ok) throw new Error(resJson.error?.message || "API Error");

    let content = resJson.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
    
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        if (content.trim().endsWith("}")) throw new Error("AI 返回格式错误");
        else throw new Error("AI 内容截断");
    }

    let panels = Array.isArray(data) ? data : data.panels;
    if (!panels || !Array.isArray(panels)) throw new Error("数据格式错误");

    // 🔥 执行增强版修正
    panels = enforceCinematicRules(panels);

    // 打印最终结果，方便你去 Vercel Logs 查看
    console.log("[Director] 最终输出 Panels:", JSON.stringify(panels, null, 2));

    return { panels };

  } catch (error: any) {
    console.error("[Director Error]", error);
    throw new Error(error.message || "分析服务异常");
  }
}