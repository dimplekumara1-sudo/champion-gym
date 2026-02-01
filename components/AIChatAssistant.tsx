import React, { useState, useRef, useEffect } from 'react';
import { generateAIChatResponse } from '../lib/gemini';
import { Profile } from '../types';

interface DailyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  dailyNutrition: DailyNutrition;
  nutritionGoals: any;
  waterIntake: number;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
  isOpen,
  onClose,
  profile,
  dailyNutrition,
  nutritionGoals,
  waterIntake
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${profile?.full_name || 'there'}! I'm your AI Fitness & Nutrition Coach. How can I help you reach your goals today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const systemPrompt = `
        You are an expert Fitness and Nutrition Coach for the Challenge Gym Elite Fitness app.
        
        User Profile:
        - Name: ${profile?.full_name}
        - Goal: ${profile?.goal}
        - Gender: ${profile?.gender}
        - Current Weight: ${profile?.weight}kg
        - Target Weight: ${profile?.target_weight}kg
        - Height: ${profile?.height}cm
        
        Today's Progress:
        - Calories: ${dailyNutrition.totalCalories}/${nutritionGoals.daily_calories_target} kcal
        - Protein: ${dailyNutrition.totalProtein}/${nutritionGoals.daily_protein_target}g
        - Water: ${waterIntake}ml
        
        Instructions:
        1. Provide professional, encouraging, and science-based advice.
        2. Help with workout plan suggestions and nutrition insights.
        3. Keep responses concise but helpful.
        4. If the user asks for a workout plan, suggest specific exercises based on their goal.
        5. If they ask about nutrition, refer to their current intake vs targets.
      `;

      const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const fullPrompt = `${systemPrompt}\n\nChat History:\n${chatHistory}\n\nUser: ${userMessage}\nAssistant:`;

      const assistantResponse = await generateAIChatResponse(fullPrompt);

      setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
    } catch (error) {
      console.error('Chat AI Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] w-full max-w-lg h-[90vh] sm:h-[600px] flex flex-col rounded-t-[2rem] sm:rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-rounded text-primary text-xl">smart_toy</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-100">AI Coach</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-rounded text-slate-400">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-3xl text-sm ${m.role === 'user'
                  ? 'bg-primary text-slate-950 font-bold rounded-tr-none'
                  : 'bg-slate-800/50 text-slate-200 rounded-tl-none border border-slate-700/50'
                }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 p-4 rounded-3xl rounded-tl-none border border-slate-700/50">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 bg-slate-900/50 border-t border-slate-800">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your fitness..."
              className="flex-1 bg-slate-800 border-none rounded-2xl py-4 px-5 pr-14 text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-500 text-white"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 w-10 h-10 rounded-xl bg-primary text-slate-950 flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
            >
              <span className="material-symbols-rounded font-black">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatAssistant;