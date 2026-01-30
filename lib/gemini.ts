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

let cachedConfig: any = null;
let lastCallTime = 0;
const COOLDOWN_MS = 2000; // 2 second cooldown between requests

export const getAIConfig = async () => {
  if (cachedConfig) return cachedConfig;

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'ai_config')
      .single();
    
    if (data?.value && data.value.api_key) {
      cachedConfig = data.value;
      return cachedConfig;
    }
  } catch (error) {
    console.error('Error fetching AI config:', error);
  }
  
  // Try to use environment variables if database config is missing
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
  const envProvider = import.meta.env.VITE_AI_PROVIDER || (import.meta.env.VITE_GEMINI_API_KEY ? 'google' : 'openrouter');
  const envModel = import.meta.env.VITE_AI_MODEL || (envProvider === 'google' ? 'gemini-1.5-flash' : 'google/gemini-2.0-flash-exp:free');

  if (envKey) {
    const config = {
      provider: envProvider,
      model: envModel,
      api_key: envKey
    };
    cachedConfig = config;
    return config;
  }
  
  // Default fallback
  const defaultConfig = {
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-exp:free',
    api_key: ''
  };
  return defaultConfig;
};

export const clearAIConfigCache = () => {
  cachedConfig = null;
};

export const analyzeFoodImage = async (base64Image: string): Promise<AINutritionResult | null> => {
  try {
    const config = await getAIConfig();
    
    if (!config.api_key) {
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

    if (config.provider === 'openrouter') {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.api_key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "PowerFlex Fitness"
        },
        body: JSON.stringify({
          "model": config.model || "google/gemini-2.0-flash-exp:free",
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

      const data = await response.json();
      if (data.error) {
        console.error('OpenRouter Error:', data.error);
        throw new Error(data.error.message || 'OpenRouter API error');
      }
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

export const generateAIChatResponse = async (fullPrompt: string): Promise<string> => {
  try {
    const now = Date.now();
    if (now - lastCallTime < COOLDOWN_MS) {
      console.warn('AI request cooldown active. Skipping request.');
      throw new Error('429: AI request cooldown active. Please wait a few seconds.');
    }
    lastCallTime = now;

    const config = await getAIConfig();

    if (!config.api_key) {
      return "AI analysis is currently unavailable. Please check the API configuration in settings.";
    }

    if (config.provider === 'openrouter') {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.api_key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "PowerFlex Fitness"
        },
        body: JSON.stringify({
          "model": config.model || "google/gemini-2.0-flash-exp:free",
          "max_tokens": 1000,
          "messages": [
            {
              "role": "user",
              "content": fullPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorMsg;
          console.error('OpenRouter Error details:', errorData.error);
        } catch (e) {
          // Fallback if JSON parsing fails
        }
        const error = new Error(errorMsg);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } else {
      const genAI = new GoogleGenerativeAI(config.api_key);
      const model = genAI.getGenerativeModel({ model: config.model.split('/').pop() || "gemini-1.5-flash" });
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    }
  } catch (error: any) {
    if (error.message?.includes('429')) {
      error.status = 429;
    }
    console.error('Chat AI Error:', error);
    throw error;
  }
};
