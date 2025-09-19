
export interface Character {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  personality: string;
  memory: string;
  purpose?: string;
  gender: 'male' | 'female' | 'neutral';
  language: string; // e.g., 'en-US', 'zh-CN'
  voiceProfile: 'low' | 'medium' | 'high';
  voiceSpeed: 'slow' | 'normal' | 'fast';
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string; // For user message text, and for model's dialogue
  thought?: string; // For model's inner thoughts
  action?: string; // For model's physical actions
  userResponseOptions?: string[]; // For model to suggest user responses in game mode
  imageUrl?: string; // URL for a generated image
  imagePrompt?: string; // The prompt used to generate the image
  isGeneratingImage?: boolean; // True if an image is currently being generated for this message
}

export interface UserAnalysis {
  personality_traits: string;
  communication_style: string;
  potential_interests: string[];
  emotional_summary: string;
  key_motivators: string;
}

export interface QuizQuestion {
  question: string;
  answers: string[];
}