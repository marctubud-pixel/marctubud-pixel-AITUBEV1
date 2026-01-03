'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

function enforceCinematicRules(panels: any[]) {
  // 🟢 [深度优化] 语义连贯性：检测剧本整体是否以“空镜/无人”场景开场
  const hasInitialEmptyScene = panels.length > 0 && 
    (panels[0].description.includes("空旷") || 
     panels[0].description.includes("空无一人") || 
     panels[0].description.includes("无人") || 
     panels[0].description.includes("纯景"));

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

    // 🛡️ [升级] 全景/空镜保护机制
    const isEmptyScene = desc.includes("空无一人") || desc.includes("空旷") || desc.includes("无人") || desc.includes("纯景");
    
    // 🔗 [新增] 语义连贯性判定：若开头是空镜且本段描述未提及其它角色，则判定为上下文空镜
    const isContextualEmpty = hasInitialEmptyScene && 
                              !desc.includes("人") && 
                              !desc.includes("他") && 
                              !desc.includes("她") && 
                              !desc.includes("少女") && 
                              !desc.includes("男");

    const isPanorama = desc.includes("全景") || desc.includes("远景") || desc.includes("全身") || desc.includes("大场景") || desc.includes("环境") || desc.includes("背影") || isEmptyScene || isContextualEmpty;

    // 🔍 语义检测 (手、眼、脚特写)
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("站定");
    const isVehicle = desc.includes("车") || desc.includes("驾驶"); 
    const isHandSpecific = desc.includes("手部") || desc.includes("指尖") || desc.includes("手掌") || desc.includes("握紧") || (desc.includes("手") && desc.includes("特写")); 
    const isEyeSpecific = desc.includes("眼部") || desc.includes("瞳") || desc.includes("眸") || desc.includes("眼神特写") || (desc.includes("眼") && desc.includes("特写")); 
    const isFootSpecific = desc.includes("脚部") || desc.includes("鞋") || desc.includes("步伐") || desc.includes("积水"); 

    console.log(`[Director Logic] Panel ${index + 1}: "${desc.substring(0, 20)}..." | 全景/空镜: ${isPanorama}`);

    // ----------------------------------------------------------------
    // 🛡️ 规则 0：全景/空镜优先权 (Panorama & Semantic Continuity Authority)
    // ----------------------------------------------------------------
    if (isPanorama) {
        // 如果检测到是显式空镜或大景别需求，强制锁定 EXTREME WIDE SHOT
        if (isEmptyScene || (isPanorama && !shotType.includes("CLOSE") && !shotType.includes("MID"))) {
            console.log("⚡️ [Fix] 空镜/全景修正：强制锁定 EXTREME WIDE SHOT 以压制人像");
            shotType = "EXTREME WIDE SHOT"; 
        }
        
        // 针对所有空镜或上下文空镜，强制注入视觉引导，封杀人像
        if (isEmptyScene || isContextualEmpty) {
            panel.visualPrompt = `${desc}, monochrome sketch, cinematic lineart, vast environment, (no people:2.0), (empty scene:1.5).`;
        }
    }

    // ----------------------------------------------------------------
    // 🔴 规则 1：车辆/轮胎停止 (逻辑守恒)
    // ----------------------------------------------------------------
    else if (isStopping && isVehicle) {
      console.log(`⚡️ [Override] 检测到车辆停止 -> 强制轮胎特写`);
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of car tires, spinning wheels stopping on asphalt, friction smoke, motion blur, low angle view, detailed rubber texture, cinematic lighting, (no people:2.0).`;
    }

    // ----------------------------------------------------------------
    // 🔴 规则 2：肢体特写逻辑 (逻辑守恒)
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
      console.log(`⚡️ [Override] 检测到人物停下/脚步 -> 强制脚部特写`);
      shotType = "CLOSE-UP"; 
      panel.visualPrompt = `close-up of feet/shoes on the ground, ground level perspective, low angle view, focus on footwear and surface details, (no upper body:2.0).`;
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