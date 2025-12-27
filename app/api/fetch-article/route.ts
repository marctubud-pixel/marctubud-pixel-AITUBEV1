import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化服务端 Supabase (需要你的 URL 和 SERVICE_ROLE_KEY 或 ANON_KEY)
// 注意：为了安全，建议使用 process.env，但为了配合你的现有模式，这里暂时读取环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // 1. 使用 Jina Reader 获取干净的 Markdown 内容
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl);
    if (!response.ok) throw new Error('Failed to fetch article content');
    let markdown = await response.text();

    // 提取标题 (Jina 通常会在第一行给 Title: xxx)
    const titleMatch = markdown.match(/^Title:\s*(.+)$/m);
    let title = titleMatch ? titleMatch[1] : '未命名文章';
    // 去掉 Jina 的元数据头 (Title, URL source 等)
    markdown = markdown.replace(/^Title:.*$/gm, '').replace(/^URL Source:.*$/gm, '').replace(/^Markdown Content:.*$/gm, '').trim();

    // 2. 正则提取所有图片链接
    // 匹配 ![alt](http...) 或 <img src="http...">
    const imgRegex = /!\[.*?\]\((https?:\/\/.*?)\)/g;
    const matches = [...markdown.matchAll(imgRegex)];
    const imageUrls = matches.map(m => m[1]);
    
    // 去重
    const uniqueUrls = [...new Set(imageUrls)];

    // 3. 循环处理图片：下载 -> 上传 Supabase -> 替换 Markdown 链接
    for (const originalUrl of uniqueUrls) {
      try {
        // 3.1 下载图片 (带 Referer 防止防盗链，特别是微信公众号)
        const imgRes = await fetch(originalUrl, {
          headers: {
            'Referer': new URL(url).origin, // 伪造来源
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // 3.2 生成新文件名
        const fileExt = originalUrl.split('.').pop()?.split('?')[0] || 'jpg';
        // 简单判断后缀合法性
        const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt.toLowerCase()) ? fileExt : 'jpg';
        const fileName = `auto-fetch-${Date.now()}-${Math.random().toString(36).slice(2)}.${validExt}`;

        // 3.3 上传到 Supabase 'articles' 桶
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('articles')
          .upload(fileName, buffer, {
            contentType: imgRes.headers.get('content-type') || 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
            console.error(`Upload failed for ${originalUrl}:`, uploadError);
            continue;
        }

        // 3.4 获取公开链接
        const { data: publicUrlData } = supabase
          .storage
          .from('articles')
          .getPublicUrl(fileName);

        // 3.5 替换 Markdown 中的旧链接为新链接
        // 注意：要转义正则中的特殊字符
        const safeOriginalUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const replaceRegex = new RegExp(safeOriginalUrl, 'g');
        markdown = markdown.replace(replaceRegex, publicUrlData.publicUrl);

      } catch (imgErr) {
        console.error(`Failed to process image ${originalUrl}:`, imgErr);
        // 如果处理失败，保留原链接（或做其他处理）
      }
    }

    // 4. 返回处理后的数据
    return NextResponse.json({
      title: title,
      content: markdown,
      // 尝试取第一张图做封面，如果没有则为空
      cover_image: uniqueUrls.length > 0 ? markdown.match(/!\[.*?\]\((https?:\/\/.*?)\)/)?.[1] : ''
    });

  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}