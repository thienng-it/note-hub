/**
 * AI Service - Provides text improvement features using multiple AI providers
 * Supports: OpenAI, Google Gemini, and local Ollama
 */
import axios from 'axios';

/**
 * AI Provider Configuration
 */
export const AI_PROVIDERS = {
  OPENAI: 'openai' as const,
  GEMINI: 'gemini' as const,
  OLLAMA: 'ollama' as const,
};

type RewriteStyle = 'professional' | 'casual' | 'concise';

interface AIConfig {
  provider: string | null;
  openaiApiKey: string | null;
  openaiModel: string;
  geminiApiKey: string | null;
  geminiModel: string;
  ollamaUrl: string;
  ollamaModel: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  model?: string;
  url?: string;
}

interface AIStatus {
  enabled: boolean;
  provider: string | null;
  availableProviders: ProviderInfo[];
}

/**
 * Get AI configuration from environment
 */
function getAIConfig(): AIConfig {
  return {
    provider: process.env.AI_PROVIDER || null,
    openaiApiKey: process.env.OPENAI_API_KEY || null,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    geminiApiKey: process.env.GEMINI_API_KEY || null,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
  };
}

/**
 * Check if AI features are enabled
 */
export function isAIEnabled(): boolean {
  const config = getAIConfig();
  const { provider, openaiApiKey, geminiApiKey } = config;

  if (!provider) {
    return false;
  }

  if (provider === AI_PROVIDERS.OPENAI && !openaiApiKey) {
    return false;
  }

  if (provider === AI_PROVIDERS.GEMINI && !geminiApiKey) {
    return false;
  }

  return true;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(systemPrompt: string, userContent: string): Promise<string> {
  const config = getAIConfig();

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    throw new Error(
      `Failed to process with OpenAI: ${error.response?.data?.error?.message || error.message}`,
    );
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(systemPrompt: string, userContent: string): Promise<string> {
  const config = getAIConfig();

  try {
    const prompt = `${systemPrompt}\n\n${userContent}`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error(
      `Failed to process with Gemini: ${error.response?.data?.error?.message || error.message}`,
    );
  }
}

/**
 * Call local Ollama API
 */
async function callOllama(systemPrompt: string, userContent: string): Promise<string> {
  const config = getAIConfig();

  try {
    const response = await axios.post(
      `${config.ollamaUrl}/api/generate`,
      {
        model: config.ollamaModel,
        prompt: `${systemPrompt}\n\n${userContent}`,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.response;
  } catch (error: any) {
    console.error('Ollama API error:', error.response?.data || error.message);
    throw new Error(`Failed to process with Ollama: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Call the configured AI provider
 */
async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  const config = getAIConfig();

  switch (config.provider) {
    case AI_PROVIDERS.OPENAI:
      return await callOpenAI(systemPrompt, userContent);
    case AI_PROVIDERS.GEMINI:
      return await callGemini(systemPrompt, userContent);
    case AI_PROVIDERS.OLLAMA:
      return await callOllama(systemPrompt, userContent);
    default:
      throw new Error('Invalid AI provider configured');
  }
}

/**
 * Proofread text - fix grammar, spelling, and punctuation
 */
export async function proofreadText(text: string): Promise<string> {
  if (!isAIEnabled()) {
    throw new Error('AI features are not enabled. Please configure an AI provider.');
  }

  const systemPrompt = `You are a professional proofreader. Your task is to correct grammar, spelling, and punctuation errors in the provided text while maintaining the original meaning and tone. Return ONLY the corrected text without any additional commentary or explanations.`;

  return await callAI(systemPrompt, text);
}

/**
 * Summarize text - create a concise summary
 */
export async function summarizeText(text: string): Promise<string> {
  if (!isAIEnabled()) {
    throw new Error('AI features are not enabled. Please configure an AI provider.');
  }

  const systemPrompt = `You are a professional summarizer. Create a clear, concise summary of the provided text that captures the main points and key ideas. Return ONLY the summary without any additional commentary or explanations.`;

  return await callAI(systemPrompt, text);
}

/**
 * Rewrite text - improve clarity and style
 */
export async function rewriteText(text: string, style: RewriteStyle = 'professional'): Promise<string> {
  if (!isAIEnabled()) {
    throw new Error('AI features are not enabled. Please configure an AI provider.');
  }

  let styleInstruction = '';
  switch (style) {
    case 'professional':
      styleInstruction = 'in a professional and clear manner';
      break;
    case 'casual':
      styleInstruction = 'in a casual and friendly manner';
      break;
    case 'concise':
      styleInstruction = 'in a more concise manner while keeping all key information';
      break;
    default:
      styleInstruction = 'to improve clarity and readability';
  }

  const systemPrompt = `You are a professional writer. Rewrite the provided text ${styleInstruction}. Return ONLY the rewritten text without any additional commentary or explanations.`;

  return await callAI(systemPrompt, text);
}

/**
 * Get AI status and configuration
 */
export function getAIStatus(): AIStatus {
  const config = getAIConfig();
  const enabled = isAIEnabled();

  return {
    enabled,
    provider: config.provider,
    availableProviders: [
      {
        id: AI_PROVIDERS.OPENAI,
        name: 'OpenAI',
        configured: !!config.openaiApiKey,
        model: config.openaiModel,
      },
      {
        id: AI_PROVIDERS.GEMINI,
        name: 'Google Gemini',
        configured: !!config.geminiApiKey,
        model: config.geminiModel,
      },
      {
        id: AI_PROVIDERS.OLLAMA,
        name: 'Ollama (Local)',
        configured: true, // Ollama doesn't require API key
        url: config.ollamaUrl,
        model: config.ollamaModel,
      },
    ],
  };
}

export default {
  AI_PROVIDERS,
  isAIEnabled,
  proofreadText,
  summarizeText,
  rewriteText,
  getAIStatus,
};
