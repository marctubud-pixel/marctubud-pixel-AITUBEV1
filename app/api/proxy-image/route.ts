import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'No URL' }, { status: 400 });

    // 1. 伪装下载图片 (关键：Referer 设为微信)
    const imgRes = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://mp.weixin.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!imgRes.ok) throw new Error('Download failed');

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. 智能判断后缀
    let fileExt = 'jpg';
    if (imageUrl.includes('wx_fmt=png')) fileExt = 'png';
    else if (imageUrl.includes('wx_fmt=gif')) fileExt = 'gif';
    
    const fileName = `proxy-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    // 3. 上传 Supabase
    const { error } = await supabase.storage
      .from('articles')
      .upload(fileName, buffer, {
        contentType: imgRes.headers.get('content-type') || 'image/jpeg'
      });

    if (error) throw error;

    // 4. 返回新链接
    const { data } = supabase.storage
      .from('articles')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: data.publicUrl });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}