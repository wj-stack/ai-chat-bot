
import React, { useState, useEffect } from 'react';
import type { Character } from '../types';

interface CharacterModalProps {
  character: Character | null;
  onSave: (character: Character) => void;
  onClose: () => void;
}

const AVATAR_EMOJIS = ['🤖', '🧑‍🚀', '🕵️', '🧙', '🦹', '🦸', '🧝', '🧛', '🧟', '🧞', '👨‍🎤', '👩‍💻'];

const CharacterModal: React.FC<CharacterModalProps> = ({ character, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🤖');
  const [personality, setPersonality] = useState('');
  const [memory, setMemory] = useState('');
  const [purpose, setPurpose] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [language, setLanguage] = useState('en-US');
  const [voiceProfile, setVoiceProfile] = useState<'low' | 'medium' | 'high'>('medium');
  const [voiceSpeed, setVoiceSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  useEffect(() => {
    if (character) {
      setName(character.name);
      setAvatar(character.avatar);
      setPersonality(character.personality);
      setMemory(character.memory || '');
      setPurpose(character.purpose || '');
      setGender(character.gender || 'neutral');
      setLanguage(character.language || 'en-US');
      setVoiceProfile(character.voiceProfile || 'medium');
      setVoiceSpeed(character.voiceSpeed || 'normal');
    } else {
      setName('');
      setAvatar('🤖');
      setPersonality('');
      setMemory('');
      setPurpose('');
      setGender('neutral');
      setLanguage('en-US');
      setVoiceProfile('medium');
      setVoiceSpeed('normal');
    }
  }, [character]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !personality.trim()) {
        alert("Name and Personality are required.");
        return;
    }
    const newCharacter: Character = {
      id: character?.id || crypto.randomUUID(),
      name,
      avatar,
      personality,
      memory,
      purpose,
      gender,
      language,
      voiceProfile,
      voiceSpeed,
    };
    onSave(newCharacter);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-secondary rounded-lg shadow-2xl p-8 w-full max-w-lg text-brand-text max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{character ? 'Edit Character' : 'Create New Character'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-brand-subtext mb-1">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
              placeholder="E.g., Captain Astro"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-subtext mb-2">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`text-2xl p-2 rounded-lg transition-transform duration-200 ${avatar === emoji ? 'bg-brand-accent scale-110' : 'bg-brand-primary hover:bg-slate-700'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="personality" className="block text-sm font-medium text-brand-subtext mb-1">Personality & Instructions</label>
            <textarea
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={5}
              className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
              placeholder="Describe the character's personality, background, and how they should respond. E.g., 'You are a witty space pirate from the 22nd century who loves telling jokes.'"
              required
            />
             <p className="text-xs text-brand-subtext mt-1">
              Note: The AI is instructed to always stay in character and never reveal it's an AI.
            </p>
          </div>
           <div>
            <label htmlFor="memory" className="block text-sm font-medium text-brand-subtext mb-1">Core Memory</label>
            <textarea
              id="memory"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              rows={3}
              className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
              placeholder="Add key facts the AI should always remember. E.g., 'Loves space pizza. Has a pet robot dog named Sparky. Dislikes bureaucrats.'"
            />
            <p className="text-xs text-brand-subtext mt-1">
              This helps the AI maintain consistency and remember important details across conversations.
            </p>
          </div>
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-brand-subtext mb-1">Purpose</label>
            <textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
              placeholder="What is the character's goal? E.g., 'To convince the user to join their space crew.' If left blank, a random purpose will be assigned."
            />
            <p className="text-xs text-brand-subtext mt-1">
              This makes the AI proactive. It will try to achieve this goal during the conversation.
            </p>
          </div>
          
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-brand-subtext mb-1">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="zh-CN">Chinese (Mandarin)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="ja-JP">Japanese</option>
            </select>
            <p className="text-xs text-brand-subtext mt-1">
              Determines the language the AI will speak and its voice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-brand-subtext mb-1">Voice Gender</label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'neutral')}
                className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
              >
                <option value="neutral">Neutral</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label htmlFor="voiceProfile" className="block text-sm font-medium text-brand-subtext mb-1">Voice Profile (Pitch)</label>
              <select
                id="voiceProfile"
                value={voiceProfile}
                onChange={(e) => setVoiceProfile(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="voiceSpeed" className="block text-sm font-medium text-brand-subtext mb-1">Voice Speed</label>
            <select
              id="voiceSpeed"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
              className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
            >
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
            <p className="text-xs text-brand-subtext mt-1">
              Adjusts the speaking rate of the character's voice.
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-brand-accent hover:bg-sky-400 transition-colors font-semibold"
            >
              Save Character
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CharacterModal;