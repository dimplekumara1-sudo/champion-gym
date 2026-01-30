import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.VITE_GEMINI_API_KEY_1;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is not set in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = "Say 'Gemini is working!' if you can hear me.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Response:", text);
    } catch (error) {
        console.error("Error testing Gemini:", error);
    }
}

run();
