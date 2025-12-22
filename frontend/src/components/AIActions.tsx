import { t } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { aiApi } from '../api/client';
import type { AIRewriteStyle, AIStatus } from '../types';
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

  const loadAIStatus = useCallback(async () => {
    try {
      const status = await aiApi.getStatus();
      setAiStatus(status);
    } catch (err) {
      logger.error('Failed to load AI status', err);
    }
  }, []);

  useEffect(() => {
    loadAIStatus();
  }, [loadAIStatus]);

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
      <div className={`ai-actions-container ${className}`}>
        <span className="ai-actions-label">
          <i className="fas fa-sparkles"></i>
          <span>AI Tools:</span>
        </span>

        <div className="ai-actions-buttons">
          <button
            type="button"
            onClick={handleProofread}
            disabled={isLoading}
            className="ai-action-btn ai-btn-proofread"
            title={t('common.proofreadTitle')}
          >
            <i className="fas fa-spell-check"></i>
            <span>{t('ai.proofread')}</span>
          </button>

          <button
            type="button"
            onClick={handleSummarize}
            disabled={isLoading}
            className="ai-action-btn ai-btn-summarize"
            title={t('common.summarizeTitle')}
          >
            <i className="fas fa-compress-alt"></i>
            <span>{t('ai.summarize')}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              disabled={isLoading}
              className="ai-action-btn ai-btn-rewrite"
              title={t('common.rewriteTitle')}
            >
              <i className="fas fa-pen-fancy"></i>
              <span>{t('ai.rewrite')}</span>
              <i className="fas fa-chevron-down ai-btn-arrow"></i>
            </button>

            {showStyleMenu && (
              <div className="ai-style-menu">
                <button
                  type="button"
                  onClick={() => handleRewrite('professional')}
                  className="ai-style-option"
                >
                  <i className="fas fa-briefcase"></i>
                  <span>{t('ai.professional')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRewrite('casual')}
                  className="ai-style-option"
                >
                  <i className="fas fa-smile"></i>
                  <span>{t('ai.casual')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRewrite('concise')}
                  className="ai-style-option"
                >
                  <i className="fas fa-compress"></i>
                  <span>{t('ai.concise')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <span className="ai-loading-indicator">
            <i className="fas fa-spinner fa-spin"></i>
            <span>{t('common.processing')}</span>
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="ai-error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Result Modal */}
      {showResult && result && (
        <div className="ai-modal-overlay">
          <div className="ai-modal">
            <div className="ai-modal-header">
              <h3 className="ai-modal-title">
                <i className="fas fa-sparkles"></i>
                <span>AI Result</span>
              </h3>
              <button
                type="button"
                onClick={handleDismiss}
                className="ai-modal-close"
                title={t('common.closeTitle')}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="ai-modal-content">{result}</div>

            <div className="ai-modal-actions">
              <button type="button" onClick={handleDismiss} className="ai-modal-btn btn-dismiss">
                Dismiss
              </button>
              {onApply && (
                <button type="button" onClick={handleApply} className="ai-modal-btn btn-apply">
                  <i className="fas fa-check"></i>
                  <span>{t('common.apply')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close style menu */}
      {showStyleMenu && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
          onClick={() => setShowStyleMenu(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowStyleMenu(false)}
          tabIndex={-1}
          aria-label="Close style menu"
        />
      )}
    </>
  );
}
