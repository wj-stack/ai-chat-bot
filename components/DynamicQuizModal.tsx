import React, { useState } from 'react';
import type { QuizQuestion } from '../types';

interface DynamicQuizModalProps {
  onClose: () => void;
  onGenerateQuestions: (concept: string) => Promise<QuizQuestion[]>;
  onGenerateCharacter: (concept: string, answers: { question: string; answer: string }[]) => Promise<void>;
}

const LoadingView: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-accent"></div>
        <p className="mt-4 text-brand-subtext">{text}</p>
        <p className="text-sm text-brand-subtext">This might take a moment.</p>
    </div>
);


const DynamicQuizModal: React.FC<DynamicQuizModalProps> = ({ onClose, onGenerateQuestions, onGenerateCharacter }) => {
  const [view, setView] = useState<'concept' | 'quiz' | 'loading'>('concept');
  const [loadingText, setLoadingText] = useState('');
  
  const [concept, setConcept] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleConceptSubmit = async () => {
    if (!concept.trim()) {
        setError("Please enter a character concept.");
        return;
    }
    setError(null);
    setView('loading');
    setLoadingText('Generating tailored questions...');
    try {
        const generatedQuestions = await onGenerateQuestions(concept);
        if (generatedQuestions && generatedQuestions.length > 0) {
            setQuestions(generatedQuestions);
            setCurrentQuestionIndex(0);
            setAnswers({});
            setView('quiz');
        } else {
            throw new Error("The AI didn't return any questions. Please try a different concept.");
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
        setView('concept');
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleGenerateCharacter = async () => {
    setView('loading');
    setLoadingText('Crafting your character...');
    try {
        const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
          question: questions[parseInt(index)].question,
          answer: answer
        }));
        await onGenerateCharacter(concept, formattedAnswers);
        // The modal will be closed by the parent component on success
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred while generating the character.");
        setView('quiz');
    }
  };

  const renderConceptView = () => (
    <>
        <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-xl text-center mb-2">What's your character idea?</h3>
            <p className="text-brand-subtext text-center mb-4">Start with a core concept, and the AI will ask questions to flesh it out. <br/> (e.g., "A grumpy space pirate who secretly loves kittens")</p>
            <textarea
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                rows={3}
                className="w-full bg-brand-primary p-2 rounded-md border border-slate-600 focus:ring-2 focus:ring-brand-accent focus:outline-none"
                placeholder="Enter character concept here..."
            />
            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        </div>
        <div className="flex justify-end items-center mt-8 pt-4 border-t border-slate-600">
             <button
                onClick={handleConceptSubmit}
                disabled={!concept.trim()}
                className="px-6 py-2 rounded-md bg-brand-accent hover:bg-sky-400 transition-colors font-semibold disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
                Generate Questions
            </button>
        </div>
    </>
  );

  const renderQuizView = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = answers[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    if (!currentQuestion) {
        return <p>Error: No question to display.</p>;
    }

    return (
        <>
            <div className="flex-1">
                <div className="mb-4">
                    <p className="text-brand-subtext font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <h3 className="text-xl mt-1">{currentQuestion.question}</h3>
                </div>
                <div className="space-y-3">
                    {currentQuestion.answers.map((answer, index) => (
                    <button
                        key={index}
                        onClick={() => handleAnswerSelect(answer)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors duration-200 ${
                        selectedAnswer === answer
                            ? 'bg-brand-accent/30 border-brand-accent'
                            : 'bg-brand-primary border-slate-600 hover:border-sky-500'
                        }`}
                    >
                        {answer}
                    </button>
                    ))}
                </div>
                 {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-600">
                <button
                onClick={handleBack}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Back
                </button>
                
                {isLastQuestion ? (
                    <button
                        onClick={handleGenerateCharacter}
                        disabled={!selectedAnswer}
                        className="px-6 py-2 rounded-md bg-brand-accent hover:bg-sky-400 transition-colors font-semibold disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        Generate Character
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={!selectedAnswer}
                        className="px-6 py-2 rounded-md bg-brand-accent hover:bg-sky-400 transition-colors font-semibold disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                )}
            </div>
        </>
    );
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-secondary rounded-lg shadow-2xl p-8 w-full max-w-2xl text-brand-text flex flex-col min-h-[500px]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold">Create Character with AI</h2>
          <button onClick={onClose} className="text-2xl font-light text-brand-subtext hover:text-brand-text">&times;</button>
        </div>
        
        <div className="flex-1 flex flex-col">
            {view === 'concept' && renderConceptView()}
            {view === 'quiz' && renderQuizView()}
            {view === 'loading' && <LoadingView text={loadingText} />}
        </div>
      </div>
    </div>
  );
};

export default DynamicQuizModal;