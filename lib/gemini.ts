import { GoogleGenerativeAI } from "@google/generative-ai";

// Standardizing on gemini-2.5-flash for 2026 performance and multimodal capabilities
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

export const analyzeFoodImage = async (base64Image: string): Promise<AINutritionResult | null> => {
  try {
    const prompt = `
      Analyze this image of a food product or dish. 
      If it's a nutrition label, extract the exact values per serving. 
      If it's a photo of a dish, estimate the nutritional values.
      Return ONLY a JSON object with these keys: 
      dish_name (string), calories_kcal (number), protein_g (number), carbohydrates_g (number), fats_g (number), fiber_g (number), sugar_g (number), sodium_mg (number).
      Do not include markdown or explanations.
    `;

    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image.split(',')[1] || base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};
