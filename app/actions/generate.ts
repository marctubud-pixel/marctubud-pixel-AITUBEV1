'use server'

import { createClient } from '@supabase/supabase-js'

// 初始化 Supabase Admin (用于上传图片 & 读取角色库)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 火山引擎方舟配置
const ARK_API_KEY = process.env.VOLC_ARK_API_KEY
const ARK_ENDPOINT_ID = process.env.VOLC_IMAGE_ENDPOINT_ID
// 方舟文生图的标准兼容端点
const ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

/**
 * 生成分镜图 (Server Action)
 * @param shotId 分镜ID
 * @param prompt 基础提示词 (动作+景别)
 * @param projectId 项目ID
 * @param isDraftMode 是否草图模式
 * @param characterId (可选) 角色ID，用于保持角色一致性
 */
export async function generateShotImage(
  shotId: string | number, 
  prompt: string, 
  projectId: string,
  isDraftMode: boolean = true,
  characterId?: string // 👈 [新增] 接收角色ID
) {
  console.log(`[Server] 即梦AI 开始生成: ${shotId}, CharacterID: ${characterId || 'None'}`);

  try {
    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) {
      throw new Error("请先配置 VOLC_ARK_API_KEY 和 VOLC_IMAGE_ENDPOINT_ID");
    }

    // -------------------------------------------------------
    // 1. [核心改造] 角色一致性 Prompt 注入
    // -------------------------------------------------------
    let finalPrompt = prompt;
    
    if (characterId) {
      // A. 去数据库查这个人的长相
      const { data: character, error } = await supabaseAdmin
        .from('characters')
        .select('name, description, avatar_url')
        .eq('id', characterId)
        .single();

      if (error || !character) {
        console.warn(`[Generate Warning] 找不到角色 ID: ${characterId}，将忽略角色一致性。`);
      } else {
        // B. 组装 Prompt (角色描述前置，权重更高)
        // 格式：(Character: 描述), (Action: 动作), (Style: 画风)
        const charDesc = character.description.trim();
        finalPrompt = `(Character visual traits: ${charDesc}), ${prompt}`;
        
        console.log(`[Server] 已注入角色记忆: ${character.name}`);
        // 注意：目前使用的是文生图，暂未调用 avatar_url 进行图生图 (Image-to-Image)
        // 下一阶段如果要升级 ControlNet，可以在这里使用 character.avatar_url
      }
    }

    // -------------------------------------------------------
    // 2. 构造即梦 (Seedream) 请求
    // -------------------------------------------------------
    const payload = {
      model: ARK_ENDPOINT_ID, 
      prompt: finalPrompt, // 使用注入后的 Prompt
      size: "1024x1024",
      n: 1
    };

    // 3. 发送请求给火山引擎
    const response = await fetch(ARK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Volcengine Error]", data);
      throw new Error(data.error?.message || "即梦API调用失败");
    }

    // 获取图片 URL
    const imageUrl = data.data?.[0]?.url;
    console.log(`[Server] 即梦返回 URL: ${imageUrl}`);

    if (!imageUrl) throw new Error("AI 未返回图片 URL");

    // 4. 将图片转存到 Supabase Storage
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `cineflow/${projectId}/${Date.now()}_${shotId}.png`;
    
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error("[Upload Error]", uploadError);
      throw new Error("图片上传存储桶失败");
    }

    // 5. 获取公开访问链接
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('images')
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error("[Generate Error]", error);
    return { success: false, message: error.message || '生成服务出错' };
  }
}