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

    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";
    if (shotType === "LONG SHOT") shotType = "LONG SHOT";
    if (shotType === "LONGSHOT") shotType = "LONG SHOT";

    let prompt = (panel.visualPrompt || "").toLowerCase();

    // 🔍 语义检测
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("不动了") || desc.includes("站定");
    const isVehicle = desc.includes("车") || desc.includes("轮") || desc.includes("驾驶");
    const isHand = desc.includes("手") || desc.includes("指") || desc.includes("握") || desc.includes("拿");
    const isEye = desc.includes("眼") || desc.includes("视") || desc.includes("盯") || desc.includes("瞳");
    
    // 🔥 关键修正：移除 "走"、"迈" 等通用动词，防止普通行走被判为脚部特写
    const isFootSpecific = desc.includes("脚部") || desc.includes("鞋") || desc.includes("踩"); 

    console.log(`[Director Logic] Panel ${index + 1}: "${desc}" -> 原始: ${shotType}`);

    // 🔴 场景 1：车辆/轮胎停止 -> 强制轮胎特写
    if (isStopping && isVehicle) {
      shotType = "CLOSE-UP";
      // 覆盖 Prompt：确保只描述车轮，不描述人
      panel.visualPrompt = `extreme close-up of car tires, spinning wheels stopping on asphalt, friction smoke, motion blur, low angle view, detailed rubber texture, cinematic lighting, (no people:2.0).`;
    }

    // 🔴 场景 2：手部动作 -> 强制手部特写
    else if (isHand) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `close-up of hands performing action, detailed fingers, focus on movement, natural lighting.`;
    }

    // 🔴 场景 3：眼神/凝视 -> 强制眼部特写
    else if (isEye) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of eyes, focus on iris and pupil, emotional expression, catchlight.`;
    }

    // 🔴 场景 4：人物"停下" -> 强制脚部特写
    // 注意：只有"停下"才特写，普通的"行走"保持原样(通常是Full Shot)
    else if (isStopping && !isVehicle) {
      console.log(`⚡️ [Override] 检测到人物停下 -> 强制脚部特写`);
      shotType = "CLOSE-UP"; 
      panel.visualPrompt = `close-up of feet coming to a stop on the ground, focus on shoes and lower legs, low angle view, ground level perspective.`;
    }
    
    // 🔴 场景 5：明确的脚部描写 -> 强制特写
    else if (isFootSpecific) {
        shotType = "CLOSE-UP";
    }

    panel.shotType = shotType;
    return panel;
  });
}

// ... (analyzeScript 函数保持不变，直接复用即可，确保调用了 enforceCinematicRules)
export async function analyzeScript(scriptText: string) {
  // ... (保留之前的代码)
  // 核心逻辑:
  // const finalPanels = enforceCinematicRules(panels);
  // return { panels: finalPanels };
  
  // 为了确保代码完整，这里重复一下 analyzeScript 的核心部分
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