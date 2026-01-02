export type StoryboardPanel = {
  id: string;
  description: string;
  shotType: string;
  cameraAngle?: string;
  environment?: string;
  prompt: string;
  imageUrl?: string;
  isLoading: boolean;
  characterIds?: string[];
  characterAvatars?: string[];
};

export type Character = { id: string; name: string; avatar_url: string | null; description: string; };
export type CharacterImage = { id: string; image_url: string; description: string | null; };
export type WorkflowStep = 'input' | 'review' | 'generating' | 'done';
export type Lang = 'zh' | 'en';
export type Theme = 'light' | 'dark';

export type ExportMeta = {
  projectName: string;
  author: string;
  notes: string;
};