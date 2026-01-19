// app/lib/aliyun.ts
import axios from 'axios';

// 专门用于把用户的 Prompt 变成向量
export async function generateEmbedding(text: string) {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';
  
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error('Missing DASHSCOPE_API_KEY');
  }

  const response = await axios.post(
    url,
    {
      model: "text-embedding-v2", // ⚠️ 必须和构建数据库时用的模型完全一致！
      input: { texts: [text] },
      parameters: { text_type: "query" }
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.output && response.data.output.embeddings) {
    return response.data.output.embeddings[0].embedding; // 返回 1536 维数组
  }
  
  throw new Error('Failed to generate embedding');
}

