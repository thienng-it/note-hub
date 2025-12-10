/**
 * AI Routes - Text improvement features using AI
 */

import type { Request, Response } from 'express';
import express from 'express';
import { jwtRequired } from '../middleware/auth';

const AIService = require('../services/aiService');
const router = express.Router();

/**
 * GET /api/ai/status - Get AI status and configuration
 */
router.get('/status', jwtRequired, async (_req: Request, res: Response) => {
  try {
    const status = AIService.getAIStatus();
    return res.json(status);
  } catch (error) {
    console.error('Get AI status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ai/proofread - Proofread text
 */
router.post('/proofread', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
    }

    const result = await AIService.proofreadText(text);
    return res.json({ result });
  } catch (error) {
    console.error('Proofread error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to proofread text' });
  }
});

/**
 * POST /api/ai/summarize - Summarize text
 */
router.post('/summarize', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
    }

    const result = await AIService.summarizeText(text);
    return res.json({ result });
  } catch (error) {
    console.error('Summarize error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to summarize text' });
  }
});

/**
 * POST /api/ai/rewrite - Rewrite text
 */
router.post('/rewrite', jwtRequired, async (req: Request, res: Response) => {
  try {
    const { text, style = 'professional' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
      return;
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
    return res.json({ result });
  } catch (error) {
    console.error('Rewrite error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to rewrite text' });
  }
});

export = router;
