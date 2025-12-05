import { useState, useEffect } from 'react';
import { aiApi } from '../api/client';
import type { AIStatus, AIRewriteStyle } from '../types';
import { logger } from '../utils/logger';

interface AIActionsProps {
  text: string;
  onApply?: (newText: string) => void;
  className?: string;
}

export function AIActions({ text, onApply, className = '' }: AIActionsProps) {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  useEffect(() => {
    loadAIStatus();
  }, []);

  const loadAIStatus = async () => {
    try {
      const status = await aiApi.getStatus();
      setAiStatus(status);
    } catch (err) {
      logger.error('Failed to load AI status', err);
    }
  };

  const handleProofread = async () => {
    if (!text.trim()) {
      setError('Please enter some text first');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setShowResult(false);

    try {
      const proofreadText = await aiApi.proofread(text);
      setResult(proofreadText);
      setShowResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proofread text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!text.trim()) {
      setError('Please enter some text first');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setShowResult(false);

    try {
      const summary = await aiApi.summarize(text);
      setResult(summary);
      setShowResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to summarize text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRewrite = async (style: AIRewriteStyle) => {
    if (!text.trim()) {
      setError('Please enter some text first');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setShowResult(false);
    setShowStyleMenu(false);

    try {
      const rewrittenText = await aiApi.rewrite(text, style);
      setResult(rewrittenText);
      setShowResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rewrite text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply && result) {
      onApply(result);
      setShowResult(false);
      setResult('');
    }
  };

  const handleDismiss = () => {
    setShowResult(false);
    setResult('');
    setError('');
  };

  // Don't show if AI is not enabled
  if (!aiStatus?.enabled) {
    return null;
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-[var(--text-muted)] mr-2">
          <i className="fas fa-sparkles mr-1"></i>
          AI Tools:
        </span>
        
        <button
          onClick={handleProofread}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Proofread and fix grammar"
        >
          <i className="fas fa-spell-check mr-1"></i>
          Proofread
        </button>

        <button
          onClick={handleSummarize}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create a summary"
        >
          <i className="fas fa-compress-alt mr-1"></i>
          Summarize
        </button>

        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rewrite in different style"
          >
            <i className="fas fa-pen-fancy mr-1"></i>
            Rewrite
            <i className="fas fa-chevron-down ml-1 text-xs"></i>
          </button>

          {showStyleMenu && (
            <div className="absolute top-full mt-1 left-0 glass-card rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
              <button
                onClick={() => handleRewrite('professional')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <i className="fas fa-briefcase mr-2"></i>
                Professional
              </button>
              <button
                onClick={() => handleRewrite('casual')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <i className="fas fa-smile mr-2"></i>
                Casual
              </button>
              <button
                onClick={() => handleRewrite('concise')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <i className="fas fa-compress mr-2"></i>
                Concise
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <span className="text-sm text-[var(--text-muted)]">
            <i className="fas fa-spinner fa-spin mr-1"></i>
            Processing...
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {error}
        </div>
      )}

      {/* Result Modal */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                <i className="fas fa-sparkles text-yellow-500 mr-2"></i>
                AI Result
              </h3>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mb-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] whitespace-pre-wrap font-mono text-sm max-h-[50vh] overflow-y-auto">
              {result}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
              {onApply && (
                <button
                  onClick={handleApply}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-check mr-2"></i>
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close style menu */}
      {showStyleMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStyleMenu(false)}
        />
      )}
    </>
  );
}
