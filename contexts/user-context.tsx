'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ⚠️ 注意：请确认这里引用的路径是否正确，如果是 ../lib 请自行调整
import { User } from '@supabase/supabase-js';

// 定义 Profile 类型 (与数据库 Schema 对应)
type UserProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  points: number;
  is_vip: boolean;
  vip_expires_at: string | null;
  free_quota: number;
  last_check_in: string | null;
};

type UserContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>; // ✨ 核心：暴露刷新方法供任何组件调用
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 核心获取逻辑
  const fetchUserData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setUser(session.user);

      // 获取最新的 Profile 数据
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 监听 Auth 变化 (登录/登出自动刷新)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    // 初始化获取
    fetchUserData();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  return (
    <UserContext.Provider value={{ user, profile, isLoading, refreshProfile: fetchUserData }}>
      {children}
    </UserContext.Provider>
  );
}

// 自定义 Hook，方便组件调用
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}