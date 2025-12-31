'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 🔨 强制规则函数：根据主语类型进行针对性修正 (已同步最新防幻觉逻辑)
function enforceCinematicRules(panels: any[]) {
  return panels.map((panel, index) => {
    const desc = (panel.description || "").trim();
    // 标准化 ShotType
    let shotType = (panel.shotType || "MID SHOT").toUpperCase().replace("SHOT", " SHOT").replace("  ", " ").trim();
    let prompt = (panel.visualPrompt || "").toLowerCase();

    // 容错处理
    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";
    if (shotType === "LONGSHOT") shotType = "LONG SHOT";

    console.log(`[Panel ${index}] 分析: "${desc}" | 原始Shot: ${shotType}`);

    // 🛡️ [全景保护]
    const isPanorama = desc.includes("全景") || desc.includes("远景") || desc.includes("全身") || desc.includes("大场景") || desc.includes("环境") || desc.includes("背影") || shotType === "EXTREME LONG SHOT" || shotType === "FULL SHOT";

    // 🔍 关键词检测
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("不动了");
    const isVehicle = desc.includes("车") || desc.includes("驾驶");
    
    // 严格化判断
    const isHandSpecific = desc.includes("手部") || desc.includes("指尖") || desc.includes("手掌") || (desc.includes("手") && desc.includes("特写"));
    const isEyeSpecific = desc.includes("眼部") || desc.includes("瞳") || desc.includes("眸") || (desc.includes("眼") && desc.includes("特写"));

    // 🔴 场景 1：车辆/轮胎停止 -> 强制轮胎特写 (最高优先级)
    if (isStopping && isVehicle) {
      console.log(`⚡️ [Override] 检测到车辆停止 -> 强制轮胎特写`);
      shotType = "CLOSE-UP";
      if (!prompt.includes("tire") && !prompt.includes("wheel")) {
        panel.visualPrompt = `${panel.visualPrompt}, extreme close-up of car tires, spinning wheels stopping, friction with asphalt, motion blur, low angle, (no people:2.0)`;
      }
    }

    // 🔴 场景 2：手部动作 -> 强制手部特写 (受全景保护)
    else if (isHandSpecific && !isPanorama) {
      console.log(`⚡️ [Override] 检测到手部特写意图 -> 强制手部特写`);
      shotType = "CLOSE-UP";
      if (!prompt.includes("hand")) {
        panel.visualPrompt = `${panel.visualPrompt}, close-up of hands, detailed fingers, focus on action`;
      }
    }

    // 🔴 场景 3：眼神/凝视 -> 强制眼部特写 (受全景保护)
    else if (isEyeSpecific && !isPanorama) {
      console.log(`⚡️ [Override] 检测到眼部特写意图 -> 强制眼部特写`);
      shotType = "CLOSE-UP";
      if (!prompt.includes("eye")) {
        panel.visualPrompt = `${panel.visualPrompt}, extreme close-up of eyes, focus on iris, emotional expression`;
      }
    }

    // 🔴 场景 4：人物停止 -> 强制脚部特写 (受全景保护)
    else if (isStopping && !isVehicle && !isPanorama) {
      console.log(`⚡️ [Override] 检测到人物停止 -> 强制脚部特写`);
      shotType = "CLOSE-UP";
      if (!prompt.includes("feet") && !prompt.includes("shoes")) {
        panel.visualPrompt = `${panel.visualPrompt}, close-up of feet coming to a stop, focus on shoes, ground level view, low angle`;
      }
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
      你是一位分镜导演。请将剧本拆解为 JSON 列表。
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

    // 🔥 执行同步后的修正逻辑
    panels = enforceCinematicRules(panels);

    return { panels };

  } catch (error: any) {
    console.error("[Director Error]", error);
    throw new Error(error.message || "分析服务异常");
  }
}