'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

/**
 * 🔨 强制规则函数 (Director 核心逻辑)
 * 专门针对测试场景 A (背影) 与 场景 B (表情) 进行了语义隔离加固
 */
function enforceCinematicRules(panels: any[]) {
  return panels.map((panel, index) => {
    const desc = (panel.description || "").trim();
    
    // 1. 标准化 ShotType (景别标准化)
    let shotType = (panel.shotType || "MID SHOT").toUpperCase()
      .replace("SHOT", " SHOT").replace("  ", " ").replace("-", " ").trim();

    // 容错处理
    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";
    if (shotType === "LONG SHOT") shotType = "LONG SHOT";
    if (shotType === "LONGSHOT") shotType = "LONG SHOT";

    // 🛡️ [构图检测升级] 识别背影与闭眼
    const isBackView = desc.includes("背影") || desc.includes("背对镜头");
    const isEyesClosed = desc.includes("闭眼") || desc.includes("闭着双眼") || desc.includes("闭目");
    const isPanorama = desc.includes("全景") || desc.includes("远景") || desc.includes("全身") || desc.includes("大场景") || desc.includes("环境") || isBackView;

    // 🔍 语义探测逻辑
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("站定");
    const isVehicle = desc.includes("车") || desc.includes("驾驶"); 
    const isHandSpecific = desc.includes("手部") || desc.includes("指尖") || desc.includes("手掌") || desc.includes("握紧") || (desc.includes("手") && desc.includes("特写")); 
    const isEyeSpecific = desc.includes("眼部") || desc.includes("瞳") || desc.includes("眸") || desc.includes("眼神特写") || (desc.includes("眼") && desc.includes("特写")) || isEyesClosed; 
    const isFootSpecific = desc.includes("脚部") || desc.includes("鞋") || desc.includes("步伐") || desc.includes("积水"); 

    console.log(`[Director Logic] Panel ${index + 1}: "${desc.substring(0, 20)}..." | 背影: ${isBackView} | 闭眼: ${isEyesClosed}`);

    // ----------------------------------------------------------------
    // 🛡️ 规则 0：姿态与表情锚点锁定 (针对场景 A & B)
    // ----------------------------------------------------------------
    if (isBackView) {
        // 🔒 场景 A 补丁：强制锁定背影，在 Prompt 层面封杀“脸”的出现
        console.log(`⚡️ [Fix] 检测到背影：注入构图隔离指令`);
        panel.visualPrompt = `${desc}, back view, view from behind, from back, (no face:2.0), (looking away:1.5), (back to camera:2.0).`;
        shotType = "FULL SHOT"; 
    }
    else if (isEyesClosed) {
        // 🔒 场景 B 补丁：强制锁定闭眼，在 Prompt 层面封杀“笑容”的渗透
        console.log(`⚡️ [Fix] 检测到闭眼需求：注入情感隔离指令`);
        panel.visualPrompt = `${desc}, eyes tightly closed, shut eyes, serious expression, (no smile:2.0), (no laughter:2.0).`;
        shotType = "CLOSE-UP";
    }
    // ----------------------------------------------------------------
    // 🔴 规则 1：全景/空镜优先权
    // ----------------------------------------------------------------
    else if (isPanorama) {
        if (shotType.includes("CLOSE")) {
            console.log("⚡️ [Fix] 全景词修正：将 Close-Up 纠正为 Full Shot");
            shotType = "FULL SHOT"; 
        }
    }
    // ----------------------------------------------------------------
    // 🔴 规则 2：特写逻辑 (保持逻辑守恒)
    // ----------------------------------------------------------------
    else if (isStopping && isVehicle) {
      console.log(`⚡️ [Override] 检测到车辆停止 -> 强制轮胎特写`);
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of car tires, spinning wheels stopping on asphalt, friction smoke, motion blur, (no people:2.0).`;
    }
    else if (isHandSpecific) {
      shotType = "CLOSE-UP";
      panel.visualPrompt = `close-up of hands performing action, detailed fingers, (no face:1.5).`;
    }
    else if ((isStopping && !isVehicle) || isFootSpecific) {
      shotType = "CLOSE-UP"; 
      panel.visualPrompt = `close-up of feet/shoes on the ground, ground level perspective, (no upper body:2.0).`;
    }

    panel.shotType = shotType;
    return panel;
  });
}

/**
 * 主函数：解析剧本并生成分镜
 */
export async function analyzeScript(scriptText: string) {
  console.log("[Director] 收到分析请求，长度:", scriptText?.length || 0);

  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) {
    throw new Error("配置错误：Missing API Key");
  }

  try {
    const systemPrompt = `
      你是一位电影分镜导演。请将剧本拆解为 JSON 格式的分镜列表。
      JSON 结构: {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
      ShotType 词汇表: EXTREME LONG SHOT, LONG SHOT, FULL SHOT, MID SHOT, CLOSE-UP, EXTREME CLOSE-UP.
      注意：必须严格返回有效的 JSON 格式，不要包含 Markdown 标记。
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
    // 清理可能存在的 Markdown 代码块标记
    content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
    
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.error("JSON 解析失败，原始内容:", content);
        if (content.trim().endsWith("}")) throw new Error("AI 返回格式错误");
        else throw new Error("AI 内容截断");
    }

    let panels = Array.isArray(data) ? data : data.panels;
    if (!panels || !Array.isArray(panels)) throw new Error("数据格式错误：无法解析分镜列表");

    // 核心步骤：应用电影工业级强制规则
    panels = enforceCinematicRules(panels);

    return { panels };

  } catch (error: any) {
    console.error("[Director Error]", error);
    throw new Error(error.message || "分析服务异常");
  }
}