import { createClient } from '@supabase/supabase-js'

// 👇 直接把引号里的内容替换成你在 Supabase 后台看到的真实数据
const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co'
const supabaseAnonKey = 'sb_publishable_tI4N_nE0fvZqwW2gyMldfQ_i3hOuoMj'

// 创建客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
