import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";

export interface AINutritionResult {
  dish_name: string;
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fats_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_details?: any;
}

let cachedConfig: any = null;
let lastCallTime = 0;
const COOLDOWN_MS = 2000; // 2 second cooldown between requests
let requestQueue: Promise<any> = Promise.resolve();

export const getAIConfig = async () => {
  if (cachedConfig) return cachedConfig;

  // Try to use environment variables first to allow overriding database config
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const preferredProvider = import.meta.env.VITE_AI_PROVIDER;

  // If environment variables are set and not placeholders, use them
  if (preferredProvider === 'openrouter' && openRouterKey && !openRouterKey.includes('PLACEHOLDER')) {
    return {
      provider: 'openrouter',
      model: import.meta.env.VITE_AI_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
      api_key: openRouterKey
    };
  }

  if (preferredProvider === 'google' && geminiKey && !geminiKey.includes('PLACEHOLDER')) {
    return {
      provider: 'google',
      model: import.meta.env.VITE_AI_MODEL || 'gemini-1.5-flash',
      api_key: geminiKey
    };
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'ai_config')
      .single();

    if (data?.value && data.value.api_key && !data.value.api_key.includes('PLACEHOLDER')) {
      cachedConfig = data.value;
      return cachedConfig;
    }
  } catch (error) {
    console.error('Error fetching AI config from database:', error);
  }

  // Fallback to environment variables if database config is missing or invalid
  if (openRouterKey && !openRouterKey.includes('PLACEHOLDER')) {
    const config = {
      provider: 'openrouter',
      model: import.meta.env.VITE_AI_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
      api_key: openRouterKey
    };
    cachedConfig = config;
    return config;
  }

  if (geminiKey && !geminiKey.includes('PLACEHOLDER')) {
    const config = {
      provider: 'google',
      model: import.meta.env.VITE_AI_MODEL || 'gemini-1.5-flash',
      api_key: geminiKey
    };
    cachedConfig = config;
    return config;
  }

  // Default fallback
  return {
    provider: 'openrouter',
    model: 'nvidia/nemotron-3-nano-30b-a3b:free',
    api_key: ''
  };
};

export const clearAIConfigCache = () => {
  cachedConfig = null;
};

export const analyzeFoodImage = async (base64Image: string): Promise<AINutritionResult | null> => {
  try {
    const config = await getAIConfig();

    if (!config.api_key && config.provider !== 'puter') {
      console.warn('AI API key is missing. Please configure it in settings.');
      return null;
    }

    const prompt = `
      Analyze this image of a food product or dish. 
      If it's a nutrition label, extract the exact values per serving. 
      If it's a photo of a dish, estimate the nutritional values.
      Return ONLY a JSON object with these keys: 
      dish_name (string), calories_kcal (number), protein_g (number), carbohydrates_g (number), fats_g (number), fiber_g (number), sugar_g (number), sodium_mg (number).
      Do not include markdown or explanations.
    `;

    let responseText = '';

    if (config.provider === 'puter') {
      // @ts-ignore - Puter is loaded via script tag
      const response = await window.puter.ai.chat(
        prompt,
        base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
        { model: config.model || 'gemini-3-flash-preview' }
      );
      responseText = response.toString();
    } else if (config.provider === 'openrouter') {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.api_key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Challenge Gym Fitness"
        },
        body: JSON.stringify({
          "model": config.model || "nvidia/nemotron-3-nano-30b-a3b:free",
          "max_tokens": 1000,
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": prompt
                },
                {
                  "type": "image_url",
                  "image_url": {
                    "url": base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenRouter Image Analysis Error:', errorData);
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      responseText = data.choices[0].message.content;
    } else {
      const genAI = new GoogleGenerativeAI(config.api_key);
      const model = genAI.getGenerativeModel({ model: config.model.split('/').pop() || "gemini-1.5-flash" });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: "image/jpeg",
          },
        },
      ]);
      responseText = result.response.text();
    }

    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI analysis failed:", error);
    return null;
  }
};

export const generateAIChatResponse = async (input: string | ChatMessage[]): Promise<any> => {
  const executeRequest = async () => {
    try {
      let now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      if (timeSinceLastCall < COOLDOWN_MS) {
        const waitTime = COOLDOWN_MS - timeSinceLastCall;
        console.log(`AI request cooldown active. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      lastCallTime = Date.now();

      const config = await getAIConfig();

      if (config.provider === 'puter') {
        // @ts-ignore
        const response = await window.puter.ai.chat(typeof input === 'string' ? input : input[input.length - 1].content, {
          model: config.model || 'gemini-3-flash-preview'
        });
        return response.toString();
      }

      if (!config.api_key && config.provider !== 'puter') {
        return "AI analysis is currently unavailable. Please check the API configuration in settings.";
      }

      if (config.provider === 'openrouter') {
        const messages = typeof input === 'string' 
          ? [{ role: 'user', content: input }]
          : input;

        console.log('Sending request to OpenRouter...', { 
          model: config.model,
          hasApiKey: !!config.api_key,
          apiKeyPrefix: config.api_key ? config.api_key.substring(0, 7) + '...' : 'none'
        });

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Challenge Gym Fitness"
          },
          body: JSON.stringify({
            "model": config.model || "nvidia/nemotron-3-nano-30b-a3b:free",
            "max_tokens": 1000,
            "messages": messages,
            "reasoning": { "enabled": true }
          })
        });

        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          let errorData: any = null;
          try {
            errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
            console.error('OpenRouter Error details:', errorData.error);
          } catch (e) {
            // Fallback if JSON parsing fails
          }
          
          if (response.status === 502 && errorMsg.includes('Clerk')) {
            errorMsg = "OpenRouter authentication error. Please check if your API key is valid and correctly configured in settings or .env file.";
          }
          
          const error = new Error(errorMsg);
          (error as any).status = response.status;
          (error as any).details = errorData;
          throw error;
        }

        const data = await response.json();
        return data.choices[0].message;
      } else {
        const genAI = new GoogleGenerativeAI(config.api_key);
        const model = genAI.getGenerativeModel({ model: config.model.split('/').pop() || "gemini-1.5-flash" });
        
        if (typeof input === 'string') {
          const result = await model.generateContent(input);
          return { role: 'assistant', content: result.response.text() };
        } else {
          // Simplistic conversion for Gemini SDK
          const lastMessage = input[input.length - 1].content;
          const result = await model.generateContent(lastMessage);
          return { role: 'assistant', content: result.response.text() };
        }
      }
    } catch (error: any) {
      if (error.message?.includes('429')) {
        error.status = 429;
      }
      console.error('Chat AI Error:', error);
      throw error;
    }
  };

  // Add this request to the queue to ensure sequential execution with cooldown
  const currentRequest = (async () => {
    try {
      await requestQueue.catch(() => { }); // Wait for previous request to settle
      return await executeRequest();
    } catch (error) {
      throw error;
    }
  })();

  requestQueue = currentRequest;
  return currentRequest;
};
