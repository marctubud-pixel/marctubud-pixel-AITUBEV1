'use server'

import { createClient } from '@supabase/supabase-js'

// ==========================================
// 🟢 接口定义 (Interfaces)
// ==========================================

// 1. 供角色库使用 (Smart Matrix)
export interface VisionResult {
  description: string;
  tags: string[];
  colors: string[];
}

// 2. 供生图 & 重绘使用 (Generate & Repaint)
export interface VisionAnalysis {
    shot_type: string;
    subject_composition: {
        head_y_range?: [number, number]; 
    };
    key_features: string[];
    description?: string; // 🟢 新增：用于 Visual Bridge 的纯文本描述
}

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY || process.env.OPENAI_API_KEY;
const VISION_MODEL = process.env.VOLC_VISION_ENDPOINT_ID || "gpt-4o"; 

// ==========================================
// 🟢 方法 1: 角色库分析 (Smart Matrix Input)
// ==========================================
export async function analyzeImageContent(base64Image: string): Promise<VisionResult> {
  if (!ARK_API_KEY) {
    return { description: "Mock analysis result.", tags: [], colors: [] };
  }

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              // 🟢 关键修改：更明确的 Prompt，不仅要 Tags，还要一段用于绘画的描述
              { type: "text", text: "Analyze this image for AI Image Generation. 1. Describe the character's appearance (hair, clothing, age) in one detailed paragraph. 2. List 5 key visual tags. Format: Description: [text] Tags: [tag1, tag2...]" },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const descMatch = content.match(/Description:\s*(.*?)(\n|$)/i) || [null, content.slice(0, 200)];
    const tagsMatch = content.match(/Tags:\s*(.*?)(\n|$)/i);
    const tags = tagsMatch ? tagsMatch[1].split(',').map((t: string) => t.trim()) : ["AI Analyzed"];

    return {
      description: descMatch[1] || content,
      tags: tags,
      colors: []
    };

  } catch (error) {
    console.error("[Vision Error]", error);
    return { description: "", tags: [], colors: [] };
  }
}

// ==========================================
// 🟢 方法 2: 生图参考图分析 (Generate & Visual Bridge)
// ==========================================
export async function analyzeRefImage(imageUrl: string): Promise<VisionAnalysis | null> {
    if (!ARK_API_KEY) return null;

    try {
        console.log(`[Vision] Analyzing ref structure: ${imageUrl.slice(0, 30)}...`);
        
        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ARK_API_KEY}` },
            body: JSON.stringify({
                model: VISION_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            // 🟢 核心修改：请求 JSON，且明确要求返回 description
                            { type: "text", text: "Analyze this image. Return JSON format: { \"shot_type\": \"(Close-up/Mid/Full/Wide)\", \"head_y\": [0.1, 0.3], \"features\": [\"blue tie\", \"red hair\"], \"description\": \"A concise visual description of the clothing and hair style visible in this image (e.g. back view of white shirt, high ponytail).\" }" },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;
        
        if (!content) return null;
        
        // 清理 markdown 标记
        content = content.replace(/```json\n?/, "").replace(/```\n?/, "").trim();

        const result = JSON.parse(content);
        
        return {
            shot_type: result.shot_type || "MID SHOT",
            subject_composition: {
                head_y_range: result.head_y || undefined
            },
            key_features: result.features || [],
            // 🟢 这就是 Visual Bridge 要用的救命稻草！
            description: result.description || result.features?.join(", ") || ""
        };

    } catch (e) {
        console.warn("[Vision] Structure analysis failed, skipping...", e);
        return null;
    }
}