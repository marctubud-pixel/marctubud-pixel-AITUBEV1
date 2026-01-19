'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Zap, Moon, Sun, Globe, User, Crosshair, Gauge } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

// API Actions
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { repaintShotWithCharacter } from '@/app/actions/repaint';
import { changeShotScene } from '@/app/actions/edit'; // 🟢 引入编辑 Action
import { createClient } from '@/utils/supabase/client';
import { exportStoryboardPDF } from '@/utils/export-pdf';
import { parseFileToText } from '@/utils/file-parsers';
import { exportStoryboardZIP } from '@/utils/export-zip';

// Dnd Kit
import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Components
import StepInput from './_components/StepInput';
import StepReview from './_components/StepReview';
import StepRender from './_components/StepRender';
import StoryboardModals from './_components/StoryboardModals';
import { ImageSearchModal } from '@/components/ImageSearchModal';

import { StoryboardPanel, Character, WorkflowStep, Lang, Theme, ExportMeta } from './types';
import { TRANSLATIONS, STYLE_OPTIONS, ASPECT_RATIOS, STOP_WORDS, CINEMATIC_SHOTS, CAMERA_ANGLES } from './constants';

const removeCharacterFromPrompt = (originalPrompt: string, charName: string) => {
  if (!originalPrompt) return "";
  const safeName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\(Character:\\s*${safeName},[^)]*\\)`, 'gi');
  return originalPrompt.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function StoryboardPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const isDark = theme === 'dark';
  const [lang, setLang] = useState<Lang>('zh');
  const t = TRANSLATIONS[lang];

  const [script, setScript] = useState('');
  const [globalAtmosphere, setGlobalAtmosphere] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [sceneAnchorImage, setSceneAnchorImage] = useState<string | null>(null);

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
  const [useHighPrecision, setUseHighPrecision] = useState(false);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [useInstantID, setUseInstantID] = useState(false);

  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const [uploadedStyleRef, setUploadedStyleRef] = useState<string | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRepainting, setIsRepainting] = useState(false);
  const [showCastingModal, setShowCastingModal] = useState(false);

  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

  const [batchTargetChar, setBatchTargetChar] = useState<Character | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

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
      if (!e.shiftKey) {
        e.preventDefault();
        if (!isAnalyzing && script.trim()) handleAnalyzeScript();
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

  const handleSceneAnchorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Uploading anchor...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `anchors/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      setSceneAnchorImage(publicUrl);
      toast.success("Scene Anchor Set & Uploaded", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("Upload failed: " + error.message, { id: toastId });
    } finally { e.target.value = ''; }
  };

  // 🟢 [核心函数] 大图模式下更换场景
  const handleEditScene = async (panelId: string, newPrompt: string, refFile: File | null) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || !panel.imageUrl) {
      toast.error("Cannot edit: No image generated yet.");
      return;
    }

    setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: true } : p));
    const toastId = toast.loading("Changing Scene (Qwen-Edit)...");

    try {
      let refImageUrl = undefined;

      if (refFile) {
        toast.loading("Uploading reference...", { id: toastId });
        const fileExt = refFile.name.split('.').pop();
        const fileName = `refs/${Date.now()}_ref.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, refFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        refImageUrl = data.publicUrl;
      }

      const res = await changeShotScene(
        panel.imageUrl,
        newPrompt,
        panel.id,
        tempProjectId,
        refImageUrl
      );

      if (res.success && (res as any).url) {
        setPanels(current => current.map(p => p.id === panelId ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
        toast.success("Scene Changed Successfully!", { id: toastId });
      } else {
        throw new Error((res as any).message || "Edit Failed");
      }

    } catch (error: any) {
      console.error(error);
      toast.error(`Edit Failed: ${error.message}`, { id: toastId });
      setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: false } : p));
    }
  };

  const handleOpenSearch = (index: number) => {
    setActiveSearchIndex(index);
    setIsSearchOpen(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (activeSearchIndex !== null) {
      setPanels(current => current.map((p, idx) => idx === activeSearchIndex ? { ...p, referenceImage: imageUrl } : p));
      toast.success(t.apply || "已应用参考图");
      setIsSearchOpen(false);
      setActiveSearchIndex(null);
    }
  };

  // 🟢 [核心函数] 应用大师构图
  const handleApplyComposition = (panelId: string, ref: any) => {
    setPanels(current => current.map(p => {
      if (p.id !== panelId) return p;

      // 1. 映射景别 (Shot Size)
      // 尝试模糊匹配，例如 "Extreme Wide Shot" -> "EXTREME WIDE SHOT"
      let newShotType = p.shotType;
      const refShot = ref.meta?.technical?.shot_size?.toUpperCase();
      if (refShot) {
        if (CINEMATIC_SHOTS.some(s => s.value === refShot)) newShotType = refShot;
        else if (refShot.includes("CLOSE")) newShotType = "CLOSE-UP";
        else if (refShot.includes("WIDE")) newShotType = "WIDE SHOT";
        else if (refShot.includes("FULL")) newShotType = "FULL SHOT";
        else if (refShot.includes("MID")) newShotType = "MID SHOT";
      }

      // 2. 映射角度 (Angle)
      let newAngle = p.cameraAngle || 'EYE LEVEL';
      const refAngle = ref.meta?.technical?.angle?.toUpperCase();
      if (refAngle) {
        if (CAMERA_ANGLES.some(a => a.value === refAngle)) newAngle = refAngle;
        else if (refAngle.includes("LOW")) newAngle = "LOW ANGLE";
        else if (refAngle.includes("HIGH")) newAngle = "HIGH ANGLE";
        else if (refAngle.includes("OVERHEAD")) newAngle = "OVERHEAD SHOT";
        else if (refAngle.includes("DUTCH")) newAngle = "DUTCH ANGLE";
      }

      // 3. 增强 Prompt (光影 + 氛围)
      let newPrompt = p.prompt || "";
      const addedTerms = [];
      if (ref.meta?.environment?.lighting_type) addedTerms.push(ref.meta.environment.lighting_type);
      if (ref.meta?.mood?.keywords) addedTerms.push(ref.meta.mood.keywords);

      const addition = addedTerms.join(", ");
      if (addition) {
        // 避免重复添加
        if (!newPrompt.toLowerCase().includes(addition.toLowerCase().split(',')[0])) {
          newPrompt = newPrompt ? `${newPrompt}, ${addition}` : addition;
        }
      }

      // 4. 设置 ControlNet 底图
      return {
        ...p,
        shotType: newShotType,
        cameraAngle: newAngle,
        prompt: newPrompt,
        referenceImage: ref.image_url // 核心：构图锁死
      };
    }));
    toast.success(t.apply || "已应用大师构图");
  };

  const handleOpenCharModal = (panelId: string) => { setActivePanelIdForModal(panelId); setShowCharModal(true); }

  const handlePreSelectCharacter = (char: Character) => {
    if (!activePanelIdForModal) return;
    const targetPanel = panels.find(p => p.id === activePanelIdForModal);
    if (!targetPanel) return;
    const currentIds = targetPanel.characterIds || [];
    if (currentIds.includes(char.id)) {
      setPanels(current => current.map(p => {
        if (p.id === activePanelIdForModal) {
          const cleanedPrompt = removeCharacterFromPrompt(p.prompt, char.name);
          return { ...p, characterIds: p.characterIds?.filter(id => id !== char.id) || [], characterAvatars: p.characterAvatars?.filter(url => url !== char.avatar_url) || [], prompt: cleanedPrompt };
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

    setPanels(current => current.map(p => {
      // (简化的匹配逻辑，实际会保留原有复杂逻辑)
      if (p.id === targetPanelId) {
        const newIds = [...(p.characterIds || []), targetChar.id];
        const newAvatars = [...(p.characterAvatars || []), targetChar.avatar_url || ''];
        return { ...p, characterIds: newIds, characterAvatars: newAvatars };
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
    if (globalAtmosphere.includes(tag)) setGlobalAtmosphere(prev => prev.replace(tag, "").replace(/,\s*,/g, ",").replace(/^,|,$/g, ""));
    else setGlobalAtmosphere(prev => prev ? `${prev}, ${tag}` : tag);
  };

  const buildActionPrompt = (panel: StoryboardPanel) => {
    let desc = panel.description;
    const isChinese = /[\u4e00-\u9fa5]/.test(desc);

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
      finalPrompt += `(no humans, no people, nobody, empty scene, vacant, deserted, scenery only, architectural photography, stillness:2.0), `;
      if (isChinese) finalPrompt += `空镜头，无人场景，静止画面，${desc}, `;
      else finalPrompt += `Empty shot of, deserted scene, stillness, ${desc}, `;
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

      // Grid View 不再受全局锚点影响
      const effectiveRefImage = panel.referenceImage || undefined;

      const res = await generateShotImage(
        tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType,
        primaryCharId,
        effectiveRefImage,
        0.95,
        isMockMode,
        panel.cameraAngle || 'EYE LEVEL',
        useInstantID,
        negPrompt,
        useHighPrecision
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

    for (const [index, panel] of panels.entries()) {
      try {
        const tempShotId = `shot_${Date.now()}_${panel.id.substring(0, 4)}`;

        let finalPrompt = buildActionPrompt(panel);

        if (panel.characterIds && panel.characterIds.length > 0) {
          const selectedChars = characters.filter(c => panel.characterIds?.includes(c.id));
          selectedChars.forEach(char => {
            if (!finalPrompt.includes(char.name)) {
              finalPrompt += ` (Character: ${char.name}, ${char.description})`;
            }
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
        const effectiveRefImage = panel.referenceImage || undefined;

        const res = await generateShotImage(
          tempShotId,
          finalPrompt,
          tempProjectId,
          mode === 'draft',
          stylePreset,
          aspectRatio,
          panel.shotType,
          primaryCharId,
          effectiveRefImage,
          0.95,
          isMockMode,
          panel.cameraAngle || 'EYE LEVEL',
          useInstantID,
          negPrompt,
          useHighPrecision
        );

        if (res.success) {
          setPanels(current => current.map(p => p.id === panel.id ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
        } else {
          setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
        }

        if (useHighPrecision && index < panels.length - 1) {
          toast.info(`冷却中... (避免API限流)`, { duration: 4000 });
          await delay(5000);
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
      <Toaster position="top-center" richColors theme={isDark ? "dark" : "light"} />

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
        sceneAnchorImage={sceneAnchorImage}
        handleEditScene={handleEditScene}
      />

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b h-16 flex items-center justify-between px-6 transition-colors duration-300 ${headerBg}`}>
        <div className="flex items-center gap-6">
          <Link href="/tools" className="flex items-center text-zinc-500 hover:text-blue-500 transition-colors text-sm font-bold gap-2"><ArrowLeft size={18} /> {t.back}</Link>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`px-3 py-1 rounded-full ${step === 'input' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step1}</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className={`px-3 py-1 rounded-full ${step === 'review' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step2}</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className={`px-3 py-1 rounded-full ${step === 'generating' || step === 'done' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step3}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseHighPrecision(!useHighPrecision)}
            className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer 
                ${useHighPrecision ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}
          >
            {useHighPrecision ? <Crosshair size={10} /> : <Gauge size={10} />}
            {useHighPrecision ? "精准构图(慢)" : "快速参考(快)"}
          </button>

          <button onClick={() => setIsMockMode(!isMockMode)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${isMockMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : `${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} text-zinc-500`}`}>
            <Zap size={10} fill={isMockMode ? "currentColor" : "none"} /> {isMockMode ? t.mockOn : t.mockOff}
          </button>
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
            <Globe size={18} />
          </button>
          <Link href="/tools/characters" className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
            <User size={18} />
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
            handleOpenSearch={handleOpenSearch}
            onApplyComposition={handleApplyComposition}
          // 🟢 [核心修改] 移除了 sceneAnchorImage 等 Props
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

      <ImageSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSelectImage}
        initialQuery={activeSearchIndex !== null ? panels[activeSearchIndex]?.description : ''}
      />
    </div>
  );
}