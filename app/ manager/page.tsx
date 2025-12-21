'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 👇 咱们这次先不从 lib 引用，直接硬编码，排除引用路径错误的风险！
// 请去 Supabase 后台 -> Settings -> API 复制你的 URL 和 Anon Key 填在这里
const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ManagerPage() {
  const [bvid, setBvid] = useState('');
  
  // 简易测试函数
  const testUpload = async () => {
    if(!bvid) return alert('请输入BVID');
    alert('连接正常！准备抓取: ' + bvid);
    // 这里先不写真正的逻辑，先确认页面能显示出来
  };

  return (
    <div style={{color:'white', padding:'50px'}}>
      <h1>后台上传测试页</h1>
      <input 
        style={{color:'black', padding:'10px'}}
        value={bvid}
        onChange={e=>setBvid(e.target.value)}
        placeholder="输入 BV 号"
      />
      <button onClick={testUpload} style={{background:'green', padding:'10px', marginLeft:'10px'}}>
        测试按钮
      </button>
    </div>
  );
}
