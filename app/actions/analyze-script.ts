'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

/**
 * 🔨 强制规则函数 (Director 3.0：情感与构图隔离版)
 */
function enforceCinematicRules(panels: any[]) {
  return panels.map((panel, index) => {
    const desc = (panel.description || "").trim();
    
    // 1. 标准化 ShotType
    let shotType = (panel.shotType || "MID SHOT").toUpperCase()
      .replace("SHOT", " SHOT").replace("  ", " ").replace("-", " ").trim();

    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";

    // 🛡️ [构图检测] 
    const isBackView = desc.includes("背影") || desc.includes("背对镜头");
    const isEyesClosed = desc.includes("闭眼") || desc.includes("闭着双眼");
    
    // 👁️ [关键：眼部/面部冲突优化]
    // 识别描述情感的词，这些词应该出双眼特写而非瞳孔单眼
    const isEmotionalEyes = desc.includes("眼神") || desc.includes("眼里") || desc.includes("目光") || desc.includes("凝视") || desc.includes("无光");
    const hasFaceContext = desc.includes("面色") || desc.includes("神情") || desc.includes("表情") || desc.includes("脸庞");

    // 🔍 语义探测
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("停止");
    const isHandSpecific = desc.includes("手部") || (desc.includes("手") && desc.includes("特写")); 
    
    console.log(`[Director Logic] Panel ${index + 1}: 情感眼部: ${isEmotionalEyes} | 关联面部: ${hasFaceContext}`);

    // ----------------------------------------------------------------
    // 🛡️ 规则 0：情感窗口锁定 (解决单眼特写问题)
    // ----------------------------------------------------------------
    if (isEmotionalEyes) {
        // 如果有“眼里”描述，强制降级景别到 CLOSE-UP，并强调“双眼”
        console.log(`⚡️ [Fix] 情感眼部：强制双眼特写，防止单眼瞳孔幻觉`);
        shotType = "CLOSE-UP"; 
        panel.visualPrompt = `${desc}, focus on both eyes, upper face focus, cinematic lighting, catchlight, (both eyes visible:1.5), (no macro shot:1.8), expressive gaze.`;
        
        // 如果同时提到了面色，则进一步扩大范围
        if (hasFaceContext) {
            panel.visualPrompt += ` focus on overall facial expression, (head and shoulders:1.2).`;
        }
    }
    // ----------------------------------------------------------------
    // 🛡️ 规则 1：姿态/表情隔离 (维持之前背影/闭眼逻辑)
    // ----------------------------------------------------------------
    else if (isBackView) {
        panel.visualPrompt = `${desc}, back view, view from behind, (no face:2.0), (looking away:1.5).`;
        shotType = "FULL SHOT"; 
    }
    else if (isEyesClosed) {
        panel.visualPrompt = `${desc}, eyes tightly closed, shut eyes, (no smile:2.0), (no laughter:2.0).`;
        shotType = "CLOSE-UP";
    }
    // ----------------------------------------------------------------
    // 🔴 规则 2：特写逻辑 (逻辑守恒)
    // ----------------------------------------------------------------
    else if (isHandSpecific) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `close-up of hands, detailed fingers, (no face:1.5).`;
    }
    else if (isStopping && desc.includes("车")) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of tires stopping, (no people:2.0).`;
    }

    panel.shotType = shotType;
    return panel;
  });
}

export async function analyzeScript(scriptText: string) {
  console.log("[Director] 分析请求长度:", scriptText?.length || 0);

  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) throw new Error("Missing API Key");

  try {
    const systemPrompt = `
      你是一位电影分镜导演。请将剧本拆解为 JSON 列表。
      JSON 结构: {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
      ShotType: EXTREME LONG SHOT, LONG SHOT, FULL SHOT, MID SHOT, CLOSE-UP, EXTREME CLOSE-UP.
    `;

    const response = await fetch(ARK_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
      body: JSON.stringify({
        model: ARK_TEXT_ENDPOINT_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `拆解剧本：${scriptText}` }
        ],
        temperature: 0.2, 
        max_tokens: 4000
      }),
      cache: 'no-store' 
    });

    const resJson = await response.json();
    if (!response.ok) throw new Error(resJson.error?.message || "API Error");

    let content = resJson.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
    
    let data = JSON.parse(content);
    let panels = Array.isArray(data) ? data : data.panels;

    panels = enforceCinematicRules(panels);

    return { panels };

  } catch (error: any) {
    console.error("[Director Error]", error);
    throw new Error(error.message || "分析服务异常");
  }
}