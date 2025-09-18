
import React from 'react';
import type { Message, Character } from '../types';
import { UserIcon } from './icons/UserIcon';

interface MessageProps {
  message: Message;
  character: Character;
  isLoading?: boolean;
}

const LoadingDots: React.FC = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
	    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
	    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
);

const Message: React.FC<MessageProps> = ({ message, character, isLoading = false }) => {
  const isUser = message.role === 'user';

  const formattedText = message.text.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      <br />
    </React.Fragment>
  ));

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
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
                <p className="text-sm leading-relaxed">{formattedText}</p>
                {message.thought && <p className="text-xs italic text-brand-subtext mt-2 opacity-80">({message.thought})</p>}
            </>
        )}
      </div>
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-6 h-6 text-brand-subtext" />
        </div>
      )}
    </div>
  );
};

export default Message;
