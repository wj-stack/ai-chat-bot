
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

// Add a definition for the SpeechSynthesisErrorEvent to access its properties
interface SpeechSynthesisErrorEvent extends Event {
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
  chatMode: 'normal' | 'game';
  onSetChatMode: (mode: 'normal' | 'game') => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ character, messages, onSendMessage, isLoading, onAnalyzeUser, isAnalyzing, chatMode, onSetChatMode }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Load browser voices for TTS
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    // onvoiceschanged is not consistently fired. So we call it once and then set the event listener.
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Cleanup speech synthesis on component unmount
    return () => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
    }
  }, []);

  // Stop speaking when character changes
  useEffect(() => {
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
  }, [character]);


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
  
  const handleOptionClick = (option: string) => {
    if (!isLoading) {
        onSendMessage(option);
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

  const getCharacterVoice = (character: Character): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // 1. Filter by specified language
    const lang = character.language || 'en-US';
    let langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
    if (langVoices.length === 0) { // Fallback to English if no voices for the language exist
        langVoices = voices.filter(v => v.lang.startsWith('en'));
    }
    if (langVoices.length === 0) { // Ultimate fallback
        return voices[0] || null;
    }

    // 2. Sort voices based on a scoring system for gender and quality
    const sortedVoices = [...langVoices].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // --- Gender Scoring (high impact) ---
        if (character.gender !== 'neutral') {
            const maleKeywords = ['male', 'david', 'mark', 'james', 'tom', 'alex', 'daniel', 'fred', 'rishi'];
            const femaleKeywords = ['female', 'zira', 'susan', 'linda', 'hazel', 'karen', 'moira', 'samantha', 'tessa'];
            
            const targetKeywords = character.gender === 'male' ? maleKeywords : femaleKeywords;
            const oppositeKeywords = character.gender === 'male' ? femaleKeywords : maleKeywords;

            if (targetKeywords.some(kw => aName.includes(kw))) scoreA += 100;
            if (targetKeywords.some(kw => bName.includes(kw))) scoreB += 100;
            
            // Penalize voices that explicitly match the opposite gender
            if (oppositeKeywords.some(kw => aName.includes(kw))) scoreA -= 50;
            if (oppositeKeywords.some(kw => bName.includes(kw))) scoreB -= 50;
        }
        
        // --- Quality Scoring (lower impact) ---
        if (a.localService) scoreA += 10; // OS-native voices are usually better
        if (b.localService) scoreB += 10;
        if (aName.includes('google')) scoreA += 5;
        if (bName.includes('google')) scoreB += 5;
        if (aName.includes('microsoft')) scoreA += 3;
        if (bName.includes('microsoft')) scoreB += 3;
        if (a.default) scoreA -= 1; // De-prioritize default slightly to get more unique voices
        if (b.default) scoreB -= 1;

        return scoreB - scoreA;
    });

    if (sortedVoices.length === 0) {
        return langVoices[0] || voices[0] || null; // Failsafe
    }
    
    // 3. Use a hash for consistency among the best-scored voices
    const charCodeSum = character.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const voiceIndex = charCodeSum % sortedVoices.length;
    
    return sortedVoices[voiceIndex];
};


  const handleToggleSpeech = (message: MessageType) => {
    if (!voices.length) {
        alert("Text-to-speech voices not available yet. Please wait a moment and try again.");
        return;
    }
    
    if (speakingMessageId === message.id) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
    } else {
        window.speechSynthesis.cancel(); // Stop any other speech
        
        // On some browsers, the speech synthesis engine can get stuck.
        // A simple check and resume can help kickstart it.
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(message.text);
        
        const voice = getCharacterVoice(character);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }

        // Set pitch based on voice profile
        if (character.voiceProfile === 'low') {
            utterance.pitch = 0.8;
        } else if (character.voiceProfile === 'high') {
            utterance.pitch = 1.2;
        } else {
            utterance.pitch = 1; // Medium
        }

        // Set rate based on voice speed
        if (character.voiceSpeed === 'slow') {
            utterance.rate = 0.8;
        } else if (character.voiceSpeed === 'fast') {
            utterance.rate = 1.2;
        } else {
            utterance.rate = 1; // Normal
        }

        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = (e) => {
            console.error("SpeechSynthesis Error:", (e as SpeechSynthesisErrorEvent).error);
            setSpeakingMessageId(null);
        };
        setSpeakingMessageId(message.id);
        window.speechSynthesis.speak(utterance);
    }
  };


  const hasEnoughMessagesForAnalysis = messages.filter(m => m.role === 'user').length >= 2;
  const isSpeechRecognitionSupported = !!recognitionRef.current;
  
  const latestModelMessageWithOptions = [...messages]
    .reverse()
    .find(msg => msg.role === 'model' && msg.userResponseOptions && msg.userResponseOptions.length > 0);

  return (
    <div className="flex flex-col h-full bg-brand-primary">
      <header className="flex items-center justify-between p-4 border-b border-slate-700 shadow-md">
        <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center mr-4 text-xl">
            {character.avatar || <UserIcon className="w-6 h-6 text-brand-subtext" />}
            </div>
            <h2 className="text-xl font-bold">{character.name}</h2>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex rounded-md bg-slate-600 p-1">
                <button
                    onClick={() => onSetChatMode('normal')}
                    className={`px-3 py-1 text-sm font-semibold rounded transition-colors duration-200 ${chatMode === 'normal' ? 'bg-brand-accent text-white' : 'text-brand-subtext hover:bg-slate-500'}`}
                >
                    Chat
                </button>
                <button
                    onClick={() => onSetChatMode('game')}
                    className={`px-3 py-1 text-sm font-semibold rounded transition-colors duration-200 ${chatMode === 'game' ? 'bg-brand-accent text-white' : 'text-brand-subtext hover:bg-slate-500'}`}
                >
                    Game
                </button>
            </div>
            <button
                onClick={onAnalyzeUser}
                disabled={!hasEnoughMessagesForAnalysis || isAnalyzing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-slate-600 text-brand-text rounded-md hover:bg-slate-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Analyze user's personality based on conversation"
            >
                {isAnalyzing ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-brand-text"></div> : <AnalysisIcon className="w-6 h-6" />}
                <span>Analyze User</span>
            </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            message={msg}
            character={character}
            onToggleSpeech={handleToggleSpeech}
            isSpeaking={speakingMessageId === msg.id}
          />
        ))}
        {isLoading && <Message message={{ id: 'loading', role: 'model', text: '' }} character={character} isLoading={true} />}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-700">
        {chatMode === 'normal' ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-brand-secondary rounded-lg p-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e as unknown as React.FormEvent);
                        }
                    }}
                    placeholder={isRecording ? "Listening..." : `Message ${character.name}...`}
                    className="flex-1 bg-transparent resize-none focus:outline-none placeholder-brand-subtext text-sm p-2"
                    rows={1}
                    disabled={isLoading}
                />
                {isSpeechRecognitionSupported &&
                    <button
                        type="button"
                        onClick={handleToggleRecording}
                        className={`p-2 rounded-full transition-colors ${isRecording ? 'text-red-500 bg-red-500/20' : 'text-brand-subtext hover:bg-slate-600 hover:text-brand-text'}`}
                        title={isRecording ? "Stop recording" : "Start recording"}
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                }
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2 rounded-full bg-brand-accent text-white disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </form>
        ) : (
            <div className="min-h-[72px] flex flex-col items-center justify-center">
                {isLoading ? (
                    <p className="text-brand-subtext animate-pulse">Waiting for {character.name}...</p>
                ) : latestModelMessageWithOptions?.userResponseOptions ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        {latestModelMessageWithOptions.userResponseOptions.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleOptionClick(option)}
                                className="w-full text-left p-3 rounded-lg border-2 transition-colors duration-200 bg-brand-secondary border-slate-600 hover:border-brand-accent hover:bg-brand-accent/20 text-sm disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                ) : (
                     <p className="text-brand-subtext italic">The story will begin with {character.name}'s next message.</p>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
