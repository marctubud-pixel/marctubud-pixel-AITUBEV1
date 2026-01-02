// 文件路径: app/tools/storyboard/constants.ts

// --- i18n 翻译字典 ---
export const TRANSLATIONS = {
    zh: {
      title: "智能分镜生成",
      subtitle: "不断进化的AI分镜生成器",
      back: "返回",
      step1: "剧本",
      step2: "筹备",
      step3: "渲染",
      mockOn: "Mock On",
      mockOff: "Real API",
      manageChars: "角色库",
      scriptPlaceholder: "输入你的故事 (Enter 拆解，Shift+Enter 换行)...\n例如：赛博朋克侦探走入雨巷...",
      analyzeBtn: "拆解剧本",
      analyzing: "AI 思考中...",
      uploadScript: "上传脚本",
      autoRatio: "自动画幅",
      panelCount: "分镜数量",
      ratio: "画幅",
      auto: "自动",
      style: "美术风格",
      scene: "场景/环境",
      character: "核心角色",
      atmosphere: "氛围基调",
      atmospherePlaceholder: "例如：阴郁，赛博朋克...",
      draftMode: "线稿模式 (Draft)",
      renderMode: "精绘模式 (Render)",
      startGen: "生成分镜",
      shotList: "分镜表",
      addShot: "加镜头",
      delShot: "删镜头",
      delShotTip: "点击卡片删除",
      exportZip: "素材包",
      exportPdf: "通告单",
      newProject: "新项目",
      waiting: "待生成...",
      delivery: "交付",
      exportTitle: "导出设置",
      exportDesc: "填写项目元数据以生成商业级 PDF",
      projName: "项目名称",
      author: "导演/作者",
      notes: "备注信息",
      confirmExport: "确认导出",
      injectChar: "角色替换",
      charLib: "角色库",
      noChar: "不指定",
      cameraAngle: "拍摄角度",
      casting: "选角替换",
      shotPrefix: "分镜", 
      shotSize: "景别",    
      angle: "角度",       
      selectStyle: "选择风格",
      uploadRef: "上传参考图",
      moreAtmosphere: "更多氛围",
      instantID: "角色一致性 (InstantID)",
      instantIDDesc: "保持面部高度一致",
      prompt: "AI 提示词",
      loading: "加载中...",
      globalSettings: "全局设置",
      scenePlaceholder: "描述场景与环境...",
      roleFallback: "角色",
      shotFallback: "景别",
      backToSetup: "返回编辑",
      genComplete: "批量生成已完成",
      total: "总计",
      shotUnit: "个分镜",
      ratioLabel: "画幅",
      rendering: "AI 正在绘图...", 
      apply: "应用",
      onlyThisShot: "仅当前分镜",
      applyAll: "全部应用", 
      clickToUpload: "点击上传参考图",
      linked: "已关联角色",
      batchLinked: "已批量关联角色",
      projNamePlaceholder: "输入项目名称",
      authorPlaceholder: "输入导演姓名",
      notesPlaceholder: "输入备注信息...",
      cancel: "取消",
      zipping: "正在打包素材...",
      zipDownloaded: "素材包已下载",
      defaultFileName: "未命名分镜项目",
      pdfExported: "PDF 通告单已导出"
    },
    en: {
      title: "CineFlow Evolution",
      subtitle: "AI-Powered Storyboard Generation V6.0",
      back: "Back",
      step1: "Script",
      step2: "Setup",
      step3: "Render",
      mockOn: "Mock On",
      mockOff: "Real API",
      manageChars: "Library",
      scriptPlaceholder: "Tell your story (Enter to Analyze, Shift+Enter for new line)...",
      analyzeBtn: "Analyze",
      analyzing: "Thinking...",
      uploadScript: "Upload Script",
      autoRatio: "Auto Ratio", 
      panelCount: "Shots",
      ratio: "Ratio",
      auto: "Auto",
      style: "Art Style",
      scene: "Scene",
      character: "Hero",
      atmosphere: "Vibe",
      atmospherePlaceholder: "e.g., Moody, Cyberpunk...",
      draftMode: "Draft Mode",
      renderMode: "Render Mode",
      startGen: "Generate",
      shotList: "Shots",
      addShot: "Add Shot",
      delShot: "Delete",
      delShotTip: "Select to delete",
      exportZip: "Assets",
      exportPdf: "PDF (SOP)",
      newProject: "New",
      waiting: "Waiting...",
      delivery: "Delivery",
      exportTitle: "Export Settings",
      exportDesc: "Metadata for professional PDF delivery",
      projName: "Project Name",
      author: "Director",
      notes: "Notes",
      confirmExport: "Export",
      injectChar: "Inject Character",
      charLib: "Character Library",
      noChar: "None",
      cameraAngle: "Angle",
      casting: "Casting",
      shotPrefix: "SHOT",
      shotSize: "Shot Size",
      angle: "Angle",
      selectStyle: "Select Style",
      uploadRef: "Upload Ref",
      moreAtmosphere: "More Vibe",
      instantID: "InstantID Lock",
      instantIDDesc: "High Fidelity Face Keeping",
      prompt: "AI Prompt",
      loading: "Loading...",
      globalSettings: "Global Settings",
      scenePlaceholder: "Describe environment...",
      roleFallback: "Role",
      shotFallback: "Shot",
      backToSetup: "Back to Setup",
      genComplete: "Batch generation complete",
      total: "TOTAL",
      shotUnit: "SHOTS",
      ratioLabel: "RATIO",
      rendering: "Rendering...",
      apply: "Apply",
      onlyThisShot: "Only This Shot",
      applyAll: "Apply All",
      clickToUpload: "Click to upload reference image",
      linked: "Linked",
      batchLinked: "Batch Linked",
      projNamePlaceholder: "Project Name",
      authorPlaceholder: "Director Name",
      notesPlaceholder: "Notes...",
      cancel: "Cancel",
      zipping: "Zipping assets...",
      zipDownloaded: "ZIP Downloaded",
      defaultFileName: "Untitled_Project",
      pdfExported: "PDF Exported"
    }
};

// --- 景别选项 ---
export const CINEMATIC_SHOTS = [
  { value: "EXTREME WIDE SHOT", label: "大远景 (EWS)" },
  { value: "WIDE SHOT", label: "全景 (Wide)" },
  { value: "FULL SHOT", label: "全身 (Full)" },
  { value: "MID SHOT", label: "中景 (Mid)" },
  { value: "CLOSE-UP", label: "特写 (Close-Up)" },
  { value: "EXTREME CLOSE-UP", label: "大特写 (ECU)" },
];

// --- 拍摄角度选项 ---
export const CAMERA_ANGLES = [
  { value: "EYE LEVEL", label: "👁️ 平视 (Eye)", desc: "Neutral" },
  { value: "LOW ANGLE", label: "⬆️ 仰视 (Low)", desc: "Powerful" },
  { value: "HIGH ANGLE", label: "⬇️ 俯视 (High)", desc: "Vulnerable" },
  { value: "OVERHEAD SHOT", label: "🚁 上帝视角 (Top)", desc: "Map View" },
  { value: "DUTCH ANGLE", label: "📐 荷兰倾斜 (Dutch)", desc: "Unease" },
  { value: "OVER-THE-SHOULDER", label: "👥 过肩 (OTS)", desc: "Dialog" },
];

// --- 风格预设 (包含 Prompt 和 Negative Prompt) ---
export const STYLE_OPTIONS = [
    { 
        value: "realistic", label: "电影实拍", sub: "Cinematic", color: "from-blue-900 to-slate-900",
        prompt: "cinematic film still, shot on 35mm, realistic, 8k, highly detailed, dramatic lighting, movie scene, masterpiece",
        negative: "anime, cartoon, sketch, illustration, drawing, 3d render, painting, low quality, distortion, blurry, text, watermark"
    },
    { 
        value: "anime_jp", label: "日本动画", sub: "Ghibli", color: "from-pink-500 to-rose-500",
        prompt: "anime style, makoto shinkai style, vibrant colors, beautiful composition, 2d animation, studio ghibli, highly detailed",
        negative: "photorealistic, 3d, sketch, rough lines, western comic, ugly face, low quality"
    },
    { 
        value: "anime_us", label: "美漫风格", sub: "Comics", color: "from-yellow-500 to-orange-600",
        prompt: "american comic style, graphic novel, bold lines, dynamic coloring, dc comics style, marvel style",
        negative: "anime, manga, photorealistic, 3d, blurry, low quality"
    },
    { 
        value: "cyberpunk", label: "赛博朋克", sub: "Neon", color: "from-purple-600 to-blue-600",
        prompt: "cyberpunk style, neon lights, futuristic, high tech, rain, reflections, sci-fi atmosphere",
        negative: "vintage, rustic, nature, sun, daylight, low quality"
    },
    { 
        value: "noir", label: "黑色电影", sub: "B&W", color: "from-gray-800 to-black",
        prompt: "film noir style, black and white, high contrast, dramatic shadows, mystery, 1940s style",
        negative: "color, colorful, bright, anime, cartoon, 3d"
    },
    { 
        value: "pixar", label: "皮克斯3D", sub: "Cute", color: "from-blue-400 to-cyan-400",
        prompt: "pixar style, 3d animation, cute, vibrant, unreal engine 5, cgsociety, highly detailed",
        negative: "2d, sketch, drawing, photorealistic, scary, dark"
    },
    { 
        value: "watercolor", label: "水彩手绘", sub: "Soft", color: "from-emerald-400 to-teal-500",
        prompt: "watercolor painting style, soft edges, artistic, impressionism, wet on wet, pastel colors",
        negative: "photorealistic, 3d, sharp edges, digital art, harsh lines"
    },
    { 
        value: "ink", label: "中国水墨", sub: "Ink", color: "from-stone-500 to-stone-800",
        prompt: "chinese ink painting, wash painting, black ink, calligraphy style, artistic, traditional",
        negative: "color, photorealistic, 3d, cartoon, anime"
    },
    // 专门的线稿模式配置 (强制修复画手问题)
    { 
        value: "sketch", label: "专业线稿", sub: "Storyboard", color: "from-gray-200 to-gray-400",
        prompt: "rough storyboard sketch, architectural line drawing, black and white, ink lines, comic style, high contrast, professional composition",
        negative: "photorealistic, color, 3d, (hand holding pencil:1.5), (holding pen:1.5), (drawing tools:1.5), stationery, paper edges, blurry, messy lines, watermark, text, realistic hand"
    },
];

// --- 氛围标签 ---
export const ATMOSPHERE_TAGS = [
    { label: "电影感", val: "cinematic lighting, dramatic atmosphere" },
    { label: "黑暗/黑色电影", val: "dark, moody, low key lighting, noir" },
    { label: "温暖/治愈", val: "warm lighting, sunny, happy atmosphere" },
    { label: "赛博朋克", val: "neon lights, futuristic, cyberpunk atmosphere" },
    { label: "恐怖/惊悚", val: "foggy, scary, horror atmosphere, dim light" },
    { label: "梦幻/唯美", val: "soft focus, dreamy, ethereal, glow" },
];

// --- 画幅比例 ---
export const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 Cinema", cssClass: "aspect-video" },
  { value: "2.39:1", label: "2.39:1 Anamorphic", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3 TV", cssClass: "aspect-[4/3]" },
  { value: "1:1", label: "1:1 Social", cssClass: "aspect-square" },
  { value: "9:16", label: "9:16 Vertical", cssClass: "aspect-[9/16]" },
];

// --- 停用词表 (用于关键词清洗) ---
export const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'with', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 
    'and', 'or', 'but', 'so', 'very', 'really', 'just', 'wearing', 'holding', 'looks', 'like', 'feature', 'features',
    '一个', '是', '在', '有', '和', '与', '的', '了', '着', '很', '非常', '穿着', '拿着', '长得', '像'
]);