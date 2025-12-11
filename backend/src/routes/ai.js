/**
 * AI Routes - Text improvement features using AI
 */
import express from 'express';
import logger from '../config/logger.js';

const router = express.Router();

import { jwtRequired } from '../middleware/auth.js';
import * as AIService from '../services/aiService.js';

/**
 * GET /api/ai/status - Get AI status and configuration
 */
router.get('/status', jwtRequired, async (_req, res) => {
  try {
    const status = AIService.getAIStatus();
    res.json(status);
  } catch (error) {
    logger.error('Get AI status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ai/proofread - Proofread text
 */
router.post('/proofread', jwtRequired, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
    }

    const result = await AIService.proofreadText(text);
    res.json({ result });
  } catch (error) {
    logger.error('Proofread error:', error);
    res.status(500).json({ error: error.message || 'Failed to proofread text' });
  }
});

/**
 * POST /api/ai/summarize - Summarize text
 */
router.post('/summarize', jwtRequired, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
    }

    const result = await AIService.summarizeText(text);
    res.json({ result });
  } catch (error) {
    logger.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize text' });
  }
});

/**
 * POST /api/ai/rewrite - Rewrite text
 */
router.post('/rewrite', jwtRequired, async (req, res) => {
  try {
    const { text, style = 'professional' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
    }

    const validStyles = ['professional', 'casual', 'concise'];
    if (!validStyles.includes(style)) {
      return res
        .status(400)
        .json({ error: 'Invalid style. Must be one of: professional, casual, concise' });
    }

    const result = await AIService.rewriteText(text, style);
    res.json({ result });
  } catch (error) {
    logger.error('Rewrite error:', error);
    res.status(500).json({ error: error.message || 'Failed to rewrite text' });
  }
});

export default router;
