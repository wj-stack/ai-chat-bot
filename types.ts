
export interface Character {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  personality: string;
  memory: string;
  purpose?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string; // For user message text, and for model's dialogue
  thought?: string; // For model's inner thoughts
  action?: string; // For model's physical actions
}

export interface UserAnalysis {
  personality_traits: string;
  communication_style: string;
  potential_interests: string[];
  emotional_summary: string;
  key_motivators: string;
}
