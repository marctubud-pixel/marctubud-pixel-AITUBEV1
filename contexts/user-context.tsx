'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
// 🔴 修复：将 @/lib... 改为相对路径。
// 根据你 Profile 页面的引用，lib 应该在 app/lib，所以路径如下：
import { supabase } from '../app/lib/supabaseClient'; 
// ⚠️ 如果再次报错，请尝试改为 '../lib/supabaseClient' (如果 lib 在根目录)

import { User } from '@supabase/supabase-js';

// 定义 Profile 类型
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
  refreshProfile: () => Promise<void>; 
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

  // 监听 Auth 变化
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

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}