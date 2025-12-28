'use client';

import React from 'react';

interface SmartVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
}

export default function SmartVideoPlayer({ videoUrl, posterUrl }: SmartVideoPlayerProps) {
  // 1. 安全检查：如果 URL 为空，直接返回空或占位符
  if (!videoUrl) return <div className="bg-gray-900 aspect-video flex items-center justify-center text-gray-500">无视频源</div>;

  // 2. 判断是否为 Bilibili 链接
  const isBilibili = videoUrl.includes('bilibili.com') || videoUrl.startsWith('BV');

  if (isBilibili) {
    // 3. 提取 BV 号 (支持完整链接或单独的 BV 号)
    const match = videoUrl.match(/(BV\w+)/);
    const bvid = match ? match[1] : null;

    if (!bvid) {
      return <div className="bg-gray-900 text-red-500 p-4">无效的 B 站链接</div>;
    }

    // 4. 渲染 B 站嵌入式播放器 (Iframe)
    // high_quality=1: 开启高清
    // danmaku=0: 默认关闭弹幕
    // autoplay=0: 关闭自动播放
    return (
      <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-xl bg-black shadow-2xl border border-white/10">
        <iframe
          src={`//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=0`}
          className="absolute top-0 left-0 w-full h-full"
          scrolling="no"
          frameBorder="0"
          allowFullScreen
          // ⚠️ 关键：防止 B 站因为 Referrer 拦截请求 (403 Forbidden)
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // 5. 如果不是 B 站，默认使用普通 Video 标签 (播放 MP4)
  return (
    <div className="relative w-full h-auto rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
      <video
        src={videoUrl}
        poster={posterUrl}
        controls
        className="w-full h-auto"
        playsInline
      />
    </div>
  );
}