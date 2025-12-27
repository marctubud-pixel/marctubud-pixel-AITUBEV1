import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化服务端 Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 🛡️ 升级版伪装头部：模拟真实的 PC 浏览器访问
const FAKE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1'
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // 状态变量
  let title = '';
  let markdown = '';
  let coverImage = '';
  let parsedSuccess = false; // 是否解析成功标记

  try {
    const isWeChat = url.includes('mp.weixin.qq.com');

    // ==========================================
    // 🛠️ 策略 A: 微信直连解析 (优先尝试)
    // ==========================================
    if (isWeChat) {
      try {
        console.log('🚀 尝试策略 A: 微信直连...');
        const res = await fetch(url, { headers: FAKE_HEADERS });
        const html = await res.text();

        // 检查是否被拦截 (微信验证页面通常没有 msg_title)
        const titleMatch = html.match(/var msg_title = "(.+?)";/) || html.match(/<meta property="og:title" content="(.+?)"/);
        
        if (titleMatch) {
          title = titleMatch[1].replace(/\\x26amp;/g, '&');
          const coverMatch = html.match(/var msg_cdn_url = "(.+?)";/) || html.match(/<meta property="og:image" content="(.+?)"/);
          coverImage = coverMatch ? coverMatch[1] : '';

          // 提取正文
          const contentMatch = html.match(/<div class="rich_media_content " id="js_content"[^>]*>([\s\S]*?)<\/div>/) || html.match(/<div class="rich_media_content" id="js_content"[^>]*>([\s\S]*?)<\/div>/);
          
          if (contentMatch) {
            let rawContent = contentMatch[1];
            
            // 处理图片 (data-src -> markdown)
            const imgRegex = /<img[^>]+data-src="([^"]+)"[^>]*>/g;
            rawContent = rawContent.replace(imgRegex, (match, src) => `\n\n![image](${src})\n\n`);
            
            // 清洗 HTML 标签
            rawContent = rawContent
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<[^>]+>/g, '') // 去除剩余标签
              .replace(/&nbsp;/g, ' ')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&');
            
            markdown = rawContent.trim();
            parsedSuccess = true;
            console.log('✅ 策略 A 成功');
          }
        } else {
          console.warn('⚠️ 策略 A 失败: 未找到标题 (可能是反爬验证页)');
        }
      } catch (e) {
        console.warn('⚠️ 策略 A 报错:', e);
        // 不抛出错误，继续尝试策略 B
      }
    }

    // ==========================================
    // 🌍 策略 B: Jina Reader (兜底 / 非微信链接)
    // ==========================================
    if (!parsedSuccess) {
      console.log('🔄 启动策略 B: Jina Reader...');
      const jinaUrl = `https://r.jina.ai/${url}`;
      
      // 给 Jina 发请求也带上 Header 试试
      const response = await fetch(jinaUrl, { 
        headers: {
            'X-Target-URL': url // 有时候这能帮助 Jina
        } 
      });
      
      if (!response.ok) throw new Error(`Jina fetch failed: ${response.status}`);
      let jinaText = await response.text();

      // 检查 Jina 是否返回了报错信息
      if (jinaText.includes('Warning: This page maybe requiring CAPTCHA') || jinaText.includes('Environment Abnormal')) {
          throw new Error('Jina 也被拦截了 (CAPTCHA/Environment Abnormal)');
      }

      const titleMatch = jinaText.match(/^Title:\s*(.+)$/m);
      if (titleMatch) title = titleMatch[1];
      else if (!title) title = '未命名文章';

      markdown = jinaText.replace(/^Title:.*$/gm, '').replace(/^URL Source:.*$/gm, '').replace(/^Markdown Content:.*$/gm, '').trim();
      parsedSuccess = true;
      console.log('✅ 策略 B 成功');
    }

    // ==========================================
    // 🖼️ 公共步骤：图片转存 (Supabase)
    // ==========================================
    if (parsedSuccess && markdown) {
      const imgRegex = /!\[.*?\]\((https?:\/\/.*?)\)/g;
      const matches = [...markdown.matchAll(imgRegex)];
      // 提取链接并去重
      const uniqueUrls = [...new Set(matches.map(m => m[1]))];
      
      console.log(`🖼️ 准备转存 ${uniqueUrls.length} 张图片...`);

      // 尝试取第一张图做封面 (如果还没封面)
      if (!coverImage && uniqueUrls.length > 0) coverImage = uniqueUrls[0];

      for (const originalUrl of uniqueUrls) {
        try {
          if (!originalUrl.startsWith('http')) continue;

          // 下载图片
          const imgRes = await fetch(originalUrl, {
            headers: {
              'Referer': isWeChat ? 'https://mp.weixin.qq.com/' : new URL(url).origin,
              'User-Agent': FAKE_HEADERS['User-Agent']
            }
          });
          
          if (!imgRes.ok) continue;

          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // 处理后缀
          let fileExt = 'jpg';
          if (originalUrl.includes('wx_fmt=png')) fileExt = 'png';
          else if (originalUrl.includes('wx_fmt=gif')) fileExt = 'gif';
          else {
              const urlExt = originalUrl.split('.').pop()?.split('?')[0];
              if (urlExt && ['jpg','jpeg','png','gif','webp'].includes(urlExt.toLowerCase())) fileExt = urlExt;
          }
          
          const fileName = `fetch-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

          // 上传
          const { error: uploadError } = await supabase.storage
            .from('articles')
            .upload(fileName, buffer, {
              contentType: imgRes.headers.get('content-type') || 'image/jpeg',
              upsert: false
            });

          if (uploadError) continue;

          // 获取新链接
          const { data: publicUrlData } = supabase.storage
            .from('articles')
            .getPublicUrl(fileName);

          // 替换正文链接 (全局替换)
          // 使用 split/join 避免正则特殊字符问题
          markdown = markdown.split(originalUrl).join(publicUrlData.publicUrl);
          
          // 如果封面图也是这张，顺便替换
          if (coverImage && originalUrl.includes(coverImage.substring(0, 20))) {
              coverImage = publicUrlData.publicUrl;
          }

        } catch (imgErr) {
          console.error(`图片转存失败: ${originalUrl}`, imgErr);
        }
      }
    } else {
        throw new Error('所有抓取策略均失败');
    }

    return NextResponse.json({
      title: title || '抓取到的文章',
      content: markdown,
      cover_image: coverImage
    });

  } catch (error: any) {
    console.error('API Final Error:', error);
    return NextResponse.json({ 
        error: error.message || '抓取服务异常',
        details: '建议手动复制内容' 
    }, { status: 500 });
  }
}