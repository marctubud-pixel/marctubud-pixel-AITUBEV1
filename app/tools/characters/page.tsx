'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  User, Plus, Trash2, Save, Image as ImageIcon, 
  Loader2, Upload, MoreHorizontal, LayoutGrid, Ban 
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';

// 类型定义
type Character = {
  id: string;
  name: string;
  description: string;
  negative_prompt: string | null; // [New] 负面提示词
  avatar_url: string | null;
}

type CharacterImage = {
  id: string;
  image_url: string;
  description: string | null;
  is_primary: boolean;
}

export default function CharacterPage() {
  const supabase = createClient();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [gallery, setGallery] = useState<CharacterImage[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // 表单状态
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [negPrompt, setNegPrompt] = useState(''); // [New] 负面提示词状态

  // 1. 初始化加载角色列表
  useEffect(() => {
    fetchCharacters();
  }, []);

  // 2. 当选中角色变化时，加载它的数据和图库
  useEffect(() => {
    if (selectedChar) {
      setName(selectedChar.name);
      setDesc(selectedChar.description || '');
      setNegPrompt(selectedChar.negative_prompt || ''); // [New] 填充
      fetchGallery(selectedChar.id);
    } else {
      setName('');
      setDesc('');
      setNegPrompt('');
      setGallery([]);
    }
  }, [selectedChar]);

  const fetchCharacters = async () => {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('加载角色失败');
    else {
      setCharacters(data as Character[] || []);
      // 默认选中第一个
      if (!selectedChar && data && data.length > 0) {
        setSelectedChar(data[0] as Character);
      }
    }
    setIsLoading(false);
  };

  const fetchGallery = async (charId: string) => {
    const { data, error } = await supabase
      .from('character_images')
      .select('*')
      .eq('character_id', charId)
      .order('created_at', { ascending: false });
    
    if (!error) setGallery(data || []);
  };

  // --- 核心功能：创建/更新角色 ---
  const handleSaveCharacter = async () => {
    if (!name.trim()) return toast.warning('名字不能为空');

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return toast.error('请先登录');

    let newCharId = selectedChar?.id;

    try {
      if (selectedChar) {
        // 更新
        const { error } = await supabase
          .from('characters')
          .update({ 
            name, 
            description: desc,
            negative_prompt: negPrompt // [New] 保存字段
          })
          .eq('id', selectedChar.id);
        if (error) throw error;
        toast.success('更新成功');
      } else {
        // 新建
        const { data, error } = await supabase
          .from('characters')
          .insert({
            user_id: user.id,
            name,
            description: desc,
            negative_prompt: negPrompt // [New] 保存字段
          })
          .select()
          .single();
        
        if (error) throw error;
        newCharId = data.id;
        toast.success('角色创建成功');
      }

      await fetchCharacters();
      // 如果是新建，自动选中它
      if (newCharId && !selectedChar) {
         const { data } = await supabase.from('characters').select('*').eq('id', newCharId).single();
         if(data) setSelectedChar(data as Character);
      }
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    }
  };

  const handleDeleteCharacter = async () => {
    if (!selectedChar) return;
    if (!confirm('确定删除该角色及其所有图片吗？此操作不可恢复。')) return;

    const { error } = await supabase.from('characters').delete().eq('id', selectedChar.id);
    if (error) return toast.error('删除失败');
    
    toast.success('已删除');
    setSelectedChar(null);
    fetchCharacters();
  };

  // --- 核心功能：上传画廊图片 (Assets 2.0) ---
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isAvatar: boolean = false) => {
    if (!e.target.files || !e.target.files.length) return;
    if (!selectedChar) return toast.warning('请先保存或选择一个角色');

    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("未登录");

      // 1. 上传物理文件
      // 路径策略: userId/charId/timestamp.png
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${selectedChar.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('characters')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. 获取公开链接
      const { data: { publicUrl } } = supabase.storage
        .from('characters')
        .getPublicUrl(fileName);

      // 3. 写入数据库
      if (isAvatar) {
        // A. 如果是头像，更新 characters 主表
        await supabase
          .from('characters')
          .update({ avatar_url: publicUrl })
          .eq('id', selectedChar.id);
        
        // 更新本地状态
        setSelectedChar({ ...selectedChar, avatar_url: publicUrl });
        setCharacters(chars => chars.map(c => c.id === selectedChar.id ? { ...c, avatar_url: publicUrl } : c));
        toast.success('头像更新成功');
      } else {
        // B. 如果是参考图，插入 character_images 子表
        await supabase
          .from('character_images')
          .insert({
            character_id: selectedChar.id,
            image_url: publicUrl,
            description: '参考图'
          });
        
        await fetchGallery(selectedChar.id);
        toast.success('参考图上传成功');
      }

    } catch (error: any) {
      console.error(error);
      toast.error('上传失败: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteGalleryImage = async (imgId: string) => {
    const { error } = await supabase.from('character_images').delete().eq('id', imgId);
    if (!error) {
      setGallery(g => g.filter(i => i.id !== imgId));
      toast.success('图片已删除');
    }
  };

  // UI 渲染
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans flex gap-6">
      <Toaster position="top-center" richColors />

      {/* === 左侧：角色列表 === */}
      <div className="w-1/4 min-w-[250px] bg-[#111] rounded-2xl border border-white/10 p-4 flex flex-col h-[calc(100vh-3rem)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="text-yellow-500" /> 角色库
          </h2>
          <button 
            onClick={() => { setSelectedChar(null); setName(''); setDesc(''); setNegPrompt(''); }}
            className="p-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {isLoading ? (
             <div className="text-zinc-500 text-center py-10">加载中...</div>
          ) : characters.map(char => (
            <div 
              key={char.id}
              onClick={() => setSelectedChar(char)}
              className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${
                selectedChar?.id === char.id 
                ? 'bg-zinc-800 border-yellow-500/50' 
                : 'hover:bg-zinc-900 border-transparent'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden relative shrink-0">
                {char.avatar_url ? (
                  <Image src={char.avatar_url} alt={char.name} fill className="object-cover" />
                ) : (
                  <User className="w-full h-full p-2 text-zinc-500" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm truncate">{char.name}</p>
                <p className="text-xs text-zinc-500 truncate">{char.description || '暂无描述'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === 右侧：详情编辑区 === */}
      <div className="flex-1 bg-[#111] rounded-2xl border border-white/10 p-8 overflow-y-auto h-[calc(100vh-3rem)]">
        
        {/* 顶部标题栏 */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{selectedChar ? '编辑角色' : '新建角色'}</h1>
            <p className="text-zinc-500 text-sm">配置角色的外貌特征、参考图，以供 CineFlow 引擎调用。</p>
          </div>
          {selectedChar && (
            <button 
              onClick={handleDeleteCharacter}
              className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition flex items-center gap-2 text-sm"
            >
              <Trash2 size={16} /> 删除角色
            </button>
          )}
        </div>

        <div className="flex gap-8">
          {/* A. 基础信息卡片 */}
          <div className="w-1/3 space-y-6">
            {/* 头像上传 */}
            <div className="flex flex-col items-center gap-4">
               <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center relative overflow-hidden group">
                  {selectedChar?.avatar_url ? (
                    <Image src={selectedChar.avatar_url} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-zinc-600" />
                  )}
                  {/* Hover Upload Mask */}
                  {selectedChar && (
                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                      <Upload className="w-6 h-6 text-white mb-1" />
                      <span className="text-[10px] text-white">更换头像</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, true)} disabled={isUploading} />
                    </label>
                  )}
               </div>
               <p className="text-xs text-zinc-500">建议上传正方形头像</p>
            </div>

            {/* 表单 */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">角色姓名</label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:border-yellow-500 outline-none"
                  placeholder="例如：Jinx"
                />
              </div>

              {/* 正面描述 */}
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">
                  外貌描述 (Prompt) <span className="text-yellow-500">*核心</span>
                </label>
                <textarea 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:border-yellow-500 outline-none resize-none leading-relaxed"
                  placeholder="详细描述角色的外貌特征，例如：Blue hair, double ponytails, red eyes, cyberpunk jacket..."
                />
              </div>

              {/* [New] 负面提示词 */}
              <div>
                <label className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
                  <Ban size={12} /> 负面提示词 (Negative Prompt)
                </label>
                <textarea 
                  value={negPrompt}
                  onChange={(e) => setNegPrompt(e.target.value)}
                  className="w-full h-20 bg-black/50 border border-red-900/30 focus:border-red-500/50 rounded-lg p-3 text-sm outline-none resize-none leading-relaxed text-zinc-300 placeholder-zinc-600"
                  placeholder="想避免的特征，例如：glasses, hat, ugly, beard..."
                />
                <p className="text-[10px] text-zinc-500 mt-2">这些特征将在生成时被强制移除。</p>
              </div>

              <button 
                onClick={handleSaveCharacter}
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition flex items-center justify-center gap-2"
              >
                <Save size={16} /> {selectedChar ? '保存修改' : '创建角色'}
              </button>
            </div>
          </div>

          {/* B. 资产画廊 (仅在选中角色时显示) */}
          {selectedChar ? (
             <div className="flex-1 border-l border-white/10 pl-8">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-bold flex items-center gap-2">
                     <LayoutGrid className="text-purple-500" /> 参考图画廊 (Reference Gallery)
                   </h3>
                   <label className={`bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploading ? <Loader2 className="animate-spin w-3 h-3"/> : <Plus className="w-3 h-3" />}
                      上传参考图
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleUploadImage(e, false)} disabled={isUploading} />
                   </label>
                </div>

                {gallery.length === 0 ? (
                  <div className="h-64 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600">
                     <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                     <p className="text-sm">暂无参考图</p>
                     <p className="text-xs opacity-50">上传三视图、表情包等素材</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {gallery.map(img => (
                       <div key={img.id} className="relative aspect-square bg-zinc-900 rounded-xl overflow-hidden group border border-transparent hover:border-purple-500/50 transition-all">
                          <Image src={img.image_url} alt="Ref" fill className="object-cover" />
                          {/* 删除遮罩 */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                             <button 
                               onClick={() => window.open(img.image_url, '_blank')}
                               className="p-2 bg-white/20 rounded-full hover:bg-white text-white hover:text-black transition"
                             >
                               <MoreHorizontal size={14} />
                             </button>
                             <button 
                               onClick={() => handleDeleteGalleryImage(img.id)}
                               className="p-2 bg-red-500/20 rounded-full hover:bg-red-500 text-white transition"
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                          {/* 标签 */}
                          {img.is_primary && (
                            <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">主图</div>
                          )}
                       </div>
                     ))}
                  </div>
                )}
             </div>
          ) : (
            <div className="flex-1 border-l border-white/10 pl-8 flex items-center justify-center text-zinc-600">
               <div className="text-center">
                 <User className="w-16 h-16 mx-auto mb-4 opacity-10" />
                 <p>请选择或创建一个角色</p>
                 <p className="text-sm opacity-50">以管理其参考图资产</p>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}