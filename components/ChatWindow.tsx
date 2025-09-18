import React, { useState, useRef, useEffect } from 'react';
import type { Character, Message as MessageType } from '../types';
import Message from './Message';
import { SendIcon } from './icons/SendIcon';
import { UserIcon } from './icons/UserIcon';
import { AnalysisIcon } from './icons/AnalysisIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

// Fix for SpeechRecognition types not being available in standard TypeScript lib
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

interface ChatWindowProps {
  character: Character;
  messages: MessageType[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onAnalyzeUser: () => void;
  isAnalyzing: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ character, messages, onSendMessage, isLoading, onAnalyzeUser, isAnalyzing }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
        console.warn("Speech Recognition not supported in this browser.");
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
        recognitionRef.current.stop();
    } else {
        setInput('');
        try {
            recognitionRef.current.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Could not start voice recognition:", e);
        }
    }
  };

  const hasEnoughMessagesForAnalysis = messages.filter(m => m.role === 'user').length >= 2;
  const isSpeechRecognitionSupported = !!recognitionRef.current;

  return (
    <div className="flex flex-col h-full bg-brand-primary">
      <header className="flex items-center justify-between p-4 border-b border-slate-700 shadow-md">
        <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center mr-4 text-xl">
            {character.avatar || <UserIcon className="w-6 h-6 text-brand-subtext" />}
            </div>
            <h2 className="text-xl font-bold">{character.name}</h2>
        </div>
        <button
            onClick={onAnalyzeUser}
            disabled={isAnalyzing || !hasEnoughMessagesForAnalysis}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-brand-secondary text-brand-text rounded-md hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasEnoughMessagesForAnalysis ? "Need more conversation to analyze" : "Analyze User"}
        >
            <AnalysisIcon className="w-5 h-5" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze User'}
        </button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <Message key={index} message={msg} character={character} />
          ))}
          {isLoading && (
             <Message message={{role: 'model', text: '...'}} character={character} isLoading={true}/>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="flex items-center bg-brand-secondary rounded-lg p-2 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening..." : `Message ${character.name}...`}
            className="flex-1 bg-transparent border-none focus:ring-0 text-brand-text placeholder-brand-subtext"
            disabled={isLoading}
          />
          {isSpeechRecognitionSupported && (
             <button
                type="button"
                onClick={handleToggleRecording}
                disabled={isLoading}
                className={`p-2 rounded-md transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-brand-subtext hover:text-brand-text'}`}
                title="Voice Input"
            >
                <MicrophoneIcon className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-md bg-brand-accent text-white disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-sky-400 transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;