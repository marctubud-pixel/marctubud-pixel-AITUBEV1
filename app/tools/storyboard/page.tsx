'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Zap, Moon, Sun, Globe, User } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

// API Actions
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { repaintShotWithCharacter } from '@/app/actions/repaint'; 
import { createClient } from '@/utils/supabase/client';
import { exportStoryboardPDF } from '@/utils/export-pdf';
import { parseFileToText } from '@/utils/file-parsers';
import { exportStoryboardZIP } from '@/utils/export-zip';

// Dnd Kit
import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Import Refactored Components
import StepInput from './_components/StepInput';
import StepReview from './_components/StepReview';
import StepRender from './_components/StepRender';

// ✅ 修复点：引入默认导出的 StoryboardModals
import StoryboardModals from './_components/StoryboardModals';

// 🟢 [新增] 引入导演搜图弹窗
import { ImageSearchModal } from '@/components/ImageSearchModal';

import { StoryboardPanel, Character, WorkflowStep, Lang, Theme, ExportMeta } from './types';
import { TRANSLATIONS, STYLE_OPTIONS, ASPECT_RATIOS, STOP_WORDS } from './constants';

// 🟢 辅助函数：清洗指定角色的 Prompt 标签
const removeCharacterFromPrompt = (originalPrompt: string, charName: string) => {
    if (!originalPrompt) return "";
    const safeName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\(Character:\\s*${safeName},[^)]*\\)`, 'gi');
    return originalPrompt.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
};

export default function StoryboardPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const isDark = theme === 'dark';
  const [lang, setLang] = useState<Lang>('zh');
  const t = TRANSLATIONS[lang];

  const [script, setScript] = useState('');
  const [globalAtmosphere, setGlobalAtmosphere] = useState('');
  const [sceneDescription, setSceneDescription] = useState(''); 
  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); 
  const [stylePreset, setStylePreset] = useState<string>('realistic');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDrawing, setIsDrawing] = useState(false);      
  const [isExporting, setIsExporting] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null); 
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [isMockMode, setIsMockMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false); 
  const [useInstantID, setUseInstantID] = useState(false); 
  
  // Modals
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const [uploadedStyleRef, setUploadedStyleRef] = useState<string | null>(null);
  
  // Lightbox & Casting State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRepainting, setIsRepainting] = useState(false);
  const [showCastingModal, setShowCastingModal] = useState(false);

  // Other Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

  const [batchTargetChar, setBatchTargetChar] = useState<Character | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // 🟢 [新增] 导演模式：搜图弹窗状态
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  const supabase = useMemo(() => createClient(), []); 
  const tempProjectId = "temp_workspace"; 

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => { setActiveDragId(event.active.id as string); };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPanels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveDragId(null);
  };

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase.from('characters').select('id, name, avatar_url, description').order('created_at', { ascending: false });
      if (!error) setCharacters(data as Character[] || []);
    };
    fetchCharacters();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft') setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      if (e.key === 'ArrowRight') setLightboxIndex(prev => (prev !== null && prev < panels.length - 1 ? prev + 1 : prev));
      if (e.key === 'Escape') setLightboxIndex(null); 
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, panels.length]);

  const handleScriptKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          if (e.shiftKey) {
          } else {
              e.preventDefault();
              if (!isAnalyzing && script.trim()) {
                  handleAnalyzeScript();
              }
          }
      }
  };

  const handleScriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        toast.info(t.analyzing);
        const text = await parseFileToText(file);
        if (text) {
            setScript(prev => prev + (prev ? '\n\n' : '') + text);
            toast.success(`Loaded: ${file.name}`);
        }
    } catch (error: any) { toast.error(error.message); } 
    finally { e.target.value = ''; }
  };

  const handleAnalyzeScript = async () => {
    if (!script.trim()) return;
    setIsAnalyzing(true);
    setPanels([]); 
    try {
      const breakdown = await analyzeScript(script);
      const initialPanels: StoryboardPanel[] = breakdown.panels.map((p: any) => ({
        id: crypto.randomUUID(), 
        description: p.description,
        shotType: p.shotType || 'MID SHOT',
        cameraAngle: 'EYE LEVEL', 
        environment: '', prompt: p.visualPrompt, isLoading: false, 
        characterIds: [], characterAvatars: []
      }));
      setPanels(initialPanels);
      setStep('review'); 
      toast.success('Script analyzed');
    } catch (error: any) { console.error(error); toast.error(error.message); } 
    finally { setIsAnalyzing(false); }
  };

  const handleUpdatePanel = (id: string, field: keyof StoryboardPanel, value: any) => {
    setPanels(current => current.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const handleDeletePanel = (id: string) => {
    setPanels(current => current.filter(p => p.id !== id));
  };
  const handleAddPanel = () => {
    setPanels(current => [...current, {
        id: crypto.randomUUID(), description: "", shotType: "MID SHOT", cameraAngle: "EYE LEVEL", environment: "", prompt: "", isLoading: false, characterIds: [], characterAvatars: []
    }]);
  };

  const handleStyleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const fakeUrl = URL.createObjectURL(file);
          setUploadedStyleRef(fakeUrl);
          toast.success("Style Reference Uploaded");
      }
  };

  // 🟢 [新增] 导演模式：打开搜图弹窗
  const handleOpenSearch = (index: number) => {
    setActiveSearchIndex(index);
    setIsSearchOpen(true);
  };

  // 🟢 [新增] 导演模式：选中图片回调
  const handleSelectImage = (imageUrl: string) => {
    if (activeSearchIndex !== null) {
      setPanels(current => current.map((p, idx) => {
        if (idx === activeSearchIndex) {
            // 将图片存入 referenceImage
            return { ...p, referenceImage: imageUrl };
        }
        return p;
      }));
      
      toast.success("已添加参考图");
      setIsSearchOpen(false);
      setActiveSearchIndex(null);
    }
  };

  const handleOpenCharModal = (panelId: string) => { setActivePanelIdForModal(panelId); setShowCharModal(true); }
  
  const handlePreSelectCharacter = (char: Character) => {
    if (!activePanelIdForModal) return;
    
    const targetPanel = panels.find(p => p.id === activePanelIdForModal);
    if (!targetPanel) return;

    const currentIds = targetPanel.characterIds || [];
    const isSelected = currentIds.includes(char.id);

    if (isSelected) {
        setPanels(current => current.map(p => {
            if (p.id === activePanelIdForModal) {
                const cleanedPrompt = removeCharacterFromPrompt(p.prompt, char.name);
                return {
                    ...p,
                    characterIds: p.characterIds?.filter(id => id !== char.id) || [],
                    characterAvatars: p.characterAvatars?.filter(url => url !== char.avatar_url) || [],
                    prompt: cleanedPrompt 
                };
            }
            return p;
        }));
        toast.success(`已移除角色: ${char.name}`);
    } else {
        setBatchTargetChar(char);
        setShowBatchConfirm(true); 
    }     
};

const executeCharacterInject = async (isBatch: boolean) => {
    if (!activePanelIdForModal || !batchTargetChar) return;
    
    const targetChar = batchTargetChar;
    const targetPanelId = activePanelIdForModal;
    
    // 1. 准备工作
    const charInfo = (targetChar.description + " " + targetChar.name).toLowerCase();

    // 2. 硬特征库
    const traitDefinitions = [
        {
            id: 'gender_male', 
            triggers: ['man', 'boy', 'he ', 'him', 'male', 'father', 'brother', 'son', '男', '父', '兄', '弟'],
            keywords: ['man', 'boy', 'he ', 'him', 'male', 'guy', 'father', 'dad', 'brother', 'son', '男', '父', '兄', '弟', 'gentleman']
        },
        {
            id: 'gender_female', 
            triggers: ['woman', 'girl', 'she ', 'her', 'female', 'mother', 'sister', 'daughter', '女', '母', '姐', '妹'],
            keywords: ['woman', 'girl', 'she ', 'her', 'female', 'lady', 'mother', 'mom', 'sister', 'daughter', '女', '母', '姐', '妹', 'lady']
        },
        {
            id: 'age_child',
            triggers: ['child', 'kid', 'baby', 'young', 'teen', '孩', '童', '少', '小', '幼'],
            keywords: ['child', 'kid', 'baby', 'young', 'youth', 'teen', 'toddler', '孩', '童', '婴', '少', '小', '幼']
        },
        {
            id: 'age_elder',
            triggers: ['old', 'elder', 'grandpa', 'grandma', 'senior', 'aged', '老', '长者', '爷', '奶'],
            keywords: ['old', 'elder', 'grandpa', 'grandma', 'senior', 'aged', 'gray', '老', '长者', '祖', '爷', '奶']
        }
    ];

    // 3. 构建匹配词列表
    let targetKeywords = ['person', 'character', 'protagonist', 'actor', 'someone', '人', '主角', '角色', '演员', '人物'];
    
    traitDefinitions.forEach(trait => {
        if (trait.triggers.some(t => charInfo.includes(t))) {
            targetKeywords = [...targetKeywords, ...trait.keywords];
        }
    });

    const rawWords = targetChar.description
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") 
        .split(/\s+/); 
    
    const dynamicTraits = rawWords.filter(w => w.length > 2 && !STOP_WORDS.has(w));
    targetKeywords = [...targetKeywords, ...dynamicTraits];
    targetKeywords = Array.from(new Set(targetKeywords));
    
    console.log(`[Casting] Character: ${targetChar.name}`);
    console.log(`[Casting] Extracted Traits:`, dynamicTraits); 
    console.log(`[Casting] Final Match Keywords:`, targetKeywords);

    setPanels(current => current.map(p => {
        const desc = p.description.toLowerCase();
        const hasKeyword = targetKeywords.some(k => desc.includes(k)) || desc.includes(targetChar.name.toLowerCase());
        const shouldUpdate = p.id === targetPanelId || (isBatch && (hasKeyword || desc.length < 5));
        
        if (shouldUpdate) {
            const currentIds = p.characterIds || [];
            const currentAvatars = p.characterAvatars || [];
            
            let newIds = [...currentIds];
            let newAvatars = [...currentAvatars];

            if (!newIds.includes(targetChar.id)) {
                if (newIds.length >= 2) {
                    newIds.shift(); newAvatars.shift(); 
                }
                newIds.push(targetChar.id);
                newAvatars.push(targetChar.avatar_url || '');
            }

            let newPrompt = removeCharacterFromPrompt(p.prompt, targetChar.name);
            const charPrompt = ` (Character: ${targetChar.name}, ${targetChar.description})`;
            newPrompt = `${newPrompt}${charPrompt}`;

            return { ...p, characterIds: newIds, characterAvatars: newAvatars, prompt: newPrompt };
        }
        return p;
    }));

    toast.success(isBatch ? `${t.batchLinked}: ${targetChar.name}` : `${t.linked}: ${targetChar.name}`);
    
    setShowBatchConfirm(false);
    setShowCharModal(false);
    setShowCastingModal(false);

    if (lightboxIndex !== null && panels[lightboxIndex].id === targetPanelId) {
        await triggerRepaint(targetChar); 
    }

    setBatchTargetChar(null);
    if (lightboxIndex === null) {
        setActivePanelIdForModal(null);
    }
};

  const toggleAtmosphere = (tag: string) => {
      if (globalAtmosphere.includes(tag)) {
          setGlobalAtmosphere(prev => prev.replace(tag, "").replace(/,\s*,/g, ",").replace(/^,|,$/g, ""));
      } else {
          setGlobalAtmosphere(prev => prev ? `${prev}, ${tag}` : tag);
      }
  };

  // 🟢 [升级版 V2] 修复“无人场景出现鬼影”的 BUG
  // 策略：正向明确声明 + 负向核弹级压制
  const buildActionPrompt = (panel: StoryboardPanel) => {
    let desc = panel.description;
    const isChinese = /[\u4e00-\u9fa5]/.test(desc);
    
    // 1. 关键词定义 (保持不变)
    const humanKeywords = ['man', 'woman', 'people', 'person', 'character', 'figure', 'body', '男', '女', '人', '他', '她'];
    const emptyKeywords = ['no people', 'no one', 'nobody', 'empty', 'vacant', 'deserted', 'scenery only', '没有', '无人', '空', '勿', '零'];

    const hasDefinedChar = panel.characterIds && panel.characterIds.length > 0;
    const hasHumanText = humanKeywords.some(k => desc.toLowerCase().includes(k));
    const hasEmptyText = emptyKeywords.some(k => desc.toLowerCase().includes(k));

    // 逻辑：只要有空镜词，就强制认为是无人
    const shouldHaveHumans = hasDefinedChar || (hasHumanText && !hasEmptyText);

    let finalPrompt = "";
    
    // 风格
    const currentStyle = STYLE_OPTIONS.find(s => s.value === stylePreset) || STYLE_OPTIONS[0];
    finalPrompt += `(${currentStyle.prompt}), `;

    if (panel.shotType) finalPrompt += `${panel.shotType}, `;
    if (panel.cameraAngle) finalPrompt += `${panel.cameraAngle}, `;

    // 🟢 [核心修改点] 双重保险逻辑 V2
    if (!shouldHaveHumans) {
        // 策略A: 负面提示词增强 (权重提升到 2.0, 增加词汇量)
        // 告诉 AI：画面里绝对不能出现这些东西
        finalPrompt += `(no humans, no people, nobody, empty scene, vacant, deserted, scenery only, architectural photography, stillness:2.0), `;
        
        // 策略B: 正向提示词引导 (关键!)
        // 明确告诉 AI：这是一个空镜头。这比单纯写描述更有效。
        if (isChinese) {
            finalPrompt += `空镜头，无人场景，静止画面，${desc}, `;
        } else {
            finalPrompt += `Empty shot of, deserted scene, stillness, ${desc}, `;
        }
    } else {
        // 如果有人，就正常连接
        finalPrompt += `${desc}, `;
    }

    // 环境与氛围 (保持不变)
    const effectiveEnv = panel.environment?.trim() || sceneDescription;
    if (effectiveEnv) finalPrompt += `(Environment: ${effectiveEnv}), `;
    
    const atmospherePart = globalAtmosphere.trim() ? `(Atmosphere: ${globalAtmosphere}), ` : '';
    if (atmospherePart) finalPrompt += atmospherePart;

    // 保留手动 Prompt 覆盖逻辑
    if (panel.prompt && panel.prompt.length > 10) return `(${currentStyle.prompt}), ${panel.prompt}`;
    
    return finalPrompt;
  };

  const handleGenerateSingleImage = async (panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: true } : p));
    try {
        const tempShotId = `shot_${Date.now()}`; 
        const actionPrompt = buildActionPrompt(panel);
        const primaryCharId = panel.characterIds?.[0]; 
        
        // 🟢 获取负面提示词
        const currentStyleConfig = STYLE_OPTIONS.find(s => s.value === stylePreset) || STYLE_OPTIONS[0];
        let negPrompt = currentStyleConfig.negative || "bad quality";

        const res = await generateShotImage(
            tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
            primaryCharId, undefined, undefined, isMockMode, 
            panel.cameraAngle || 'EYE LEVEL',
            useInstantID,
            negPrompt // 传入
        );
        if (res.success) {
            setPanels(current => current.map(p => p.id === panelId ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
            toast.success('Shot Rendered');
        } else { throw new Error((res as any).message); }
    } catch (error: any) { toast.error(error.message); setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: false } : p)); }
  };

  // 🟢 核心修改：handleGenerateImages (中间层增强)
  // 注入 Negative Prompt
  const handleGenerateImages = async () => {
    setStep('generating');
    setIsDrawing(true);

    const toastId = toast.loading(t.rendering);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));

    // 1. 获取当前风格的配置
    const currentStyleConfig = STYLE_OPTIONS.find(s => s.value === stylePreset) || STYLE_OPTIONS[0];

    for (const panel of panels) {
        try {
            const tempShotId = `shot_${Date.now()}_${panel.id.substring(0, 4)}`;
            
            // 2. 构建 Prompt
            let finalPrompt = buildActionPrompt(panel);
            
            // 3. 注入角色描述
            if (panel.characterIds && panel.characterIds.length > 0) {
                const selectedChars = characters.filter(c => panel.characterIds?.includes(c.id));
                selectedChars.forEach(char => {
                    if (!finalPrompt.includes(char.name)) {
                        finalPrompt += ` (Character: ${char.name}, ${char.description})`;
                    }
                });
            }

            // 🟢 4. 构建 Negative Prompt (动态构建 - 逻辑同步升级)
            let negPrompt = currentStyleConfig.negative || "bad quality, low resolution";
            
            // 重新运行一遍判定逻辑
            const humanKeywords = ['man', 'woman', 'people', 'person', '人', '男', '女']; 
            const emptyKeywords = ['no people', 'no one', 'nobody', 'empty', '没有', '无人', '空'];
            
            const descLower = panel.description.toLowerCase();
            const hasHumanText = humanKeywords.some(k => descLower.includes(k));
            const hasEmptyText = emptyKeywords.some(k => descLower.includes(k));
            const hasDefinedChar = panel.characterIds && panel.characterIds.length > 0;
            
            // 判定：应该有人吗？
            const shouldHaveHumans = hasDefinedChar || (hasHumanText && !hasEmptyText);
            
            if (!shouldHaveHumans) {
                // 🟢 如果判定为无人，负面提示词里疯狂加人，防止AI画人
                negPrompt += ", people, person, man, woman, crowd, human, face, body, character, figure";
            } else {
                // 如果有人，但不是人群，防止画多人
                if (!descLower.includes('crowd') && !descLower.includes('people') && !descLower.includes('群')) {
                    negPrompt += ", crowd, extra people, multiple views";
                }
            }

            const primaryCharId = panel.characterIds?.[0];
            
            const res = await generateShotImage(
              tempShotId, 
              finalPrompt, 
              tempProjectId, 
              mode === 'draft', 
              stylePreset, 
              aspectRatio, 
              panel.shotType, 
              primaryCharId, 
              undefined, 
              undefined, 
              isMockMode,
              panel.cameraAngle || 'EYE LEVEL',
              useInstantID,
              negPrompt // <--- 🟢 关键：传入负向提示词
            );

            if (res.success) {
              setPanels(current => current.map(p => p.id === panel.id ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
            } else {
              setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
            }
        } catch (e: any) { 
            console.error(e);
            setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
        }
    }
    setIsDrawing(false);
    setStep('done');
    toast.dismiss(toastId);
    toast.success(t.genComplete);
  };

  const triggerRepaint = async (charOverride?: Character) => {
    const targetChar = charOverride || batchTargetChar; 
    
    if (lightboxIndex === null || !targetChar) return;
    
    const currentPanel = panels[lightboxIndex]; 
    setIsRepainting(true);
    
    try {
        let actionPrompt = buildActionPrompt(currentPanel);
        const charPrompt = `(Character: ${targetChar.name}, ${targetChar.description})`;
        if (!actionPrompt.includes(targetChar.name)) {
            actionPrompt = `${actionPrompt} ${charPrompt}`;
        }

        const res = await repaintShotWithCharacter(
            currentPanel.id,
            currentPanel.imageUrl!,
            targetChar.id, 
            actionPrompt,
            tempProjectId,
            aspectRatio,
            mode === 'draft',
            useInstantID
        );

        if (res.success) {
            setPanels(current => current.map(p => p.id === currentPanel.id ? { ...p, imageUrl: (res as any).url } : p));
            toast.success("Repainted!");
        } else {
            throw new Error((res as any).message);
        }
    } catch (e: any) { 
        toast.error(e.message); 
    } finally { 
        setIsRepainting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info(t.zipping.replace('素材', 'PDF'));
      
      const metaData = {
          projectName: exportMeta.projectName || t.defaultFileName, 
          author: exportMeta.author || "Director",
          notes: exportMeta.notes || ""
      };
      
      await exportStoryboardPDF(metaData, panels);
      
      toast.success(t.pdfExported);
      setShowExportModal(false);
    } catch (error: any) { console.error(error); toast.error('Export failed'); } finally { setIsExporting(false); }
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      toast.info(t.zipping);
      const fileName = script.slice(0, 20).trim() || t.defaultFileName;
      await exportStoryboardZIP(fileName, panels);
      toast.success(t.zipDownloaded);
    } catch (error) { 
      toast.error('Export failed'); 
    } finally { 
      setIsExporting(false); 
    }
  };

  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";
  const headerBg = isDark ? "bg-[#131314]/80 border-white/5" : "bg-[#f0f4f9]/80 border-black/5";

  const getLocalizedShotLabel = (shotType: string) => {
    if (!shotType) return t.shotFallback;
    const upper = shotType.toUpperCase();
    if (upper.includes("EXTREME LONG") || upper.includes("EXTREME WIDE")) return "大远景";
    if (upper.includes("LONG") || upper.includes("WIDE")) return "全景";
    if (upper.includes("FULL")) return "全身";
    if (upper.includes("MEDIUM") || upper.includes("MID")) return "中景";
    if (upper.includes("EXTREME CLOSE")) return "大特写";
    if (upper.includes("CLOSE")) return "特写";
    return shotType.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#131314] text-white" : "bg-[#f0f4f9] text-gray-900"} font-sans transition-colors duration-300`}>
      <Toaster position="top-center" richColors theme={isDark ? "dark" : "light"}/>
      
      <StoryboardModals 
         t={t} isDark={isDark} lightboxIndex={lightboxIndex} setLightboxIndex={setLightboxIndex} panels={panels} isRepainting={isRepainting}
         triggerRepaint={triggerRepaint} setActivePanelIdForModal={setActivePanelIdForModal} setShowCastingModal={setShowCastingModal}
         getLocalizedShotLabel={getLocalizedShotLabel} showBatchConfirm={showBatchConfirm} setShowBatchConfirm={setShowBatchConfirm}
         batchTargetChar={batchTargetChar} setBatchTargetChar={setBatchTargetChar} executeCharacterInject={executeCharacterInject}
         showStyleModal={showStyleModal} setShowStyleModal={setShowStyleModal} handleStyleUpload={handleStyleUpload} uploadedStyleRef={uploadedStyleRef}
         stylePreset={stylePreset} setStylePreset={setStylePreset} showAtmosphereModal={showAtmosphereModal} setShowAtmosphereModal={setShowAtmosphereModal}
         toggleAtmosphere={toggleAtmosphere} globalAtmosphere={globalAtmosphere} showCharModal={showCharModal} setShowCharModal={setShowCharModal}
         showCastingModal={showCastingModal} characters={characters} activePanelIdForModal={activePanelIdForModal} handlePreSelectCharacter={handlePreSelectCharacter}
         showExportModal={showExportModal} setShowExportModal={setShowExportModal} exportMeta={exportMeta} setExportMeta={setExportMeta}
         handleExportPDF={handleExportPDF} isExporting={isExporting}
      />

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b h-16 flex items-center justify-between px-6 transition-colors duration-300 ${headerBg}`}>
        <div className="flex items-center gap-6">
           <Link href="/tools" className="flex items-center text-zinc-500 hover:text-blue-500 transition-colors text-sm font-bold gap-2"><ArrowLeft size={18}/> {t.back}</Link>
           <div className="flex items-center gap-2 text-xs font-bold">
               <span className={`px-3 py-1 rounded-full ${step === 'input' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step1}</span>
               <span className="text-zinc-300 dark:text-zinc-700">/</span>
               <span className={`px-3 py-1 rounded-full ${step === 'review' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step2}</span>
               <span className="text-zinc-300 dark:text-zinc-700">/</span>
               <span className={`px-3 py-1 rounded-full ${step === 'generating' || step === 'done' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step3}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
             <button onClick={() => setIsMockMode(!isMockMode)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${isMockMode ? 'bg-green-500/10 border-green-500 text-green-500' : `${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} text-zinc-500`}`}>
                <Zap size={10} fill={isMockMode ? "currentColor" : "none"}/> {isMockMode ? t.mockOn : t.mockOff}
             </button>
             <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                    {isDark ? <Moon size={18}/> : <Sun size={18}/>}
             </button>
             <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                    <Globe size={18}/>
             </button>
             <Link href="/tools/characters" className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                    <User size={18}/>
             </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-40 pb-12 px-6 min-h-screen">
      {step === 'input' && (
           <StepInput 
              isDark={isDark} t={t} script={script} setScript={setScript} handleAnalyzeScript={handleAnalyzeScript}
              isAnalyzing={isAnalyzing} handleScriptKeyDown={handleScriptKeyDown} handleScriptFileUpload={handleScriptFileUpload}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} showRatioMenu={showRatioMenu} setShowRatioMenu={setShowRatioMenu}
           />
      )}

      {step === 'review' && (
           <StepReview 
              isDark={isDark} t={t} panels={panels} mode={mode} setMode={setMode} globalAtmosphere={globalAtmosphere}
              setGlobalAtmosphere={setGlobalAtmosphere} showAtmosphereModal={showAtmosphereModal} setShowAtmosphereModal={setShowAtmosphereModal}
              stylePreset={stylePreset} showStyleModal={showStyleModal} setShowStyleModal={setShowStyleModal} useInstantID={useInstantID}
              setUseInstantID={setUseInstantID} sceneDescription={sceneDescription} setSceneDescription={setSceneDescription}
              handleGenerateImages={handleGenerateImages} isDeleteMode={isDeleteMode} setIsDeleteMode={setIsDeleteMode}
              handleAddPanel={handleAddPanel} handleDeletePanel={handleDeletePanel} handleUpdatePanel={handleUpdatePanel}
              handleOpenCharModal={handleOpenCharModal} setLightboxIndex={setLightboxIndex} currentRatioClass={currentRatioClass}
              sensors={sensors} handleDragStart={handleDragStart} handleDragEnd={handleDragEnd} activeDragId={activeDragId}
              // 🟢 关键：传入搜图方法
              handleOpenSearch={handleOpenSearch}
           />
      )}

      {(step === 'generating' || step === 'done') && (
            <StepRender 
                isDark={isDark} t={t} panels={panels} aspectRatio={aspectRatio} setStep={setStep} setScript={setScript} setPanels={setPanels}
                handleGenerateSingleImage={handleGenerateSingleImage} setLightboxIndex={setLightboxIndex} handleExportPDF={handleExportPDF}
                handleExportZIP={handleExportZIP} isExporting={isExporting} setShowExportModal={setShowExportModal}
                currentRatioClass={currentRatioClass} sensors={sensors} handleDragStart={handleDragStart} handleDragEnd={handleDragEnd}
                activeDragId={activeDragId} step={step}
            />
        )}
      </div>

      {/* 🟢 [新增] 全局搜图弹窗 */}
      <ImageSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSelectImage}
        initialQuery={activeSearchIndex !== null ? panels[activeSearchIndex]?.description : ''}
      />
    </div>
  );
}