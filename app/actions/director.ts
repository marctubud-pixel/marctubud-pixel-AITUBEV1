'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 🔨 强制规则函数：代码级修正 (极度防御版)
function enforceCinematicRules(panels: any[]) {
  if (!Array.isArray(panels)) return [];

  return panels.map((panel, index) => {
    // 🛡️ 防御措施 1：强制转为字符串，防止 AI 返回 null/undefined/number 导致崩溃
    const desc = String(panel.description || "").trim();
    let rawShotType = String(panel.shotType || "MID SHOT"); // 👈 关键修复：强制 String()
    let prompt = String(panel.visualPrompt || "").toLowerCase();

    // 1. 标准化 ShotType
    let shotType = rawShotType.toUpperCase()
      .replace("SHOT", " SHOT")
      .replace("  ", " ")
      .replace("-", " ")
      .trim();

    // 容错映射
    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";
    if (shotType === "LONG SHOT") shotType = "LONG SHOT";
    if (shotType === "LONGSHOT") shotType = "LONG SHOT";

    console.log(`[Director Logic] Panel ${index + 1} | Desc: "${desc.substring(0, 10)}..." | Shot: ${shotType}`);

    // 🔍 语义检测
    const isStopping = desc.includes("停下") || desc.includes("止步") || desc.includes("刹车") || desc.includes("停止") || desc.includes("不动了") || desc.includes("站定");
    const isVehicle = desc.includes("车") || desc.includes("轮") || desc.includes("驾驶");
    const isHand = desc.includes("手") || desc.includes("指") || desc.includes("拿") || desc.includes("握");
    const isEye = desc.includes("眼") || desc.includes("视") || desc.includes("盯") || desc.includes("看") || desc.includes("瞳");
    const isFoot = desc.includes("脚") || desc.includes("鞋") || desc.includes("迈") || desc.includes("走");

    // 🔴 场景 1：车辆/轮胎停止 -> 强制轮胎特写
    if (isStopping && isVehicle) {
      console.log(`⚡️ [Override] 检测到车辆停止 -> 强制轮胎特写`);
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of car tires, spinning wheels stopping on asphalt, friction, motion blur, low angle view, detailed texture of rubber and road, cinematic lighting.`;
    }

    // 🔴 场景 2：手部动作 -> 强制手部特写
    else if (isHand) {
      console.log(`⚡️ [Override] 检测到手部动作 -> 强制手部特写`);
      shotType = "CLOSE-UP";
      panel.visualPrompt = `close-up of hands performing action, detailed fingers, focus on the movement and interaction, natural lighting.`;
    }

    // 🔴 场景 3：眼神/凝视 -> 强制眼部特写
    else if (isEye) {
      console.log(`⚡️ [Override] 检测到眼神 -> 强制眼部特写`);
      shotType = "CLOSE-UP";
      panel.visualPrompt = `extreme close-up of eyes, focus on the iris and pupil, detailed expression of emotion, catchlight in eyes.`;
    }

    // 🔴 场景 4：人物停止/脚部动作 -> 强制脚部特写
    else if ((isStopping && !isVehicle) || isFoot) {
      console.log(`⚡️ [Override] 检测到人物脚部/停止 -> 强制脚部特写`);
      shotType = "CLOSE-UP"; 
      panel.visualPrompt = `close-up of feet coming to a stop on the ground, focus on shoes and lower legs, low angle view, ground level perspective.`;
    }

    // 将修正后的值写回
    panel.shotType = shotType;
    // 这里的 panel.visualPrompt 已经在上面直接修改了，无需再次赋值
    return panel;
  });
}

export async function analyzeScript(scriptText: string) {
  console.log("[Director] 开始分析剧本，长度:", scriptText?.length || 0);

  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) {
    console.error("[Director] 错误: 缺失 API Key 或 Endpoint ID");
    throw new Error("服务器配置错误：AI 服务未连接");
  }

  try {
    const systemPrompt = `
      你是一位经验丰富的电影分镜导演。你的任务是将用户的剧本拆解为 JSON 格式的分镜列表。

      ### 核心原则
      1. **动作拆分**：长难句必须拆分为独立镜头。
      2. **视觉翻译**：Visual Prompt 必须包含具体细节。
      3. **景别推断**：
         - 脚部动作/局部动作 -> 必须用 "CLOSE-UP"。
         - 宏大场景 -> "EXTREME LONG SHOT"。
         - 全身动作 -> "FULL SHOT"。
      
      返回格式: {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}
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
          { role: "user", content: `请拆解以下剧本：\n\n${scriptText}` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
      cache: 'no-store' 
    });

    const resJson = await response.json();
    if (!response.ok) throw new Error(resJson.error?.message || `HTTP Error ${response.status}`);

    let content = resJson.choices?.[0]?.message?.content || "";
    // 清洗 Markdown
    content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();
    
    // 🛡️ 防御措施 2：JSON 解析兜底
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.error("[Director JSON Error]", content);
        // 如果只是结尾少了括号，尝试抢救一下
        if (content.trim().lastIndexOf("}") !== content.trim().length - 1) {
            try {
                data = JSON.parse(content + "}]}"); // 极其简陋的修复尝试
            } catch(e2) {
                throw new Error("AI 返回数据格式错误，请重试");
            }
        } else {
            throw new Error("AI 返回数据无法解析");
        }
    }

    const panels = Array.isArray(data) ? data : data.panels;
    
    // 🛡️ 防御措施 3：确保 panels 必须是数组
    if (!panels || !Array.isArray(panels)) {
        console.error("[Director Data Error] Missing panels array", data);
        // 如果 AI 返回了奇怪的结构，甚至可以尝试返回一个空数组或者报错
        throw new Error("AI 返回数据结构缺失 panels");
    }

    // 🔥 执行强制修正
    const finalPanels = enforceCinematicRules(panels);

    return { panels: finalPanels };

  } catch (error: any) {
    console.error("[Director Runtime Error]", error);
    // 抛出普通 Error，Next.js 会在客户端捕获
    throw new Error(error.message || "剧本分析服务暂时不可用");
  }
}