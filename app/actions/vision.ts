'use server'

import { createClient } from '@supabase/supabase-js'

// ==========================================
// 🟢 接口定义 (Interfaces)
// ==========================================

// 1. 供角色库使用 (V4.0 New)
export interface VisionResult {
  description: string;
  tags: string[];
  colors: string[];
}

// 2. 供生图引擎使用 (Restored for generate.ts)
export interface VisionAnalysis {
    shot_type: string;
    subject_composition: {
        head_y_range?: [number, number]; // [top, bottom] 0-1 relative coordinates
    };
    key_features: string[];
}

const ARK_API_KEY = process.env.VOLC_ARK_API_KEY || process.env.OPENAI_API_KEY;
// 默认视觉模型
const VISION_MODEL = process.env.VOLC_VISION_ENDPOINT_ID || "gpt-4o"; 

// ==========================================
// 🟢 方法 1: 角色库分析 (V4.0 Character Vision)
// ==========================================
export async function analyzeImageContent(base64Image: string): Promise<VisionResult> {
  // Mock 模式
  if (!ARK_API_KEY) {
    console.log("[Vision] No API Key, returning mock data");
    await new Promise(r => setTimeout(r, 1000));
    return {
      description: "A futuristic cyberpunk character with neon glowing jacket, silver hair, standing in rain. High contrast, cinematic lighting.",
      tags: ["cyberpunk", "neon", "silver hair", "jacket", "scifi"],
      colors: ["#00ffcc", "#ff0099"]
    };
  }

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image. Provide a detailed visual description (appearance, clothing, features) for AI image generation prompts. Then list 5 key visual tags. Format: Description: [text] Tags: [tag1, tag2...]" },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // 简单的解析逻辑
    const descMatch = content.match(/Description:\s*(.*?)(\n|$)/i) || [null, content.slice(0, 150)];
    const tagsMatch = content.match(/Tags:\s*(.*?)(\n|$)/i);
    const tags = tagsMatch ? tagsMatch[1].split(',').map((t: string) => t.trim()) : ["AI Analyzed"];

    return {
      description: descMatch[1] || content.slice(0, 200),
      tags: tags,
      colors: []
    };

  } catch (error) {
    console.error("[Vision Error]", error);
    return { description: "Failed to analyze image.", tags: [], colors: [] };
  }
}

// ==========================================
// 🟢 方法 2: 生图参考图分析 (Restored for generate.ts)
// ==========================================
export async function analyzeRefImage(imageUrl: string): Promise<VisionAnalysis | null> {
    // 如果没有 Key，返回 Null 跳过分析，保证 generate.ts 不报错
    if (!ARK_API_KEY) return null;

    try {
        console.log(`[Vision] Analyzing ref structure: ${imageUrl.slice(0, 30)}...`);
        
        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ARK_API_KEY}`
            },
            body: JSON.stringify({
                model: VISION_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Analyze this image layout. 1. Identify Shot Type (Close-up, Mid Shot, Full Shot, Wide). 2. If it's a person, estimate the Y-axis range of the Head (0.0 to 1.0). 3. List 5 key visual features (e.g. blue tie, red hair). Return JSON: { \"shot_type\": \"...\", \"head_y\": [0.1, 0.3], \"features\": [...] }" },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                // 强制 JSON 模式（如果模型支持）
                response_format: { type: "json_object" } 
            })
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) return null;

        // 解析 JSON
        const result = JSON.parse(content);
        
        return {
            shot_type: result.shot_type || "MID SHOT",
            subject_composition: {
                head_y_range: result.head_y || undefined
            },
            key_features: result.features || []
        };

    } catch (e) {
        console.warn("[Vision] Structure analysis failed, skipping...", e);
        return null; // 返回 null 让 generate.ts 使用兜底逻辑
    }
}