// app/actions/composition.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/app/lib/aliyun'

export async function searchComposition(query: string) {
  const supabase = await createClient();

  try {
    console.log("🔍 正在搜索构图:", query);

    // 1. 实时生成向量 (使用阿里云)
    const vector = await generateEmbedding(query);
    console.log("生成的向量特征:", vector.slice(0, 5)); // 看看是不是 [0.12, -0.05, ...] 这种正常数字
    // 2. 在数据库中搜索相似图片 (RPC 调用)
    const { data: refs, error } = await supabase.rpc('match_compositions', {
      query_embedding: vector,
      match_threshold: 0.01, // 🚨 改成极低的值，甚至是 0 或者 -1 来测试
      match_count: 4        // 只取前4张
    });

    if (error) {
      console.error("Supabase RPC Error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 找到 ${refs.length} 张参考图`);
    return { success: true, data: refs };

  } catch (error: any) {
    console.error("Search Action Error:", error);
    return { success: false, error: error.message };
  }
}