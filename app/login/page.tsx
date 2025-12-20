'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // 引用我们之前的工具
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 登录逻辑
  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setMessage('登录失败: ' + error.message);
      setLoading(false);
    } else {
      // 登录成功，跳转回首页
      router.push('/');
      router.refresh(); // 刷新页面状态
    }
  };

  // 注册逻辑
  const handleSignUp = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage('注册失败: ' + error.message);
    } else {
      setMessage('注册成功！系统已为您自动登录，正在跳转...');
      // 延迟一点点再跳转，让用户看清提示
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">加入 AI Video 社区</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">邮箱地址</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className={`p-3 rounded text-sm ${message.includes('失败') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? '处理中...' : '登录'}
            </button>
            <button 
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 bg-transparent border border-gray-600 font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              注册新账号
            </button>
          </div>
          
          <div className="text-center mt-6">
             <Link href="/" className="text-sm text-gray-500 hover:text-white">暂不登录，回首页随便看看</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
