'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Loader2, ArrowLeft, PenTool, Image as ImageIcon, Trash2, Plus, Minus,
  Download, RefreshCw, FileText, Sparkles, GripVertical, Package, RotateCcw, Zap,
  User, X, Check, Globe, Settings, ChevronRight, LayoutGrid, Palette,
  Sun, Moon, Paperclip, Ratio, Send, ChevronDown, MoreHorizontal, Flame, CloudRain, 
  Maximize2, Eye, ArrowUp, ArrowDown, Repeat, Wand2, ChevronLeft, Camera, GripHorizontal, ChevronUp, Upload,
  Users, ChevronsUpDown 
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// --- Imports from Split Files ---
import { StoryboardPanel, Character, WorkflowStep, Lang, Theme, ExportMeta } from './types';
import { TRANSLATIONS, STYLE_OPTIONS, ATMOSPHERE_TAGS, ASPECT_RATIOS, CAMERA_ANGLES, CINEMATIC_SHOTS, STOP_WORDS } from './constants';
import { PanelCard, SortablePanelItem } from './_components/PanelCard';

// --- Server Actions & Utils ---
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { repaintShotWithCharacter } from '@/app/actions/repaint'; 
import { createClient } from '@/utils/supabase/client';
import { exportStoryboardPDF } from '@/utils/export-pdf';
import { parseFileToText } from '@/utils/file-parsers';
import { exportStoryboardZIP } from '@/utils/export-zip';

// --- DnD Kit ---
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

// --- Helper Functions (Local Logic) ---

// 清洗指定角色的 Prompt 标签
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

  // Helper inside component to access translation
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

  // State
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [isMockMode, setIsMockMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false); 
  const [useInstantID, setUseInstantID] = useState(false); 
  
  // Modals & Popups State
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const [uploadedStyleRef, setUploadedStyleRef] = useState<string | null>(null);
  const styleUploadRef = useRef<HTMLInputElement>(null);

  // Lightbox & Casting State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRepainting, setIsRepainting] = useState(false);
  const [showCastingModal, setShowCastingModal] = useState(false);

  // Modal State
  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

  const [batchTargetChar, setBatchTargetChar] = useState<Character | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Refs & Supabase
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []); 
  const tempProjectId = "temp_workspace"; 

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Effects ---
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

  // --- Handlers ---

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

  const handleScriptKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!isAnalyzing && script.trim()) handleAnalyzeScript();
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

  // 🟢 角色注入逻辑 (含关键词动态提取)
  const executeCharacterInject = async (isBatch: boolean) => {
    if (!activePanelIdForModal || !batchTargetChar) return;
    
    const targetChar = batchTargetChar;
    const targetPanelId = activePanelIdForModal;
    const charInfo = (targetChar.description + " " + targetChar.name).toLowerCase();

    // 硬特征匹配
    const traitDefinitions = [
        { id: 'gender_male', triggers: ['man', 'boy', 'he ', 'him', 'male', 'father', 'brother', 'son', '男', '父', '兄', '弟'], keywords: ['man', 'boy', 'he ', 'him', 'male', 'guy', 'father', 'dad', 'brother', 'son', '男', '父', '兄', '弟', 'gentleman'] },
        { id: 'gender_female', triggers: ['woman', 'girl', 'she ', 'her', 'female', 'mother', 'sister', 'daughter', '女', '母', '姐', '妹'], keywords: ['woman', 'girl', 'she ', 'her', 'female', 'lady', 'mother', 'mom', 'sister', 'daughter', '女', '母', '姐', '妹', 'lady'] },
        { id: 'age_child', triggers: ['child', 'kid', 'baby', 'young', 'teen', '孩', '童', '少', '小', '幼'], keywords: ['child', 'kid', 'baby', 'young', 'youth', 'teen', 'toddler', '孩', '童', '婴', '少', '小', '幼'] },
        { id: 'age_elder', triggers: ['old', 'elder', 'grandpa', 'grandma', 'senior', 'aged', '老', '长者', '爷', '奶'], keywords: ['old', 'elder', 'grandpa', 'grandma', 'senior', 'aged', 'gray', '老', '长者', '祖', '爷', '奶'] }
    ];

    let targetKeywords = ['person', 'character', 'protagonist', 'actor', 'someone', '人', '主角', '角色', '演员', '人物'];
    
    traitDefinitions.forEach(trait => {
        if (trait.triggers.some(t => charInfo.includes(t))) targetKeywords = [...targetKeywords, ...trait.keywords];
    });

    const rawWords = targetChar.description.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(/\s+/);
    const dynamicTraits = rawWords.filter(w => w.length > 2 && !STOP_WORDS.has(w));
    targetKeywords = [...targetKeywords, ...dynamicTraits];
    targetKeywords = Array.from(new Set(targetKeywords));
    
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
                if (newIds.length >= 2) { newIds.shift(); newAvatars.shift(); }
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
    if (lightboxIndex === null) setActivePanelIdForModal(null);
  };

  const toggleAtmosphere = (tag: string) => {
      if (globalAtmosphere.includes(tag)) {
          setGlobalAtmosphere(prev => prev.replace(tag, "").replace(/,\s*,/g, ",").replace(/^,|,$/g, ""));
      } else {
          setGlobalAtmosphere(prev => prev ? `${prev}, ${tag}` : tag);
      }
  };

  // 🟢 Prompt 构建逻辑 (含空镜保护)
  const buildActionPrompt = (panel: StoryboardPanel) => {
    let desc = panel.description;
    const humanKeywords = ['man', 'woman', 'people', 'person', 'character', 'figure', 'body', '男', '女', '人', '他', '她'];
    const emptyKeywords = ['no people', 'no one', 'nobody', 'empty', 'vacant', 'deserted', 'scenery only', '没有', '无人', '空', '勿', '零'];

    const hasDefinedChar = panel.characterIds && panel.characterIds.length > 0;
    const hasHumanText = humanKeywords.some(k => desc.toLowerCase().includes(k));
    const hasEmptyText = emptyKeywords.some(k => desc.toLowerCase().includes(k));
    const shouldHaveHumans = hasDefinedChar || (hasHumanText && !hasEmptyText);

    let finalPrompt = "";
    const currentStyle = STYLE_OPTIONS.find(s => s.value === stylePreset) || STYLE_OPTIONS[0];
    finalPrompt += `(${currentStyle.prompt}), `;

    if (panel.shotType) finalPrompt += `${panel.shotType}, `;
    if (panel.cameraAngle) finalPrompt += `${panel.cameraAngle}, `;

    if (!shouldHaveHumans) {
        finalPrompt += `(no humans, no people, empty scene, scenery only, architectural photography:1.8), ${desc}, `;
    } else {
        finalPrompt += `${desc}, `;
    }

    const effectiveEnv = panel.environment?.trim() || sceneDescription;
    if (effectiveEnv) finalPrompt += `(Environment: ${effectiveEnv}), `;
    
    const atmospherePart = globalAtmosphere.trim() ? `(Atmosphere: ${globalAtmosphere}), ` : '';
    if (atmospherePart) finalPrompt += atmospherePart;

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
        const currentStyleConfig = STYLE_OPTIONS.find(s => s.value === stylePreset) || STYLE_OPTIONS[0];
        let negPrompt = currentStyleConfig.negative || "bad quality";

        const res = await generateShotImage(
            tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
            primaryCharId, undefined, undefined, isMockMode, 
            panel.cameraAngle || 'EYE LEVEL',
            useInstantID,
            negPrompt 
        );
        if (res.success) {
            setPanels(current => current.map(p => p.id === panelId ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
            toast.success('Shot Rendered');
        } else { throw new Error((res as any).message); }
    } catch (error: any) { toast.error(error.message); setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: false } : p)); }
  };

  const handleGenerateImages = async () => {
    setStep('generating');
    setIsDrawing(true);
    const toastId = toast.loading(t.rendering);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));

    const currentStyleConfig = STYLE_OPTIONS.find(s => s.value === stylePreset) || STYLE_OPTIONS[0];

    for (const panel of panels) {
        try {
            const tempShotId = `shot_${Date.now()}_${panel.id.substring(0, 4)}`;
            let finalPrompt = buildActionPrompt(panel);
            
            if (panel.characterIds && panel.characterIds.length > 0) {
                const selectedChars = characters.filter(c => panel.characterIds?.includes(c.id));
                selectedChars.forEach(char => {
                    if (!finalPrompt.includes(char.name)) finalPrompt += ` (Character: ${char.name}, ${char.description})`;
                });
            }

            let negPrompt = currentStyleConfig.negative || "bad quality, low resolution";
            
            const humanKeywords = ['man', 'woman', 'people', 'person', '人', '男', '女']; 
            const emptyKeywords = ['no people', 'no one', 'nobody', 'empty', '没有', '无人', '空'];
            const descLower = panel.description.toLowerCase();
            const hasHumanText = humanKeywords.some(k => descLower.includes(k));
            const hasEmptyText = emptyKeywords.some(k => descLower.includes(k));
            const hasDefinedChar = panel.characterIds && panel.characterIds.length > 0;
            const shouldHaveHumans = hasDefinedChar || (hasHumanText && !hasEmptyText);
            
            if (!shouldHaveHumans) {
                negPrompt += ", people, person, man, woman, crowd, human, face, body, character, figure";
            } else {
                if (!descLower.includes('crowd') && !descLower.includes('people') && !descLower.includes('群')) {
                    negPrompt += ", crowd, extra people, multiple views";
                }
            }

            const primaryCharId = panel.characterIds?.[0];
            
            const res = await generateShotImage(
              tempShotId, finalPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
              primaryCharId, undefined, undefined, isMockMode, 
              panel.cameraAngle || 'EYE LEVEL',
              useInstantID,
              negPrompt 
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
        if (!actionPrompt.includes(targetChar.name)) actionPrompt = `${actionPrompt} ${charPrompt}`;

        const res = await repaintShotWithCharacter(
            currentPanel.id, currentPanel.imageUrl!, targetChar.id, actionPrompt,
            tempProjectId, aspectRatio, mode === 'draft', useInstantID
        );

        if (res.success) {
            setPanels(current => current.map(p => p.id === currentPanel.id ? { ...p, imageUrl: (res as any).url } : p));
            toast.success("Repainted!");
        } else { throw new Error((res as any).message); }
    } catch (e: any) { toast.error(e.message); } 
    finally { setIsRepainting(false); }
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
    } catch (error) { toast.error('Export failed'); } finally { setIsExporting(false); }
  };

  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";
  const activePanel = activeDragId ? panels.find(p => p.id === activeDragId) : null;
  const currentLightboxPanel = lightboxIndex !== null ? panels[lightboxIndex] : null;
  
  const containerBg = isDark ? "bg-[#1e1e1e] border-zinc-800" : "bg-white border-white shadow-sm";
  const headerBg = isDark ? "bg-[#131314]/80 border-white/5" : "bg-[#f0f4f9]/80 border-black/5";
  const inputBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
  const buttonBg = isDark ? "bg-[#2d2d2d] hover:bg-[#3d3d3d]" : "bg-[#e3e3e3] hover:bg-[#d3d3d3] text-black";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#131314] text-white" : "bg-[#f0f4f9] text-gray-900"} font-sans transition-colors duration-300`}>
      <Toaster position="top-center" richColors theme={isDark ? "dark" : "light"}/>
      
      {currentLightboxPanel && currentLightboxPanel.imageUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="absolute top-6 left-6 z-50">
                    <span className="text-white/60 font-black text-2xl font-mono tracking-widest bg-black/30 px-3 py-1 rounded-lg backdrop-blur-md">
                        {t.shotPrefix} {String((lightboxIndex??0) + 1).padStart(2, '0')}
                    </span>
              </div>
              <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-md cursor-pointer"><X size={28} /></button>
              <div className="relative w-full h-[85vh] flex items-center justify-center group">
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex > 0 ? lightboxIndex - 1 : lightboxIndex)} className="absolute left-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronLeft size={32}/></button>
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex < panels.length - 1 ? lightboxIndex + 1 : lightboxIndex)} className="absolute right-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronRight size={32}/></button>
                  <img src={currentLightboxPanel.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                  {isRepainting && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"><Loader2 className="animate-spin text-white w-12 h-12"/><span className="text-white font-bold mt-4">{t.loading}</span></div>}
                  <div className="absolute bottom-0 left-0 right-0 w-full p-10 pt-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex justify-between items-end pointer-events-none rounded-b-lg">
                      <div className="max-w-4xl space-y-3 pointer-events-auto">
                          <p className="text-white/95 text-xl font-medium leading-relaxed drop-shadow-md">{currentLightboxPanel.description}</p>
                          <div className="flex gap-4 text-white/60 font-mono text-xs font-bold tracking-wider uppercase">
                              <span>{t.shotSize}: {getLocalizedShotLabel(currentLightboxPanel.shotType)}</span>
                              <span className="opacity-30">|</span>
                              <span>{t.angle}: {CAMERA_ANGLES.find(a => a.value === currentLightboxPanel.cameraAngle)?.label.replace('👁️', '').split('(')[0].trim() || currentLightboxPanel.cameraAngle}</span>
                          </div>
                      </div>
                      <div className="pointer-events-auto">
                          <button onClick={() => { setActivePanelIdForModal(currentLightboxPanel.id); setShowCastingModal(true); }} disabled={isRepainting} className="px-6 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer">
                              <User size={18} /> {t.casting}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showBatchConfirm && batchTargetChar && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className={`w-[400px] ${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} border rounded-3xl p-6 shadow-2xl space-y-6`}>
                  <div className="text-center space-y-3">
                      <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-blue-500 shadow-lg bg-gray-100 flex items-center justify-center">
                          {batchTargetChar.avatar_url ? <img src={batchTargetChar.avatar_url} className="w-full h-full object-cover"/> : <User size={32} className="text-gray-400"/>}
                      </div>
                      <div>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>{t.apply} {batchTargetChar.name}?</h3>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => { setShowBatchConfirm(false); setBatchTargetChar(null); }} className={`px-4 py-3 rounded-xl font-bold text-sm cursor-pointer border transition-colors ${isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>{t.cancel}</button>
                      <button onClick={() => executeCharacterInject(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}>{t.onlyThisShot}</button>
                      <button onClick={() => executeCharacterInject(true)} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"><Sparkles size={16}/> {t.applyAll}</button>
                  </div>
              </div>
          </div>
      )}

      {showStyleModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowStyleModal(false)}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                      <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-black'}`}>{t.selectStyle}</h3>
                      <button onClick={() => setShowStyleModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase">{t.uploadRef}</label>
                            <div className={`border-2 border-dashed ${isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-gray-200 hover:border-gray-400'} rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative`}>
                                <input type="file" ref={styleUploadRef} onChange={handleStyleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"/>
                                {uploadedStyleRef ? (
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                         <img src={uploadedStyleRef} className="w-full h-full object-cover" />
                                         <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check className="text-white drop-shadow-md" size={32}/></div>
                                    </div>
                                ) : (
                                    <>
                                     <Upload className="text-zinc-500 mb-2"/>
                                     <span className="text-xs text-zinc-500 font-medium">{t.clickToUpload}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {STYLE_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => { setStylePreset(opt.value); setShowStyleModal(false); }} className={`relative aspect-square rounded-xl border transition-all overflow-hidden group text-left p-3 flex flex-col justify-end cursor-pointer ${stylePreset === opt.value ? 'border-blue-500 ring-2 ring-blue-500' : `${isDark ? 'border-zinc-800' : 'border-gray-200'}`}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                                        <div className="relative z-10">
                                            <span className={`text-xs font-bold block ${isDark || stylePreset === opt.value ? 'text-white' : 'text-gray-800'}`}>{opt.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                  </div>
              </div>
          </div>
      )}

      {showAtmosphereModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowAtmosphereModal(false)}>
            <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-[300px] rounded-2xl border overflow-hidden shadow-2xl flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center"><h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{t.moreAtmosphere}</h3><button onClick={() => setShowAtmosphereModal(false)}><X size={16}/></button></div>
                <div className="p-2 overflow-y-auto custom-scrollbar max-h-[300px]">
                    {ATMOSPHERE_TAGS.map(tag => (
                        <button key={tag.label} onClick={() => toggleAtmosphere(tag.val)} className={`w-full text-left px-3 py-3 text-xs font-bold border-b border-white/5 flex justify-between items-center cursor-pointer ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <span>{tag.label}</span>
                            {globalAtmosphere.includes(tag.val) && <Check size={14} className="text-blue-500"/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {(showCharModal || showCastingModal) && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className={`font-bold flex items-center gap-2 text-lg ${isDark ? 'text-white' : 'text-black'}`}><Users size={20} className="text-blue-500"/> {t.charLib}</h3><button onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}><X size={20}/></button></div>
                  <div className="p-6 grid grid-cols-4 gap-4 overflow-y-auto custom-scrollbar">
                      {characters.map(char => {
                          const activePanel = panels.find(p => p.id === activePanelIdForModal);
                          const isSelected = activePanel?.characterIds?.includes(char.id);
                          return (
                              <button key={char.id} onClick={() => handlePreSelectCharacter(char)} className={`group relative aspect-square rounded-2xl border overflow-hidden transition-all shadow-md cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-white/10 hover:border-blue-500'}`}>
                                  {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500"/> : <User className="text-zinc-700 m-auto"/>}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3"><span className="text-xs font-bold text-white truncate">{char.name}</span></div>
                                  {isSelected && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg z-10 animate-in zoom-in"><Check size={12} strokeWidth={4} /></div>}
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-md rounded-3xl border p-6 space-y-6 shadow-2xl`}>
              <div><h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.exportTitle}</h3><p className="text-sm text-zinc-500">{t.exportDesc}</p></div>
              <div className="space-y-4">
                 <div><label className="text-xs font-bold text-zinc-500 mb-1 block">{t.projName}</label><input value={exportMeta.projectName} onChange={e => setExportMeta({...exportMeta, projectName: e.target.value})} className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} placeholder={t.projNamePlaceholder} /></div>
                 <div><label className="text-xs font-bold text-zinc-500 mb-1 block">{t.author}</label><input value={exportMeta.author} onChange={e => setExportMeta({...exportMeta, author: e.target.value})} className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} placeholder={t.authorPlaceholder} /></div>
                 <div><label className="text-xs font-bold text-zinc-500 mb-1 block">{t.notes}</label><textarea value={exportMeta.notes} onChange={e => setExportMeta({...exportMeta, notes: e.target.value})} className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-20 resize-none`} placeholder={t.notesPlaceholder} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => setShowExportModal(false)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${buttonBg}`}>{t.cancel}</button>
                 <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer">{isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Check size={16}/>} {t.confirmExport}</button>
              </div>
           </div>
        </div>
      )}

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
             <button onClick={() => setIsMockMode(!isMockMode)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${isMockMode ? 'bg-green-500/10 border-green-500 text-green-500' : `${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} text-zinc-500`}`}><Zap size={10} fill={isMockMode ? "currentColor" : "none"}/> {isMockMode ? t.mockOn : t.mockOff}</button>
             <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>{isDark ? <Moon size={18}/> : <Sun size={18}/>}</button>
             <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}><Globe size={18}/></button>
             <Link href="/tools/characters" className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}><User size={18}/></Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-40 pb-12 px-6 min-h-screen">
      {step === 'input' && (
           <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center min-h-[70vh]">
              <div className="w-full max-w-2xl space-y-8">
                 <div className="text-center space-y-4 mb-10">
                    <h1 className={`text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
                    <p className="text-zinc-500 text-sm mt-2">{t.subtitle}</p>
                 </div>
                 <div className={`relative w-full rounded-3xl shadow-2xl transition-all duration-300 overflow-hidden ${isDark ? 'bg-[#1e1e1e] shadow-black/50' : 'bg-white shadow-blue-900/10'}`}>
                    <textarea 
                      className={`w-full min-h-[240px] p-8 text-lg bg-transparent border-none resize-none outline-none leading-relaxed custom-scrollbar ${isDark ? 'text-gray-200 placeholder-zinc-600' : 'text-gray-800 placeholder-gray-300'}`}
                      placeholder={t.scriptPlaceholder}
                      value={script} 
                      onChange={(e) => setScript(e.target.value)}
                      onKeyDown={handleScriptKeyDown} 
                    />
                    <div className="flex items-center justify-between p-4 pl-6 bg-gradient-to-t from-black/5 to-transparent">
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                 <input type="file" ref={fileInputRef} onChange={handleScriptFileUpload} className="hidden" accept=".txt,.md,.docx,.xlsx" />
                                 <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-full transition-all flex items-center gap-2 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-400 bg-zinc-900' : 'hover:bg-gray-100 text-gray-500 bg-gray-50'}`} title={t.uploadScript}><Paperclip size={18}/><span>{t.uploadScript}</span></button>
                             </div>
                             <div className="relative">
                                 <button onClick={() => setShowRatioMenu(!showRatioMenu)} className={`p-2.5 rounded-full transition-all flex items-center gap-2 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-400 bg-zinc-900' : 'hover:bg-gray-100 text-gray-500 bg-gray-50'}`} title={t.ratio}><Ratio size={18} /><span>{t.autoRatio}</span></button>
                                 {showRatioMenu && (
                                     <div className={`absolute bottom-12 left-0 w-40 rounded-2xl p-1 shadow-xl border z-50 flex flex-col gap-1 ${isDark ? 'bg-[#1e1e1e] border-zinc-800' : 'bg-white border-gray-100'}`}>
                                          {ASPECT_RATIOS.map(r => (
                                              <button key={r.value} onClick={() => { setAspectRatio(r.value); setShowRatioMenu(false); }} className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${aspectRatio === r.value ? 'bg-blue-500 text-white' : isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}>{r.label}</button>
                                          ))}
                                     </div>
                                 )}
                             </div>
                        </div>
                        <button onClick={handleAnalyzeScript} disabled={isAnalyzing || !script.trim()} className={`px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 border ${isAnalyzing || !script.trim() ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-transparent' : isDark ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700' : 'bg-white text-black border-gray-200 hover:bg-gray-50'}`}>{isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles size={16} />}{t.analyzeBtn}</button>
                    </div>
                 </div>
                 <p className="text-center text-xs text-zinc-400 font-medium opacity-60">CineFlow V6.0 Evolution</p>
              </div>
           </div>
        )}

        {step === 'review' && (
           <div className="max-w-[1600px] mx-auto flex gap-8 items-start animate-in fade-in">
              <div className="w-[340px] shrink-0 space-y-6 h-fit sticky top-24">
                 <div className={`${containerBg} p-5 rounded-3xl space-y-6`}>
                 <h2 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest"><Settings size={12}/> {t.globalSettings}</h2>
                    <div className={`flex ${isDark ? 'bg-black' : 'bg-gray-100'} p-1 rounded-xl mb-4`}>
                        <button onClick={() => setMode('draft')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${mode === 'draft' ? 'bg-white text-black shadow-sm' : 'text-zinc-500'}`}>{t.draftMode}</button>
                        <button onClick={() => setMode('render')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${mode === 'render' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500'}`}>{t.renderMode}</button>
                    </div>
                    {mode === 'render' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.atmosphere}</label>
                                <div className={`flex items-center gap-1`}>
                                    <div className={`flex-1 flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                                        <Sparkles size={14} className="text-purple-500 shrink-0"/>
                                        <input value={globalAtmosphere} onChange={(e) => setGlobalAtmosphere(e.target.value)} placeholder={t.atmospherePlaceholder} className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}/>
                                    </div>
                                    <button onClick={() => setShowAtmosphereModal(!showAtmosphereModal)} className={`p-3 rounded-xl border cursor-pointer ${isDark ? 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}><ChevronsUpDown size={16} className="text-zinc-500"/></button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.style}</label>
                                <button onClick={() => setShowStyleModal(true)} className={`w-full text-left p-3 rounded-xl border flex items-center justify-between cursor-pointer ${isDark ? 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded bg-gradient-to-br ${STYLE_OPTIONS.find(s => s.value === stylePreset)?.color || 'from-gray-500 to-black'}`}></div>
                                        <div className="flex flex-col"><span className="text-xs font-bold">{STYLE_OPTIONS.find(s => s.value === stylePreset)?.label || t.selectStyle}</span></div>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-500"/>
                                </button>
                            </div>
                            <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${useInstantID ? 'bg-blue-500/10 border-blue-500' : `${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}`}>
                                <div className="flex flex-col"><span className={`text-[10px] font-bold flex items-center gap-1 ${useInstantID ? 'text-blue-500' : 'text-zinc-500'}`}><User size={12} /> {t.instantID}</span><span className="text-[8px] opacity-60">{t.instantIDDesc}</span></div>
                                <button onClick={() => setUseInstantID(!useInstantID)} className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${useInstantID ? 'bg-blue-500' : 'bg-zinc-600'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${useInstantID ? 'translate-x-5' : ''}`} /></button>
                            </div>
                        </div>
                    )}
                    {mode === 'draft' && (
                          <div className="space-y-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.scene}</label>
                           <div className={`flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                              <LayoutGrid size={14} className="text-green-500 shrink-0"/>
                              <input value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} placeholder={t.scenePlaceholder} className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}/>
                           </div>
                        </div>
                    )}
                    <button onClick={handleGenerateImages} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 hover:shadow-lg text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95">
                        {mode === 'draft' ? <PenTool size={18}/> : <Palette size={18}/>} {t.startGen}
                    </button>
                 </div>
              </div>
              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t.shotList} ({panels.length})</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setIsDeleteMode(!isDeleteMode)} className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer ${isDeleteMode ? 'bg-red-500 text-white' : buttonBg}`}><Minus size={14}/> {t.delShot}</button>
                        <button onClick={handleAddPanel} className={`text-xs ${buttonBg} px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer hover:scale-105`}><Plus size={14}/> {t.addShot}</button>
                    </div>
                 </div>
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className={`grid gap-4 grid-cols-1 xl:grid-cols-2`}>
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} onDelete={handleDeletePanel} onUpdate={handleUpdatePanel} onOpenCharModal={handleOpenCharModal} onImageClick={setLightboxIndex} t={t} isDark={isDark} currentRatioClass={currentRatioClass} isDeleteMode={isDeleteMode}/>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeDragId ? <PanelCard panel={panels.find(p => p.id === activeDragId)!} idx={panels.findIndex(p => p.id === activeDragId)} step={step} currentRatioClass={currentRatioClass} isOverlay={true} t={t} isDark={isDark} isDeleteMode={isDeleteMode}/> : null}
                    </DragOverlay>
                 </DndContext>
              </div>
           </div>
        )}

        {(step === 'generating' || step === 'done') && (
            <div className="max-w-[1920px] mx-auto animate-in fade-in space-y-8">
                 <div className="flex justify-between items-center px-4">
                     <button onClick={() => setStep('review')} className="text-xs font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-2 transition-colors cursor-pointer">
                        <ArrowLeft size={14}/> {t.backToSetup}
                     </button>
                     <div className="flex items-center gap-4">
                         <div className="text-xs font-mono text-zinc-500 uppercase">
                             {t.total}: <span className={isDark ? "text-white" : "text-black"}>{panels.length}</span> {t.shotUnit} | {t.ratioLabel}: <span className={isDark ? "text-white" : "text-black"}>{aspectRatio}</span>
                         </div>
                     </div>
                 </div>
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className={`grid gap-6 px-4 ${aspectRatio === '9:16' ? 'grid-cols-3 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} currentRatioClass={currentRatioClass} onRegenerate={handleGenerateSingleImage} onImageClick={setLightboxIndex} t={t} isDark={isDark}/>
                            ))}
                        </div>
                    </SortableContext>
                    {/* 🟢 修复：在 page.tsx 的 DragOverlay 中补上 isDeleteMode={isDeleteMode} */}
<DragOverlay>
    {activeDragId ? (
        <PanelCard 
            panel={panels.find(p => p.id === activeDragId)!} 
            idx={panels.findIndex(p => p.id === activeDragId)} 
            step={step} 
            currentRatioClass={currentRatioClass} 
            isOverlay={true} 
            t={t} 
            isDark={isDark} 
            isDeleteMode={isDeleteMode} // <--- 关键修复：补上这个参数
        />
    ) : null}
</DragOverlay>
                 </DndContext>
                 {step === 'done' && (
                     <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 backdrop-blur-xl border p-2 rounded-full flex gap-2 shadow-2xl animate-in slide-in-from-bottom-10 z-40 ${isDark ? 'bg-[#111]/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
                         <button onClick={() => setShowExportModal(true)} disabled={isExporting} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Download size={16}/>} {t.exportPdf}
                         </button>
                         <div className={`w-[1px] mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                         <button onClick={handleExportZIP} disabled={isExporting} className={`px-6 py-3 font-bold rounded-full text-xs flex items-center gap-2 transition-all cursor-pointer ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Package size={16}/>} {t.exportZip}
                         </button>
                         <button onClick={() => { setStep('input'); setScript(''); setPanels([]); }} className={`px-4 py-3 rounded-full transition-all cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-gray-100 text-zinc-500'}`}>
                             <RotateCcw size={16}/>
                         </button>
                     </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
}