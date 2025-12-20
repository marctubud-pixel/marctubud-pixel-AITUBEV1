import { createClient } from '@supabase/supabase-js'

// 👇 直接把引号里的内容替换成你在 Supabase 后台看到的真实数据
const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo'

// 创建客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
