
import React from 'react';
import type { UserAnalysis } from '../types';

interface AnalysisModalProps {
  analysis: UserAnalysis | null;
  isLoading: boolean;
  onClose: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-accent"></div>
    </div>
);

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-4">
        <h4 className="text-md font-semibold text-brand-accent mb-1">{title}</h4>
        <div className="bg-brand-primary p-3 rounded-md text-sm text-brand-text">{children}</div>
    </div>
);

const AnalysisModal: React.FC<AnalysisModalProps> = ({ analysis, isLoading, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-secondary rounded-lg shadow-2xl p-6 w-full max-w-2xl text-brand-text max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold">User Analysis Report</h2>
            <button onClick={onClose} className="text-2xl font-light text-brand-subtext hover:text-brand-text">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            {isLoading && !analysis && <LoadingSpinner />}
            {analysis && (
                <div>
                    <AnalysisSection title="Personality Traits">
                        <p>{analysis.personality_traits}</p>
                    </AnalysisSection>
                    <AnalysisSection title="Communication Style">
                        <p>{analysis.communication_style}</p>
                    </AnalysisSection>
                    <AnalysisSection title="Key Motivators">
                        <p>{analysis.key_motivators}</p>
                    </AnalysisSection>
                    <AnalysisSection title="Potential Interests">
                        {analysis.potential_interests.length > 0 ? (
                            <ul className="list-disc list-inside">
                                {analysis.potential_interests.map((interest, index) => <li key={index}>{interest}</li>)}
                            </ul>
                        ) : (
                            <p className="text-brand-subtext italic">No specific interests detected.</p>
                        )}
                    </AnalysisSection>
                    <AnalysisSection title="Emotional Summary">
                         <p>{analysis.emotional_summary}</p>
                    </AnalysisSection>
                </div>
            )}
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-600 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
