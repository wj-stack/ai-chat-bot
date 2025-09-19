
import React from 'react';
import type { Message, Character } from '../types';
import { UserIcon } from './icons/UserIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface MessageProps {
  message: Message;
  character: Character;
  isLoading?: boolean;
  onToggleSpeech?: (message: Message) => void;
  isSpeaking?: boolean;
}

const LoadingDots: React.FC = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
	    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
	    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
);

const ImageLoadingSkeleton: React.FC = () => (
    <div className="mt-2 p-4 bg-brand-primary/50 rounded-md animate-pulse flex flex-col items-center justify-center aspect-square w-full max-w-sm">
        <MagicWandIcon className="w-8 h-8 text-brand-subtext mb-2" />
        <p className="text-brand-subtext text-sm">Creating image...</p>
    </div>
);

const Message: React.FC<MessageProps> = ({ message, character, isLoading = false, onToggleSpeech, isSpeaking = false }) => {
  const isUser = message.role === 'user';

  const formattedText = message.text.split('\n').map((line, index, arr) => (
    <React.Fragment key={index}>
      {line}
      {index < arr.length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-xl flex-shrink-0">
          {character.avatar}
        </div>
      )}
      <div
        className={`max-w-xl p-3 rounded-lg shadow ${
          isUser
            ? 'bg-brand-accent text-white rounded-br-none'
            : 'bg-brand-secondary text-brand-text rounded-bl-none'
        }`}
      >
        {isLoading ? (
            <LoadingDots /> 
        ) : (
            <>
                {message.action && <p className="text-sm italic text-brand-subtext mb-1">{message.action}</p>}
                
                {message.text && <p className="text-sm leading-relaxed">{formattedText}</p>}
                
                {message.isGeneratingImage && <ImageLoadingSkeleton />}
                
                {message.imageUrl && (
                    <div className="mt-2">
                        <img 
                            src={message.imageUrl} 
                            alt={message.imagePrompt || 'AI generated image'}
                            className="rounded-lg max-w-full h-auto border-2 border-slate-600"
                        />
                    </div>
                )}
                
                {message.thought && <p className="text-xs italic text-brand-subtext mt-2 opacity-80">({message.thought})</p>}
            </>
        )}
      </div>
       {!isUser && !isLoading && onToggleSpeech && (
        <button
          onClick={() => onToggleSpeech(message)}
          className="p-2 rounded-full text-brand-subtext hover:bg-slate-700 hover:text-brand-text transition-colors self-center flex-shrink-0"
          title={isSpeaking ? "Stop speaking" : "Read aloud"}
          aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
        >
          <SpeakerIcon className={`w-5 h-5 ${isSpeaking ? 'text-brand-accent animate-pulse' : ''}`} />
        </button>
      )}
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-6 h-6 text-brand-subtext" />
        </div>
      )}
    </div>
  );
};

export default Message;