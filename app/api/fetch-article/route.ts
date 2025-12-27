import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化服务端 Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 伪装成 Mac Chrome，防止被简单的反爬虫拦截
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    let title = '';
    let markdown = '';
    let coverImage = '';
    let imageUrls: string[] = [];

    // 🕵️‍♂️ 判断是否为微信公众号文章
    const isWeChat = url.includes('mp.weixin.qq.com');

    if (isWeChat) {
      console.log('🚀 检测到微信公众号链接，启动直连模式...');
      // === 模式 A: 微信直连解析 (不走 Jina) ===
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      const html = await res.text();

      // 1. 正则提取元数据
      const titleMatch = html.match(/var msg_title = "(.+?)";/) || html.match(/<meta property="og:title" content="(.+?)"/);
      const coverMatch = html.match(/var msg_cdn_url = "(.+?)";/) || html.match(/<meta property="og:image" content="(.+?)"/);
      
      title = titleMatch ? titleMatch[1].replace(/\\x26amp;/g, '&') : '微信文章';
      coverImage = coverMatch ? coverMatch[1] : '';

      // 2. 提取正文内容区
      // 微信正文在 id="js_content" 的 div 中
      const contentMatch = html.match(/<div class="rich_media_content " id="js_content"[^>]*>([\s\S]*?)<\/div>/) || html.match(/<div class="rich_media_content" id="js_content"[^>]*>([\s\S]*?)<\/div>/);
      
      if (contentMatch) {
        let rawContent = contentMatch[1];
        
        // 3. 提取图片 (微信图片使用 data-src)
        // 匹配 <img ... data-src="...">
        const imgRegex = /<img[^>]+data-src="([^"]+)"[^>]*>/g;
        const matches = [...rawContent.matchAll(imgRegex)];
        imageUrls = matches.map(m => m[1]);

        // 4. 简单的 HTML -> Markdown 转换 (仅保留文字和图片占位)
        // 先把图片标签替换成临时占位符，避免被后续去标签操作误删
        rawContent = rawContent.replace(imgRegex, (match, src) => `\n\n![image](${src})\n\n`);
        
        // 处理段落
        rawContent = rawContent.replace(/<p[^>]*>/g, '\n').replace(/<\/p>/g, '\n');
        rawContent = rawContent.replace(/<br\s*\/?>/g, '\n');
        // 去除所有其他 HTML 标签
        rawContent = rawContent.replace(/<[^>]+>/g, '');
        // 处理转义字符
        rawContent = rawContent.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        
        markdown = rawContent.trim();
      } else {
        // 如果正则提取失败，回退到 Jina
        throw new Error('WeChat parser failed, falling back...');
      }

    } else {
      // === 模式 B: 通用 Jina 解析 ===
      console.log('🌍 普通链接，启动 Jina 解析...');
      const jinaUrl = `https://r.jina.ai/${url}`;
      const response = await fetch(jinaUrl);
      if (!response.ok) throw new Error('Jina fetch failed');
      let jinaText = await response.text();

      // 提取标题
      const titleMatch = jinaText.match(/^Title:\s*(.+)$/m);
      title = titleMatch ? titleMatch[1] : '未命名文章';
      
      // 清洗头部信息
      markdown = jinaText.replace(/^Title:.*$/gm, '').replace(/^URL Source:.*$/gm, '').replace(/^Markdown Content:.*$/gm, '').trim();

      // 提取 Markdown 图片链接
      const imgRegex = /!\[.*?\]\((https?:\/\/.*?)\)/g;
      const matches = [...markdown.matchAll(imgRegex)];
      imageUrls = matches.map(m => m[1]);
      
      // 尝试获取第一张图作为封面
      coverImage = imageUrls.length > 0 ? imageUrls[0] : '';
    }

    // === 公共步骤：图片转存与替换 ===
    const uniqueUrls = [...new Set(imageUrls)]; // 去重
    console.log(`🖼️ 发现 ${uniqueUrls.length} 张图片，开始转存...`);

    for (const originalUrl of uniqueUrls) {
      try {
        // 跳过非 HTTP 链接
        if (!originalUrl.startsWith('http')) continue;

        // 1. 下载图片 (带 Referer)
        const imgRes = await fetch(originalUrl, {
          headers: {
            'Referer': isWeChat ? 'https://mp.weixin.qq.com/' : new URL(url).origin,
            'User-Agent': USER_AGENT
          }
        });
        
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // 2. 文件名处理
        // 微信图片 URL 经常不带后缀或很长，统一处理
        let fileExt = 'jpg';
        if (originalUrl.includes('wx_fmt=png')) fileExt = 'png';
        else if (originalUrl.includes('wx_fmt=gif')) fileExt = 'gif';
        
        const fileName = `fetch-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        // 3. 上传到 Supabase
        const { error: uploadError } = await supabase.storage
          .from('articles')
          .upload(fileName, buffer, {
            contentType: imgRes.headers.get('content-type') || 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
            console.error(`Upload error:`, uploadError);
            continue;
        }

        // 4. 获取新链接
        const { data: publicUrlData } = supabase.storage
          .from('articles')
          .getPublicUrl(fileName);

        // 5. 替换正文中的链接
        // 微信的 originalUrl 可能包含特殊字符，直接用 split/join 替换更安全
        markdown = markdown.split(originalUrl).join(publicUrlData.publicUrl);
        
        // 如果是封面图，也替换一下
        if (coverImage && originalUrl.includes(coverImage.substring(0, 20))) {
            coverImage = publicUrlData.publicUrl;
        }

      } catch (imgErr) {
        console.error(`Image process failed: ${originalUrl}`, imgErr);
      }
    }

    return NextResponse.json({
      title: title || '抓取到的文章',
      content: markdown,
      cover_image: coverImage
    });

  } catch (error: any) {
    console.error('Fetch API Error:', error);
    return NextResponse.json({ 
        error: error.message || '抓取服务异常',
        details: '请尝试直接复制内容使用'
    }, { status: 500 });
  }
}