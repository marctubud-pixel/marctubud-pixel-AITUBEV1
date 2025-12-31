'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 🔨 强制规则函数 (已同步 Director 逻辑)
function enforceCinematicRules(panels: any[]) {
  return panels.map((panel, index) => {
    const desc = (panel.description || "").trim();
    
    // 1. 标准化 ShotType
    let shotType = (panel.shotType || "MID SHOT").toUpperCase()
      .replace("SHOT", " SHOT").replace("  ", " ").replace("-", " ").trim();

    // 容错标准化
    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";
    if (shotType === "LONG SHOT") shotType = "LONG SHOT";
    if (shotType === "LONGSHOT") shotType = "LONG SHOT";

    // 🛡️ [全景保护机制]
    const isPanorama = desc.includes("全景") || desc.includes("远景") || desc.includes("全身") || desc.includes("大场景") || desc.includes("环境") || desc.includes("背影");

    // 🔍 语义检测
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("站定");
    const isVehicle = desc.includes("车") || desc.includes("驾驶"); 
    
    // ⚠️ 严格化判断
    const isHandSpecific = desc.includes("手部") || desc.includes("指尖") || desc.includes("手掌") || desc.includes("握紧") || (desc.includes("手") && desc.includes("特写")); 
    const isEyeSpecific = desc.includes("眼部") || desc.includes("瞳") || desc.includes("眸") || desc.includes("眼神特写") || (desc.includes("眼") && desc.includes("特写")); 
    const isFootSpecific = desc.includes("脚部") || desc.includes("鞋") || desc.includes("步伐") || desc.includes("积水"); 

    console.log(`[Director Logic] Panel ${index + 1}: "${desc.substring(0, 20)}..." | 全景: ${isPanorama}`);

    // ----------------------------------------------------------------
    // 🛡️ 规则 0：全景优先权
    // ----------------------------------------------------------------
    if (isPanorama) {
        if (shotType.includes("CLOSE")) {
            console.log("⚡️ [Fix] 全景词修正：将 Close-Up 纠正为 Full Shot");
            shotType = "FULL SHOT"; 
        }
    }
    // ----------------------------------------------------------------
    // 🔴 规则 1：车辆/轮胎停止
    // ----------------------------------------------------------------
    else if (isStopping && isVehicle) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of car tires, spinning wheels stopping on asphalt, friction smoke, motion blur, low angle view, detailed rubber texture, cinematic lighting, (no people:2.0).`;
    }
    // ----------------------------------------------------------------
    // 🔴 规则 2：局部特写
    // ----------------------------------------------------------------
    else if (isHandSpecific) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `close-up of hands performing action, detailed fingers, focus on movement, natural lighting, (no face:1.5).`;
    }
    else if (isEyeSpecific) {
      shotType = "EXTREME CLOSE-UP";
      panel.visualPrompt = `extreme close-up of eyes, focus on iris and pupil, emotional expression, catchlight, macro photography.`;
    }
    else if ((isStopping && !isVehicle) || isFootSpecific) {
      shotType = "CLOSE-UP"; 
      panel.visualPrompt = `close-up of feet/shoes on the ground, ground level perspective, low angle view, focus on footwear and surface details, (no upper body:2.0).`;
    }

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
      你是一位电影分镜导演。请将剧本拆解为 JSON 列表。
      JSON 结构: {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
      ShotType 词汇表: EXTREME LONG SHOT, LONG SHOT, FULL SHOT, MID SHOT, CLOSE-UP, EXTREME CLOSE-UP.
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
        temperature: 0.2, 
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

    panels = enforceCinematicRules(panels);

    return { panels };

  } catch (error: any) {
    console.error("[Director Error]", error);
    throw new Error(error.message || "分析服务异常");
  }
}