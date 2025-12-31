'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

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

    // 🛡️ [新增] 全景保护机制 (Panorama Protection)
    // 如果描述中包含这些词，说明用户想要大景别，绝对不要自动裁剪成特写
    const isPanorama = desc.includes("全景") || desc.includes("远景") || desc.includes("全身") || desc.includes("大场景") || desc.includes("环境") || desc.includes("背影") || shotType === "EXTREME LONG SHOT" || shotType === "FULL SHOT";

    // 🔍 语义检测 (清洗后的关键词)
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("站定");
    const isVehicle = desc.includes("车") || desc.includes("驾驶"); 
    
    // ⚠️ [修正] 严格化判断：移除 "拿"、"指"、"看"、"视" 等通用动词，防止误判
    // 只有出现明确的"部位+特写"意图时才触发
    const isHandSpecific = desc.includes("手部") || desc.includes("指尖") || desc.includes("手掌") || desc.includes("握紧") || (desc.includes("手") && desc.includes("特写")); 
    const isEyeSpecific = desc.includes("眼部") || desc.includes("瞳") || desc.includes("眸") || desc.includes("眼神特写") || (desc.includes("眼") && desc.includes("特写")); 
    
    // 🔥 [修正] 只有明确提到脚/鞋，或者"停下"且非车辆时才触发
    const isFootSpecific = desc.includes("脚部") || desc.includes("鞋") || desc.includes("步伐"); 

    console.log(`[Director Logic] Panel ${index + 1}: "${desc}" -> 原始: ${shotType} | 全景保护: ${isPanorama}`);

    // ----------------------------------------------------------------
    // 🔴 场景 1：车辆/轮胎停止 -> 强制轮胎特写 (优先级最高)
    // ----------------------------------------------------------------
    if (isStopping && isVehicle) {
      console.log(`⚡️ [Override] 检测到车辆停止 -> 强制轮胎特写`);
      shotType = "CLOSE-UP";
      // 覆盖 Prompt：确保只描述车轮，不描述人
      panel.visualPrompt = `extreme close-up of car tires, spinning wheels stopping on asphalt, friction smoke, motion blur, low angle view, detailed rubber texture, cinematic lighting, (no people:2.0).`;
    }

    // ----------------------------------------------------------------
    // 🛡️ 以下场景受 isPanorama 保护：如果是全景，不强制转特写
    // ----------------------------------------------------------------
    
    // 🔴 场景 2：手部特写 (仅当非全景且有明确手部描述时)
    else if (isHandSpecific && !isPanorama) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `close-up of hands performing action, detailed fingers, focus on movement, natural lighting.`;
    }

    // 🔴 场景 3：眼部特写 (仅当非全景且有明确眼部描述时)
    else if (isEyeSpecific && !isPanorama) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of eyes, focus on iris and pupil, emotional expression, catchlight.`;
    }

    // 🔴 场景 4：人物"停下" -> 强制脚部特写
    // 逻辑：人停下 + 不是车 + 不是全景描述 (例如"他在夕阳下的全景中停下"不应变特写)
    else if (isStopping && !isVehicle && !isPanorama) {
      console.log(`⚡️ [Override] 检测到人物停下 -> 强制脚部特写`);
      shotType = "CLOSE-UP"; 
      panel.visualPrompt = `close-up of feet coming to a stop on the ground, focus on shoes and lower legs, low angle view, ground level perspective.`;
    }
    
    // 🔴 场景 5：明确的脚部描写
    else if (isFootSpecific && !isPanorama) {
        shotType = "CLOSE-UP";
    }

    panel.shotType = shotType;
    return panel;
  });
}

export async function analyzeScript(scriptText: string) {
  console.log("[Director] 开始分析剧本:", scriptText.substring(0, 20));
  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) throw new Error("Missing API Key");

  const systemPrompt = `
    你是一位电影分镜导演。请将剧本拆解为 JSON 格式的分镜列表。
    JSON: {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
    ShotType: EXTREME LONG SHOT, LONG SHOT, FULL SHOT, MID SHOT, CLOSE-UP, EXTREME CLOSE-UP.
    原则：
    - "行走" 通常是 FULL SHOT。
    - "停下" 通常是 CLOSE-UP (脚部)。
    - "宏大场景" 是 EXTREME LONG SHOT。
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
        temperature: 0.3
      })
  });

  const resJson = await response.json();
  let content = resJson.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
  let data = JSON.parse(content);
  const panels = Array.isArray(data) ? data : data.panels;

  const finalPanels = enforceCinematicRules(panels);
  return { panels: finalPanels };
}