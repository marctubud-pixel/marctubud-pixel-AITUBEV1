'use server'

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// ============================================================
// 🔥 强制代理补丁 (保留你的配置)
// ============================================================
if (process.env.NODE_ENV === 'development') {
  try {
    const proxyUrl = 'http://127.0.0.1:7890';
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
  } catch (err) {
    console.error('代理设置失败:', err);
  }
}

const ai = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_API_KEY
});

// ✅ 更新数据结构：增加 svgCode 字段
export interface ScriptBreakdown {
  panels: {
    sceneNumber: string;
    description: string;
    shotType: string;
    visualPrompt: string;
    svgCode: string; // 新增：SVG 代码字符串
  }[];
}

export const analyzeScript = async (script: string): Promise<ScriptBreakdown> => {
  const model = "gemini-2.0-flash-exp"; 
  
  // ✅ 核心修改：让 AI 学会写 SVG
  const systemInstruction = `
    You are a professional storyboard artist. Analyze the script and break it down into 4 key visual panels.
    
    For each panel:
    1. Determine the Shot Type (CS, MS, LS).
    2. Write a Stable Diffusion prompt.
    3. **CRITICAL TASK**: Generate a simple, abstract SVG string (<svg>...</svg>) to represent the COMPOSITION and BLOCKING of the shot.
       - Use a 16:9 viewBox="0 0 160 90".
       - Use simple strokes (black) and no fill (or white fill) to mimic a rough pencil sketch.
       - Use rectangles/circles to represent characters and lines for perspective/background.
       - Keep the SVG code concise (under 500 characters if possible).
       - Do NOT use markdown code blocks for the SVG, just the raw string.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      panels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { type: Type.STRING },
            description: { type: Type.STRING },
            shotType: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            svgCode: { type: Type.STRING }, // 告诉 AI 返回这个字段
          },
          required: ["sceneNumber", "description", "shotType", "visualPrompt", "svgCode"],
        },
      },
    },
    required: ["panels"],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this script: "${script}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) throw new Error("Gemini 没有返回文本");
    return JSON.parse(response.text) as ScriptBreakdown;

  } catch (error: any) {
    console.error("AI Analysis Failed:", error);
    throw new Error(`剧本分析失败: ${error.message}`);
  }
};