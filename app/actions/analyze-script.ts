'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 🔨 强制规则函数：AI 不听话，代码来教它做人
function enforceCinematicRules(panels: any[]) {
  return panels.map(panel => {
    const desc = panel.description || "";
    const prompt = (panel.visualPrompt || "").toLowerCase();

    // 规则 1：脚部动作 -> 强制特写/低机位
    if (desc.includes("停下") || desc.includes("脚步") || desc.includes("迈步") || desc.includes("脚踩") || desc.includes("止步")) {
      console.log(`[Director Logic] 检测到脚部关键词: "${desc}" -> 强制修正为特写`);
      
      // 强制修改景别
      panel.shotType = "CLOSE-UP";
      
      // 强制修改提示词，确保画面对准脚
      if (!prompt.includes("feet") && !prompt.includes("shoes")) {
        panel.visualPrompt = `${panel.visualPrompt}, close-up shot of feet, focus on shoes, low angle, ground level view`;
      }
    }

    // 规则 2：眼神/凝视 -> 强制特写
    else if (desc.includes("眼神") || desc.includes("凝视") || desc.includes("盯着") || desc.includes("瞳孔")) {
      console.log(`[Director Logic] 检测到眼神关键词: "${desc}" -> 强制修正为特写`);
      panel.shotType = "CLOSE-UP";
      panel.visualPrompt = `${panel.visualPrompt}, extreme close-up of eyes, focus on facial emotion`;
    }

    // 规则 3：大场景关键词 -> 强制大远景
    else if (desc.includes("全景") || desc.includes("城市") || desc.includes("全貌") || desc.includes("天际线")) {
      if (!desc.includes("人")) { // 只有在不强调具体人的时候才强制
         panel.shotType = "EXTREME LONG SHOT";
      }
    }

    return panel;
  });
}

export async function analyzeScript(scriptText: string) {
  console.log("[Director] 开始分析剧本，长度:", scriptText?.length || 0);

  if (!ARK_API_KEY || !ARK_TEXT_ENDPOINT_ID) {
    throw new Error("服务器配置错误：AI 服务未连接");
  }

  try {
    const systemPrompt = `
      你是一位电影分镜师。将剧本拆解为 JSON 格式的分镜列表。

      必须严格遵守以下 JSON 结构：
      {"panels": [{"description": "...", "visualPrompt": "...", "shotType": "..."}]}

      关于 shotType (景别) 的选择：
      - 宏大场景用 "EXTREME LONG SHOT"
      - 全身动作用 "FULL SHOT"
      - 对话/半身用 "MID SHOT"
      - 局部/表情/脚部动作必须用 "CLOSE-UP"

      不要废话，只返回 JSON。
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
        temperature: 0.1, // 极低温度，追求稳定性
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

    // 🔥 关键一步：在返回给前端之前，执行代码层面的强制修正
    panels = enforceCinematicRules(panels);

    return { panels };

  } catch (error: any) {
    console.error("[Director Error]", error);
    throw new Error(error.message || "分析服务异常");
  }
}