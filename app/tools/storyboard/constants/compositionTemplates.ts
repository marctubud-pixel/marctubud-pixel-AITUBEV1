// app/tools/storyboard/constants/compositionTemplates.ts

export type CompositionTemplate = {
  id: string;
  name: string;
  enName: string; // 用于辅助 Prompt
  category: 'basic' | 'angle' | 'dynamic';
  previewUrl: string; 
  controlUrl: string; 
  controlType: 'depth' | 'canny' | 'openpose';
  description: string;
};

export const COMPOSITION_TEMPLATES: CompositionTemplate[] = [
  // === 1. 基础构图 (Basic) ===
  {
    id: 'comp-center',
    name: '正中心构图 (Center)',
    enName: 'symmetrical center composition',
    category: 'basic',
    // 一张极其标准的正中心站位图
    previewUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=600&q=80', 
    controlUrl: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=600&q=80',
    controlType: 'depth',
    description: '主体严格位于画面正中央，绝对对称。'
  },
  {
    id: 'comp-thirds-left',
    name: '三分法-左 (Left Third)',
    enName: 'rule of thirds, subject on left',
    category: 'basic',
    // 主体明显在左侧，右侧大留白
    previewUrl: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=600&q=80',
    controlUrl: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=600&q=80',
    controlType: 'openpose',
    description: '主体位于左侧三分线，右侧留白呼吸感。'
  },
  {
    id: 'comp-thirds-right',
    name: '三分法-右 (Right Third)',
    enName: 'rule of thirds, subject on right',
    category: 'basic',
    // 主体明显在右侧，左侧大留白 (镜像图)
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    controlUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    controlType: 'openpose',
    description: '主体位于右侧三分线，左侧留白。'
  },

  // === 2. 强关系/电影感 (Cinematic) ===
  {
    id: 'comp-ots',
    name: '过肩镜头 (OTS)',
    enName: 'over-the-shoulder shot',
    category: 'basic',
    // 这张图有非常明显的前景肩膀遮挡，适合强制 AI 生成 OTS
    previewUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    controlUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    controlType: 'depth', // 深度图对过肩镜头的“前后关系”理解最好
    description: '前景虚化肩膀，强调对话与观察视角。'
  },
  {
      id: 'comp-wide-group',
      name: '远景群像 (Wide Group)',
      enName: 'wide shot, group of people',
      category: 'basic',
      // 多人站位图
      previewUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80',
      controlUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80',
      controlType: 'openpose',
      description: '多人场景，宽阔视野。'
  },

  // === 3. 特殊视角 (Angle) ===
  {
    id: 'comp-low',
    name: '极低仰视 (Worm\'s Eye)',
    enName: 'extreme low angle shot',
    category: 'angle',
    previewUrl: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&q=80',
    controlUrl: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&q=80',
    controlType: 'depth',
    description: '地面视角仰拍，极强的纵深感。'
  },
  {
    id: 'comp-dutch',
    name: '荷兰角 (Dutch Tilt)',
    enName: 'dutch angle, tilted camera',
    category: 'angle',
    previewUrl: 'https://images.unsplash.com/photo-1495202636884-25cb27891788?w=600&q=80',
    controlUrl: 'https://images.unsplash.com/photo-1495202636884-25cb27891788?w=600&q=80',
    controlType: 'canny',
    description: '画面倾斜，表现不安或动态。'
  }
];