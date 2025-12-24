'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // 检查是否已经登录过
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (isAuth === 'true') {
        router.push('/admin');
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 🔐 你的设定密码
    if (password === 'Marcgetrich$2026') {
        localStorage.setItem('admin_auth', 'true'); // 写入令牌
        router.push('/admin'); // 跳转后台
    } else {
        setError('密码错误，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#151515] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/30">
                <Lock className="text-white" size={24}/>
            </div>
            <h1 className="text-2xl font-bold text-white">AI.Tube 控制台</h1>
            <p className="text-gray-500 text-sm mt-2">请输入管理员密码以继续</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <input 
                    type="password" 
                    placeholder="输入密码" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all text-center tracking-widest"
                />
            </div>
            
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                进入系统 <ArrowRight size={16}/>
            </button>
        </form>
      </div>
    </div>
  );
}
