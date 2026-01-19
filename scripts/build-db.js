// scripts/build-db.js
// 运行命令: node scripts/build-db.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const sizeOf = require('image-size');
require('dotenv').config({ path: '.env.local' });

// --- 配置区域 ---
const IMAGES_DIR = path.join(__dirname, '../raw_images'); 
const BUCKET_NAME = 'composition_refs';

// --- 环境变量检查 ---
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DASHSCOPE_API_KEY'];
const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`❌ 错误: 缺少必要的环境变量: ${missingVars.join(', ')}`);
  process.exit(1);
}

// --- 初始化 Supabase ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- 核心逻辑 ---

async function main() {
  console.log('🚀 开始构建视觉数据库 (Pro Max 版 - 含光影天气)...');
  
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ 找不到图片文件夹: ${IMAGES_DIR}`);
    return;
  }
  
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
  console.log(`📸 发现 ${files.length} 张图片`);

  for (const [index, file] of files.entries()) {
    const filePath = path.join(IMAGES_DIR, file);
    console.log(`\n[${index + 1}/${files.length}] 处理中: ${file}`);

    try {
      // 1. 查重
      const { data: existing } = await supabase
        .from('composition_refs')
        .select('id')
        .eq('source_filename', file)
        .single();

      if (existing) {
        console.log(`⏩ 跳过 (已存在): ${file}`);
        continue;
      }

      // 2. 上传
      const fileBuffer = fs.readFileSync(filePath);
      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(`refs/${file}`, fileBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw new Error(`上传失败: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`refs/${file}`);
      console.log(`   ☁️ 图片已上传`);

      // 3. AI 深度分析 (包含光影、时间)
      const analysis = await analyzeImageWithQwen(publicUrl); 
      console.log(`   🧠 分析: ${analysis.technical.shot_size} | ${analysis.environment.time_of_day}`);

      // 4. 生成全要素向量
      // 权重策略：人物朝向 > 氛围/光影 > 动作 > 构图
      const textForEmbedding = `
        Facing: ${analysis.subject.facing}. 
        Time & Weather: ${analysis.environment.time_of_day}, ${analysis.environment.weather}. 
        Lighting: ${analysis.environment.lighting_type}, ${analysis.environment.lighting_direction}.
        Mood: ${analysis.mood.keywords}. 
        Shot: ${analysis.technical.shot_size}, ${analysis.technical.angle}. 
        Composition: ${analysis.composition.rules}. 
        Content: ${analysis.subject.action_desc}.
      `.replace(/\s+/g, ' ').trim();

      const embedding = await getAliyunEmbedding(textForEmbedding);

      // 5. 入库
      const { error: dbError } = await supabase
        .from('composition_refs')
        .insert({
          image_url: publicUrl,
          source_filename: file,
          meta: analysis,
          embedding: embedding
        });

      if (dbError) throw dbError;
      console.log(`   ✅ 入库成功!`);

    } catch (err) {
      console.error(`   ❌ 失败: ${err.message}`);
    }
  }
}

// --- 核心分析函数：Qwen-VL-Plus ---
async function analyzeImageWithQwen(imageUrl) {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  const headers = {
    'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  // 定义超详细的 System Prompt
  const systemPrompt = `你是一位好莱坞资深摄影指导(DOP)。请从技术、构图、主体、环境四个维度分析图片。

必须严格使用以下英文术语进行分类（输出 JSON）：

1. TECHNICAL:
   - Shot Size: Extreme Close Up, Close Up, Medium Shot, Full Shot, Long Shot
   - Angle: Bird's Eye, High Angle, Eye Level, Low Angle, Dutch Angle

2. ENVIRONMENT (光影与时空):
   - Time: Day, Night, Golden Hour (黄昏/清晨), Blue Hour, Twilight
   - Weather: Sunny, Rainy, Foggy, Snowy, Overcast (阴天), Indoor (无天气)
   - Lighting Type: Natural Light, Hard Light (强硬光), Soft Light (柔光), Neon (霓虹), Silhouette (剪影), Volumetric (体积光/丁达尔)
   - Direction: Front Lit, Backlit (逆光), Side Lit (侧光), Top Lit

3. SUBJECT:
   - Facing: Back View (背影), Front View, Profile (侧面), Three-Quarter
   - Count: None, Single, Two, Crowd

4. MOOD:
   - Keywords: Cinematic, Tense, Melancholic, Joyful, Eerie, Cyberpunk, Minimalist

请只返回 JSON。`;

  const body = {
    "model": "qwen-vl-plus",
    "input": {
      "messages": [
        { "role": "system", "content": [{ "text": systemPrompt }] },
        { "role": "user", "content": [
            { "image": imageUrl },
            { "text": `Analyze this image. Return strictly valid JSON:
{
  "technical": { "shot_size": "Enum", "angle": "Enum" },
  "composition": { "rules": "String (e.g. Rule of Thirds, Center)" },
  "environment": { 
    "time_of_day": "Enum", 
    "weather": "Enum", 
    "lighting_type": "Enum",
    "lighting_direction": "Enum"
  },
  "subject": { 
    "facing": "Enum (Critical!)", 
    "count": "String", 
    "action_desc": "Short description" 
  },
  "mood": { "keywords": "String" }
}` }
          ]
        }
      ]
    },
    "parameters": { "result_format": "message" }
  };

  try {
    const response = await axios.post(url, body, { headers });
    if (response.data.output?.choices) {
      const content = response.data.output.choices[0].message.content[0].text;
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    }
    throw new Error(`API Error: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error("Qwen API Fail:", error.response?.data || error.message);
    // 返回兜底数据
    return {
      technical: { shot_size: "Unknown", angle: "Unknown" },
      environment: { time_of_day: "Unknown", weather: "Unknown", lighting_type: "Unknown", lighting_direction: "Unknown" },
      subject: { facing: "Unknown", action_desc: "Failed" },
      composition: { rules: "Unknown" },
      mood: { keywords: "Unknown" }
    };
  }
}

// --- 向量生成函数 (Text-Embedding-V2) ---
async function getAliyunEmbedding(text) {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';
  const headers = {
    'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json'
  };
  const body = {
    "model": "text-embedding-v2",
    "input": { "texts": [text] },
    "parameters": { "text_type": "query" }
  };

  try {
    const response = await axios.post(url, body, { headers });
    return response.data.output.embeddings[0].embedding;
  } catch (error) {
    console.error("Embedding Fail:", error.response?.data || error.message);
    throw error;
  }
}

main();