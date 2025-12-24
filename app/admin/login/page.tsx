'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'; // 1. 引入 Eye 和 EyeOff 图标

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 2. 新增状态：控制密码可见性
  const router = useRouter();

  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (isAuth === 'true') {
        router.push('/admin');
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Marcgetrich$2026') {
        localStorage.setItem('admin_auth', 'true');
        router.push('/admin');
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
            <div className="relative"> {/* 3. 增加 relative 容器以便定位图标 */}
                <input 
                    type={showPassword ? "text" : "password"} // 4. 根据状态动态切换类型
                    placeholder="输入密码" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    // 为了保持文字视觉居中且不被图标遮挡，左右 padding 都设为 12 (pl-12 pr-12)
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white focus:outline-none focus:border-purple-500 transition-all text-center tracking-widest"
                />
                
                {/* 5. 切换按钮 */}
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    title={showPassword ? "隐藏密码" : "显示密码"}
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            
            {error && <p className="text-red-500 text-xs text-center animate-pulse">{error}</p>}

            <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                进入系统 <ArrowRight size={16}/>
            </button>
        </form>
      </div>
    </div>
  );
}
