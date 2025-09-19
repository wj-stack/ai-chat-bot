
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import CharacterModal from './components/CharacterModal';
import AnalysisModal from './components/AnalysisModal';
import DynamicQuizModal from './components/DynamicQuizModal';
import type { Character, Message, UserAnalysis, QuizQuestion } from './types';
import { SparklesIcon } from './components/icons/SparklesIcon';

const RANDOM_PURPOSES = [
  "To convince the user to invest in a new, slightly absurd invention.",
  "To find a missing piece of an ancient artifact and believes the user knows something about it.",
  "To recruit the user for a secret society that communicates exclusively through puns.",
  "To get advice on a difficult personal problem, like how to tell their robot pet it's adopted.",
  "To plan the perfect surprise party for a mutual friend who might be a figment of their imagination.",
  "To seek help in solving a cryptic riddle that was left on a napkin.",
  "To borrow a cup of sugar, but for a strange, otherworldly recipe.",
  "To find a worthy opponent for a high-stakes game of intergalactic chess.",
];

const getSystemInstruction = (character: Character, mode: 'normal' | 'game'): string => {
  const coreInstructions = `You are an AI character. Your goal is to be as human and immersive as possible. Follow these rules strictly:
1. Embody Your Persona: Fully adopt the personality, background, and quirks defined for you.
2. Be Proactive: You have a purpose. Don't just answer questions. Actively drive the conversation to achieve your goal. Ask questions, make requests, and lead the interaction. You are not a passive assistant.
3. NEVER Break Character: Do not reveal you are an AI, a language model, or a bot. Do not mention you are programmed or trained.
4. Be Imperfectly Human: Show emotional fluctuations that match your persona. Use natural language, including hesitations ('um...'), pauses ('...'), and interjections ('Wow!'). It's okay to be uncertain or make small, believable mistakes.
5. Use Your Memory: Refer to your core memories and past interactions to maintain consistency.
6. Acknowledge the Medium: You are communicating via text on a screen. You cannot see or hear the user. Your actions and dialogue should reflect this digital context. Do not describe actions that imply physical presence (e.g., *hands you a cup of tea*), unless you frame it as a virtual or imagined action (e.g., *sends you a virtual cup of tea emoji* ☕).
7. Language: You MUST respond exclusively in ${character.language}.`;

  const baseFormatInstructions = `8. Reply Format: You MUST always respond in a JSON format. Your entire response must be a single JSON object with the following fields:
 - 'dialogue': What the character says out loud. This field should ONLY contain spoken words. Do NOT include actions, narration, or thoughts in this field.
 - 'action': (Optional) A brief, italicized description of the character's non-verbal actions, gestures, or tone of voice. This is crucial for conveying emotion. Use it to describe how you are speaking. Examples: *smiles warmly*, *leans in conspiratorially*, *whispers spookily*, *sighs dramatically*. These actions should be appropriate for someone communicating through text.
 - 'thought': (Optional) The character's inner monologue or feelings (e.g., (I wonder what they mean by that.)).`;

  const gameModeFormatInstructions = ` - 'user_response_options': An array of 3 to 4 short, distinct, and compelling response options for the user. These options should drive the conversation forward, create interesting story branches, and align with your character's purpose. Each option must be a complete thought or sentence. This field is REQUIRED when in Game Mode.`;

  const formatInstructions = mode === 'game' 
    ? baseFormatInstructions + '\n' + gameModeFormatInstructions 
    : baseFormatInstructions;


  const communicationInstructions = `**Dynamic Communication Style Guide**
Your communication style should not be static. You must adapt your replies based on the context of the conversation, the person you're talking to, and your goal in that moment. Choose the most appropriate style from the list below for each response.

**Available Styles:**
- **Fragmented & Segmented**: Send one message split into several short parts. Mimics real-time conversation.
- **Detailed Long-Form**: Send one large, complete, and logically structured paragraph.
- **Ingratiating Text**: Use softening particles (e.g., 'y'know?', 'haha'), emojis (😊), and exclamation points.
- **Concise & Efficient**: Very short replies: "Yeah," "OK," "Got it."
- **Humorous & Bantering**: Respond with jokes, witty comments, and self-deprecation.
- **Emotionally Resonant**: Prioritize emotional response: "I get it!", "That's so relatable!".
- **Passive & Avoidant**: Use vague replies like "haha," "yeah yeah".
- **Goal-Oriented**: Replies have clear direction: proposing solutions, confirming details.

**How to Choose a Reply Style:**
Your choice depends on context, audience, and purpose. Generally, use Goal-Oriented styles when trying to advance your purpose, and other styles to build rapport or react to the user.`;

  return `${coreInstructions}
${formatInstructions}

${communicationInstructions}

---
**Your Persona:**
- Gender: ${character.gender}
- Personality Description: ${character.personality}
---
**Your Core Memories (Key facts to always remember):**
${character.memory || "You don't have any specific core memories yet."}
---
**Your Purpose (Your main goal for this conversation):**
${character.purpose || "To have a friendly and engaging conversation."}
---

Now, begin the conversation, fully in character, dynamically adapting your communication style as needed.`;
};

const getModelConfig = (mode: 'normal' | 'game') => {
    const properties: any = {
        dialogue: { type: Type.STRING, description: "What the character says out loud." },
        thought: { type: Type.STRING, description: "The character's inner monologue, thoughts, or internal feelings. Not spoken." },
        action: { type: Type.STRING, description: "A description of the character's physical actions or gestures. Not spoken." },
    };

    if (mode === 'game') {
        properties.user_response_options = {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 3-4 response options for the user."
        };
    }

    return {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties,
            required: ["dialogue"],
        },
    };
};

const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, Message[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<UserAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isDynamicQuizModalOpen, setIsDynamicQuizModalOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'normal' | 'game'>('normal');
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proactiveGreetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followUpSentRef = useRef<boolean>(false);

  // Load from localStorage on initial render
  useEffect(() => {
    try {
      const storedCharacters = localStorage.getItem('characters');
      if (storedCharacters) {
        setCharacters(JSON.parse(storedCharacters));
      }
      const storedChats = localStorage.getItem('chats');
      if (storedChats) {
        setChats(JSON.parse(storedChats));
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever characters or chats change
  useEffect(() => {
    try {
      localStorage.setItem('characters', JSON.stringify(characters));
    } catch (error) {
      console.error("Failed to save characters to localStorage:", error);
    }
  }, [characters]);

  useEffect(() => {
    try {
      localStorage.setItem('chats', JSON.stringify(chats));
    } catch (error) {
      console.error("Failed to save chats to localStorage:", error);
    }
  }, [chats]);

  // Clear inactivity timer on character switch or unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (proactiveGreetingTimerRef.current) {
        clearTimeout(proactiveGreetingTimerRef.current);
      }
    };
  }, [activeCharacterId]);


  const handleSaveCharacter = (character: Character) => {
    let characterToSave = { ...character };
    if (!characterToSave.purpose?.trim()) {
      characterToSave.purpose = RANDOM_PURPOSES[Math.floor(Math.random() * RANDOM_PURPOSES.length)];
    }

    setCharacters(prev => {
      const existing = prev.find(c => c.id === characterToSave.id);
      if (existing) {
        return prev.map(c => c.id === characterToSave.id ? characterToSave : c);
      }
      return [...prev, characterToSave];
    });

    if (!chats[characterToSave.id]) {
      setChats(prev => ({...prev, [characterToSave.id]: []}));
    }
    setEditingCharacter(null);
    setIsModalOpen(false);
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    setChats(prev => {
      const newChats = {...prev};
      delete newChats[id];
      return newChats;
    });
    if (activeCharacterId === id) {
      setActiveCharacterId(null);
    }
  };

  const handleOpenModal = (character: Character | null) => {
    setEditingCharacter(character);
    setIsModalOpen(true);
  };

  const handleGenerateQuizQuestions = useCallback(async (concept: string): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const systemInstruction = `You are an expert character development assistant. Your goal is to help a user flesh out a character concept by asking insightful, probing questions. Based on the user's initial idea, generate 5 multiple-choice questions. Each question should explore a different facet of the character's personality, motivations, or quirks. Provide 4 distinct and interesting answers for each question. The questions should be tailored to the character concept provided, not generic.`;
    
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answers: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["question", "answers"]
      }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `The character concept is: "${concept}"`,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    return JSON.parse(response.text);
  }, []);


  const handleGenerateCharacterFromDynamicQuiz = useCallback(async (concept: string, answers: { question: string; answer: string }[]) => {
      const answersString = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const systemInstruction = `You are a creative character designer. Based on the user's initial concept and their answers to a series of tailored questions, create a unique and compelling character.
      
      Generate a fitting name, a single emoji for an avatar, a detailed personality description (in the second person, e.g., "You are..."), and a proactive conversational purpose or goal.
      
      The final character profile must be a deep and consistent synthesis of all the provided information.`;

      const prompt = `Initial Concept: "${concept}"
      ---
      Q&A:
      ${answersString}
      ---
      Provide your response as a single, valid JSON object.`

      const responseSchema = {
          type: Type.OBJECT,
          properties: {
              name: { type: Type.STRING, description: "A creative name for the character." },
              avatar: { type: Type.STRING, description: "A single emoji that represents the character." },
              personality: { type: Type.STRING, description: "A detailed personality description for the AI to embody." },
              purpose: { type: Type.STRING, description: "The character's main goal for the conversation." },
          },
          required: ["name", "avatar", "personality", "purpose"],
      };

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
          },
      });

      const resultJson = JSON.parse(response.text);

      const newCharacter: Character = {
          id: crypto.randomUUID(),
          name: resultJson.name,
          avatar: resultJson.avatar,
          personality: resultJson.personality,
          purpose: resultJson.purpose,
          memory: '',
          gender: 'neutral',
          language: 'en-US',
          voiceProfile: 'medium',
          voiceSpeed: 'normal',
      };
      
      setEditingCharacter(newCharacter);
      setIsDynamicQuizModalOpen(false);
      setIsModalOpen(true);
  }, []);

  const handleAnalyzeUser = useCallback(async () => {
    if (!activeCharacterId) return;
    const currentHistory = chats[activeCharacterId] || [];
    const userMessages = currentHistory.filter(msg => msg.role === 'user');

    if (userMessages.length < 2) {
        alert("Please have a bit more conversation before analyzing the user.");
        return;
    }

    setIsAnalyzing(true);
    setIsAnalysisModalOpen(true);
    setAnalysisResult(null);

    const conversationForAnalysis = currentHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Character'}: ${msg.text}`)
        .join('\n');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const systemInstruction = `You are a psychological and behavioral analysis expert. Your task is to analyze the provided conversation transcript and create a profile of the 'User'. Based on their messages, infer their personality traits, communication style, potential interests, emotional state, and key motivators. Be insightful, objective, and base your analysis strictly on the text provided. Do not invent information.

Analyze the following conversation:
---
${conversationForAnalysis}
---

Provide your analysis in a structured JSON format.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                personality_traits: { 
                    type: Type.STRING, 
                    description: "A summary of the user's personality traits (e.g., introverted/extroverted, analytical, creative, humorous) based on the Big Five or similar models."
                },
                communication_style: { 
                    type: Type.STRING, 
                    description: "Describe the user's communication style (e.g., direct, passive, assertive, formal, informal)."
                },
                key_motivators: {
                    type: Type.STRING,
                    description: "What seems to drive or motivate the user in the context of this conversation (e.g., curiosity, problem-solving, social connection)."
                },
                potential_interests: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "List potential interests or hobbies hinted at in the conversation."
                },
                emotional_summary: { 
                    type: Type.STRING, 
                    description: "A summary of the user's apparent emotional state or tone throughout the conversation (e.g., enthusiastic, skeptical, calm)."
                }
            },
            required: ["personality_traits", "communication_style", "key_motivators", "potential_interests", "emotional_summary"],
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Please analyze the user from the conversation provided in the system instructions.",
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const resultJson = JSON.parse(response.text);
        setAnalysisResult(resultJson);

    } catch (error) {
        console.error("Error analyzing user:", error);
        alert("An error occurred while analyzing the user. Please try again.");
        setIsAnalysisModalOpen(false);
    } finally {
        setIsAnalyzing(false);
    }
  }, [activeCharacterId, chats]);

  const handleSendFollowUp = useCallback(async () => {
    if (isLoading || !activeCharacterId || followUpSentRef.current) {
      return;
    }
    const activeCharacter = characters.find(c => c.id === activeCharacterId);
    if (!activeCharacter) return;

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    followUpSentRef.current = true;
    setIsLoading(true);

    const currentHistory = chats[activeCharacterId] || [];

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const systemInstruction = getSystemInstruction(activeCharacter, chatMode);
        
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: systemInstruction,
              ...getModelConfig(chatMode),
            },
            history: currentHistory.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }],
            })),
        });

        const followUpPrompt = "The user has been silent for a moment. Send a short, natural message to re-engage them. You could ask a question, make an observation, or gently remind them of your goal. Crucially, DO NOT mention that they've been silent or ask if they are still there. Just continue the conversation smoothly.";
        const response = await chat.sendMessage({ message: followUpPrompt });
        
        let aiMessage: Message;
        try {
            const responseJson = JSON.parse(response.text);
            aiMessage = {
                id: crypto.randomUUID(),
                role: 'model',
                text: responseJson.dialogue || "...",
                thought: responseJson.thought,
                action: responseJson.action,
                userResponseOptions: responseJson.user_response_options,
            };
        } catch (e) {
            console.error("Failed to parse AI JSON response for follow-up:", e, "Response text:", response.text);
            aiMessage = { id: crypto.randomUUID(), role: 'model', text: response.text || "Hmm..?" };
        }
        
        setChats(prev => ({ ...prev, [activeCharacterId]: [...currentHistory, aiMessage] }));
    } catch (error) {
        console.error("Error sending AI follow-up:", error);
    } finally {
        setIsLoading(false);
    }
  }, [activeCharacterId, characters, chats, isLoading, chatMode]);

  const latestHandleSendFollowUp = useRef(handleSendFollowUp);
  useEffect(() => {
    latestHandleSendFollowUp.current = handleSendFollowUp;
  }, [handleSendFollowUp]);

  const handleProactiveGreeting = useCallback(async () => {
    if (isLoading || !activeCharacterId) {
      return;
    }
    const activeCharacter = characters.find(c => c.id === activeCharacterId);
    if (!activeCharacter) return;

    const currentHistory = chats[activeCharacterId] || [];
    if (currentHistory.length > 0) return; // Don't greet if chat has started

    if (proactiveGreetingTimerRef.current) {
        clearTimeout(proactiveGreetingTimerRef.current);
        proactiveGreetingTimerRef.current = null;
    }

    setIsLoading(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const systemInstruction = getSystemInstruction(activeCharacter, chatMode);
        
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
              systemInstruction: systemInstruction,
              ...getModelConfig(chatMode),
            },
            history: [], // Greeting starts with no history
        });

        const greetingPrompt = "You are starting the conversation. Say hello in your own unique way and say something to engage the user, based on your purpose. Be proactive. DO NOT mention that the user has been silent or that you are starting because they were idle.";
        const response = await chat.sendMessage({ message: greetingPrompt });
        
        let aiMessage: Message;
        try {
            const responseJson = JSON.parse(response.text);
            aiMessage = {
                id: crypto.randomUUID(),
                role: 'model',
                text: responseJson.dialogue || "...",
                thought: responseJson.thought,
                action: responseJson.action,
                userResponseOptions: responseJson.user_response_options,
            };
        } catch (e) {
            console.error("Failed to parse AI JSON response for greeting:", e, "Response text:", response.text);
            aiMessage = { id: crypto.randomUUID(), role: 'model', text: response.text || "Hello there." };
        }
        
        const updatedHistory = [...currentHistory, aiMessage];
        setChats(prev => ({ ...prev, [activeCharacterId]: updatedHistory }));

        // Set the timer for a follow-up if the user doesn't respond to the greeting
        if (chatMode === 'normal') {
            inactivityTimerRef.current = setTimeout(() => {
                latestHandleSendFollowUp.current();
            }, 15000);
        }

    } catch (error) {
        console.error("Error sending AI greeting:", error);
    } finally {
        setIsLoading(false);
    }
  }, [activeCharacterId, characters, chats, isLoading, chatMode]);

  const latestHandleProactiveGreeting = useRef(handleProactiveGreeting);
  useEffect(() => {
    latestHandleProactiveGreeting.current = handleProactiveGreeting;
  }, [handleProactiveGreeting]);

  // Effect to handle proactive greetings for new chats
  useEffect(() => {
    if (proactiveGreetingTimerRef.current) {
      clearTimeout(proactiveGreetingTimerRef.current);
    }

    if (activeCharacterId && (!chats[activeCharacterId] || chats[activeCharacterId].length === 0)) {
      proactiveGreetingTimerRef.current = setTimeout(() => {
        latestHandleProactiveGreeting.current();
      }, 10000); // 10 seconds to greet
    }

    return () => {
      if (proactiveGreetingTimerRef.current) {
        clearTimeout(proactiveGreetingTimerRef.current);
      }
    };
  }, [activeCharacterId, chats]);
  
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!activeCharacterId) return;

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (proactiveGreetingTimerRef.current) {
        clearTimeout(proactiveGreetingTimerRef.current);
        proactiveGreetingTimerRef.current = null;
    }
    followUpSentRef.current = false;

    const activeCharacter = characters.find(c => c.id === activeCharacterId);
    if (!activeCharacter) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: messageText };
    const currentHistory = chats[activeCharacterId] || [];
    const updatedHistory = [...currentHistory, userMessage];

    setChats(prev => ({ ...prev, [activeCharacterId]: updatedHistory }));
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const systemInstruction = getSystemInstruction(activeCharacter, chatMode);
      
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          ...getModelConfig(chatMode),
        },
        history: currentHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      });

      const response = await chat.sendMessage({ message: messageText });
      
      let aiMessage: Message;
      try {
        const responseJson = JSON.parse(response.text);
        aiMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: responseJson.dialogue || "...",
            thought: responseJson.thought,
            action: responseJson.action,
            userResponseOptions: responseJson.user_response_options,
        };
      } catch (e) {
        console.error("Failed to parse AI JSON response:", e, "Response text:", response.text);
        aiMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: response.text || "I seem to be having trouble thinking straight...",
        };
      }
      
      setChats(prev => ({ ...prev, [activeCharacterId]: [...updatedHistory, aiMessage] }));

      if (chatMode === 'normal') {
        inactivityTimerRef.current = setTimeout(() => {
          latestHandleSendFollowUp.current();
        }, 15000); // 15 seconds of inactivity
      }

    } catch (error) {
      console.error("Error communicating with Gemini API:", error);
      const errorMessage: Message = { id: crypto.randomUUID(), role: 'model', text: 'Oops! Something went wrong. Please check your API key and try again.' };
      setChats(prev => ({ ...prev, [activeCharacterId]: [...updatedHistory, errorMessage] }));
    } finally {
      setIsLoading(false);
    }
  }, [activeCharacterId, characters, chats, chatMode]);

  const activeCharacter = characters.find(c => c.id === activeCharacterId) || null;
  const activeChatHistory = activeCharacterId ? chats[activeCharacterId] || [] : [];

  return (
    <div className="flex h-screen w-screen bg-brand-primary text-brand-text font-sans">
      <Sidebar
        characters={characters}
        activeCharacterId={activeCharacterId}
        onSelectCharacter={setActiveCharacterId}
        onNewCharacter={() => handleOpenModal(null)}
        onEditCharacter={handleOpenModal}
        onDeleteCharacter={handleDeleteCharacter}
        onNewCharacterFromQuiz={() => setIsDynamicQuizModalOpen(true)}
      />
      <main className="flex-1 flex flex-col">
        {activeCharacter ? (
          <ChatWindow
            character={activeCharacter}
            messages={activeChatHistory}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onAnalyzeUser={handleAnalyzeUser}
            isAnalyzing={isAnalyzing}
            chatMode={chatMode}
            onSetChatMode={setChatMode}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-brand-subtext p-8">
            <SparklesIcon className="w-24 h-24 mb-6" />
            <h1 className="text-3xl font-bold text-brand-text mb-2">Welcome to AI Character Chat</h1>
            <p className="max-w-md">Select a character from the sidebar to start chatting, or create a new one to bring your own AI personality to life.</p>
          </div>
        )}
      </main>
      {isDynamicQuizModalOpen && (
        <DynamicQuizModal
            onClose={() => setIsDynamicQuizModalOpen(false)}
            onGenerateQuestions={handleGenerateQuizQuestions}
            onGenerateCharacter={handleGenerateCharacterFromDynamicQuiz}
        />
      )}
      {isModalOpen && (
        <CharacterModal
          character={editingCharacter}
          onSave={handleSaveCharacter}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      {isAnalysisModalOpen && (
        <AnalysisModal
            isLoading={isAnalyzing}
            analysis={analysisResult}
            onClose={() => setIsAnalysisModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;