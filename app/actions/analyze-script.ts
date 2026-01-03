'use server'

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const ARK_TEXT_ENDPOINT_ID = process.env.VOLC_TEXT_ENDPOINT_ID;
const ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

function enforceCinematicRules(panels: any[]) {
  return panels.map((panel, index) => {
    const desc = (panel.description || "").trim();
    
    let shotType = (panel.shotType || "MID SHOT").toUpperCase()
      .replace("SHOT", " SHOT").replace("  ", " ").replace("-", " ").trim();

    if (shotType === "CLOSE UP") shotType = "CLOSE-UP";
    if (shotType === "EXTREME CLOSE UP") shotType = "EXTREME CLOSE-UP";

    const isBackView = desc.includes("背影") || desc.includes("背对镜头");
    const isEyesClosed = desc.includes("闭眼") || desc.includes("闭着双眼");
    const isFullFaceRequest = /面部|脸上|满脸|神情|脸庞|面色/.test(desc);
    const isEmotionalEyes = desc.includes("眼神") || desc.includes("眼里") || desc.includes("目光") || desc.includes("凝视") || desc.includes("无光");
    const isPanorama = desc.includes("全景") || desc.includes("远景") || desc.includes("全身") || desc.includes("大场景");
    const isStopping = desc.includes("停下") || desc.includes("止步"); 
    const isHandSpecific = desc.includes("手部") || (desc.includes("手") && desc.includes("特写")); 
    const isFootSpecific = desc.includes("脚部") || desc.includes("鞋"); 

    console.log(`[Director] Panel ${index+1}: 背影:${isBackView} | 面部:${isFullFaceRequest}`);

    if (isFullFaceRequest) {
        shotType = "CLOSE-UP";
        // ✅ 移除 'two eyes'，改用 'solo' + 'detailed eyes'
        panel.visualPrompt = `${desc}, (solo:2.0), focus on full face, detailed eyes, center composition, (no macro shot:1.5).`;
    }
    else if (isEmotionalEyes) {
        shotType = "CLOSE-UP"; 
        // ✅ 移除 'two eyes'
        panel.visualPrompt = `${desc}, (solo:2.0), detailed eyes, upper face focus, expressive gaze, (no single eye:2.0).`;
    }
    else if (isBackView) {
        // ✅ 增强背影描述
        panel.visualPrompt = `${desc}, (solo:2.0), back view, (view from behind:1.5), (back of head:1.5), (no face:2.0), (looking away:2.0).`;
        shotType = "FULL SHOT"; 
    }
    else if (isEyesClosed) {
        panel.visualPrompt = `${desc}, (solo:2.0), eyes tightly closed, shut eyes, (no smile:2.0).`;
        shotType = "CLOSE-UP";
    }
    else if (isPanorama) { if (shotType.includes("CLOSE")) shotType = "FULL SHOT"; }
    else if (isStopping && desc.includes("车")) { shotType = "CLOSE-UP"; panel.visualPrompt = `extreme close-up of car tires, spinning wheels, (no people:2.0).`; }
    else if (isHandSpecific) { shotType = "CLOSE-UP"; panel.visualPrompt = `close-up of hands, (no face:1.5).`; }
    else if (isFootSpecific) { shotType = "CLOSE-UP"; panel.visualPrompt = `close-up of feet on ground, (no upper body:2.0).`; }

    panel.shotType = shotType;
    return panel;
  });
}

// ... analyzeScript 主函数与之前版本一致，只需确保调用 enforceCinematicRules 即可
// 为节省篇幅，请保留 analyzeScript 的 API 调用部分
export async function analyzeScript(scriptText: string) {
    // ... (请复制之前的 API 调用代码)
    // 确保包含: panels = enforceCinematicRules(panels);
  console.log("[Director] 分析请求长度:", scriptText?.length || 0);

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