import React, { useState } from 'react';
import type { Character } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { UserIcon } from './icons/UserIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface SidebarProps {
  characters: Character[];
  activeCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  onNewCharacter: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onNewCharacterFromQuiz: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onNewCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onNewCharacterFromQuiz,
}) => {
  const [hoveredCharacterId, setHoveredCharacterId] = useState<string | null>(null);

  return (
    <aside className="w-64 bg-brand-secondary flex flex-col p-3 border-r border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-brand-text">Characters</h1>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
            onClick={onNewCharacter}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold bg-slate-600 text-brand-text rounded-md hover:bg-slate-500 transition-colors duration-200"
            title="Create character from scratch"
        >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create
        </button>
        <button
            onClick={onNewCharacterFromQuiz}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold bg-brand-accent text-white rounded-md hover:bg-sky-400 transition-colors duration-200"
            title="Create character with AI assistant"
        >
            <MagicWandIcon className="w-5 h-5 mr-2" />
            Guided
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul>
          {characters.map(character => (
            <li key={character.id} className="mb-2">
              <div
                className={`flex items-center p-2 rounded-md cursor-pointer transition-all duration-200 group ${
                  activeCharacterId === character.id ? 'bg-brand-accent/30' : 'hover:bg-slate-700'
                }`}
                onClick={() => onSelectCharacter(character.id)}
                onMouseEnter={() => setHoveredCharacterId(character.id)}
                onMouseLeave={() => setHoveredCharacterId(null)}
              >
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center mr-3 text-lg">
                  {character.avatar || <UserIcon className="w-5 h-5 text-brand-subtext" />}
                </div>
                <span className="flex-1 font-medium truncate">{character.name}</span>
                {(hoveredCharacterId === character.id || activeCharacterId === character.id) && (
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCharacter(character);
                      }}
                      className="p-1 rounded-full hover:bg-slate-600"
                    >
                      <EditIcon className="w-4 h-4 text-brand-subtext" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete ${character.name}? This cannot be undone.`)) {
                           onDeleteCharacter(character.id);
                        }
                      }}
                      className="p-1 rounded-full hover:bg-slate-600"
                    >
                      <TrashIcon className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;