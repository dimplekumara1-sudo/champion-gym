import { supabase } from './supabase';
import { generateAIChatResponse } from './gemini';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

export interface AIRecommendation {
  id: string;
  user_id: string;
  recommendation_text: string;
  context: NutritionContext;
  recommendation_type: 'meal_suggestion' | 'hydration' | 'goal_adjustment' | 'behavior_insight';
  confidence_score: number;
  effectiveness_rating?: number;
  user_feedback?: string;
  was_followed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionContext {
  current_nutrition: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  nutrition_goals: {
    daily_calories_target: number;
    daily_protein_target: number;
    daily_carbs_target: number;
    daily_fat_target: number;
  };
  user_profile: {
    weight?: number;
    target_weight?: number;
    height?: number;
    goal?: string;
    bmi?: number;
  };
  water_intake: number;
  date: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  meals_logged_today: number;
  recent_behavior?: UserBehaviorPattern[];
}

export interface UserBehaviorPattern {
  pattern_type: 'meal_timing' | 'food_preferences' | 'goal_trends' | 'hydration_patterns';
  pattern_data: any;
  confidence_level: number;
  last_applied: string;
}

export interface UserBehaviorData {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  water_intake_ml: number;
  meals_logged: number;
  goal_adherence_score: number;
  date: string;
}

class AgenticNutritionCoach {
  private userId: string | null = null;
  private learningEnabled = true;

  constructor() {
    // This will be initialized when user logs in
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Get personalized recommendation using agentic approach
   * Analyzes past recommendations, user behavior, and current context
   */
  async getAgenticRecommendation(context: NutritionContext): Promise<AIRecommendation | null> {
    if (!this.userId) {
      console.error('No user ID set for agentic coach');
      return null;
    }

    try {
      console.log('=== Starting Agentic AI Recommendation Process ===');

      // Step 1: Get user's past recommendations and behavior patterns
      const [pastRecommendations, behaviorPatterns, recentBehavior] = await Promise.all([
        this.getPastRecommendations(10), // Last 10 recommendations
        this.getLearningPatterns(),
        this.getRecentBehavior(7) // Last 7 days
      ]);

      // Step 2: Analyze user behavior and patterns
      const behaviorAnalysis = this.analyzeUserBehavior(recentBehavior, context);
      
      // Step 3: Generate contextual recommendation
      const recommendation = await this.generateContextualRecommendation(
        context,
        pastRecommendations,
        behaviorPatterns,
        behaviorAnalysis
      );

      // Step 4: Store the recommendation
      if (recommendation) {
        const storedRecommendation = await this.storeRecommendation(recommendation);
        
        // Step 5: Update learning patterns if confidence is high
        if (recommendation.confidence_score >= 0.8) {
          await this.updateLearningPatterns(recommendation, behaviorAnalysis);
        }

        console.log('✅ Agentic recommendation generated:', storedRecommendation);
        return storedRecommendation;
      }

      return null;
    } catch (error) {
      console.error('Error in agentic recommendation process:', error);
      return null;
    }
  }

  /**
   * Get past recommendations for learning
   */
  private async getPastRecommendations(limit: number = 10): Promise<AIRecommendation[]> {
    if (!this.userId) return [];

    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching past recommendations:', error);
      return [];
    }
  }

  /**
   * Get learned patterns about user behavior
   */
  private async getLearningPatterns(): Promise<UserBehaviorPattern[]> {
    if (!this.userId) return [];

    try {
      const { data, error } = await supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('user_id', this.userId)
        .eq('confidence_level', 0.5) // Only get patterns with reasonable confidence
        .order('confidence_level', { ascending: false });

      if (error) throw error;
      return data?.map(p => ({
        pattern_type: p.pattern_type as any,
        pattern_data: p.pattern_data,
        confidence_level: p.confidence_level,
        last_applied: p.last_applied
      })) || [];
    } catch (error) {
      console.error('Error fetching learning patterns:', error);
      return [];
    }
  }

  /**
   * Get recent user behavior data
   */
  private async getRecentBehavior(days: number = 7): Promise<UserBehaviorData[]> {
    if (!this.userId) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_nutrition_behavior')
        .select('*')
        .eq('user_id', this.userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent behavior:', error);
      return [];
    }
  }

  /**
   * Analyze user behavior patterns
   */
  private analyzeUserBehavior(behaviorData: UserBehaviorData[], context: NutritionContext): any {
    if (behaviorData.length === 0) {
      return { insights: [], confidence: 0.1 };
    }

    const insights = [];

    // Analyze meal timing patterns
    const avgMealsPerDay = behaviorData.reduce((sum, day) => sum + day.meals_logged, 0) / behaviorData.length;
    insights.push({
      type: 'meal_frequency',
      value: avgMealsPerDay,
      pattern: avgMealsPerDay >= 3 ? 'consistent' : 'irregular',
      confidence: 0.7
    });

    // Analyze protein intake consistency
    const avgProtein = behaviorData.reduce((sum, day) => sum + day.total_protein, 0) / behaviorData.length;
    const proteinVariance = this.calculateVariance(behaviorData.map(d => d.total_protein), avgProtein);
    insights.push({
      type: 'protein_consistency',
      value: avgProtein,
      variance: proteinVariance,
      pattern: proteinVariance < 20 ? 'consistent' : 'variable',
      confidence: 0.6
    });

    // Analyze hydration patterns
    const avgWater = behaviorData.reduce((sum, day) => sum + day.water_intake_ml, 0) / behaviorData.length;
    insights.push({
      type: 'hydration',
      value: avgWater,
      pattern: avgWater >= 2000 ? 'adequate' : 'insufficient',
      confidence: 0.8
    });

    // Analyze goal adherence
    const avgAdherence = behaviorData.reduce((sum, day) => sum + day.goal_adherence_score, 0) / behaviorData.length;
    insights.push({
      type: 'goal_adherence',
      value: avgAdherence,
      pattern: avgAdherence >= 0.8 ? 'excellent' : avgAdherence >= 0.6 ? 'good' : 'needs_improvement',
      confidence: 0.7
    });

    return {
      insights,
      overall_confidence: insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
    };
  }

  /**
   * Calculate variance for consistency analysis
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length);
  }

  /**
   * Generate contextual recommendation using AI with behavioral insights
   */
  private async generateContextualRecommendation(
    context: NutritionContext,
    pastRecommendations: AIRecommendation[],
    learningPatterns: UserBehaviorPattern[],
    behaviorAnalysis: any
  ): Promise<Partial<AIRecommendation> | null> {
    
    // Build comprehensive prompt with all context
    const prompt = this.buildAdvancedPrompt(context, pastRecommendations, learningPatterns, behaviorAnalysis);

    try {
      const response = await generateAIChatResponse(prompt);
      
      // Parse AI response to extract recommendation and confidence
      const parsedResponse = this.parseAIResponse(response);

      return {
        recommendation_text: parsedResponse.text,
        recommendation_type: parsedResponse.type || 'meal_suggestion',
        confidence_score: parsedResponse.confidence || 0.7,
        context: context
      };
    } catch (error) {
      console.error('Error generating contextual recommendation:', error);
      return null;
    }
  }

  /**
   * Build advanced prompt with all available context
   */
  private buildAdvancedPrompt(
    context: NutritionContext,
    pastRecommendations: AIRecommendation[],
    learningPatterns: UserBehaviorPattern[],
    behaviorAnalysis: any
  ): string {
    const timeOfDay = this.getTimeOfDay();
    
    return `
You are an advanced agentic AI nutrition coach with deep learning capabilities. Analyze the following comprehensive user data to provide highly personalized recommendations.

CURRENT CONTEXT:
- Time: ${timeOfDay}, Date: ${context.date}
- Current Nutrition: ${context.current_nutrition.totalCalories}kcal, ${context.current_nutrition.totalProtein}g Protein, ${context.current_nutrition.totalCarbs}g Carbs, ${context.current_nutrition.totalFat}g Fat
- Daily Goals: ${context.nutrition_goals.daily_calories_target}kcal, ${context.nutrition_goals.daily_protein_target}g Protein
- User Profile: ${context.user_profile.goal} goal, ${context.user_profile.weight}kg current, ${context.user_profile.target_weight}kg target, BMI: ${context.user_profile.bmi}
- Water Intake: ${context.water_intake}ml
- Meals Logged Today: ${context.meals_logged_today}

BEHAVIORAL INSIGHTS:
${behaviorAnalysis.insights.map(insight => 
  `- ${insight.type}: ${insight.pattern} (confidence: ${insight.confidence})`
).join('\n')}

LEARNING PATTERNS:
${learningPatterns.map(pattern => 
  `- ${pattern.pattern_type}: confidence ${pattern.confidence_level}`
).join('\n')}

PAST RECOMMENDATIONS (Last 3):
${pastRecommendations.slice(0, 3).map(rec => 
  `- "${rec.recommendation_text}" (Effectiveness: ${rec.effectiveness_rating || 'not rated'})`
).join('\n')}

TASK:
Provide a 30-word max recommendation for the user's next action. Consider:
1. Time of day and what meal they should have next
2. Their behavioral patterns and consistency
3. Their progress toward daily goals
4. Past recommendation effectiveness
5. Learning patterns about their preferences

Format your response as:
RECOMMENDATION: [Your 30-word max advice]
TYPE: [meal_suggestion/hydration/goal_adjustment/behavior_insight]
CONFIDENCE: [0.1-1.0]

Be highly specific and actionable based on their patterns.
`;
  }

  /**
   * Parse AI response to extract structured data
   */
  private parseAIResponse(response: string): { text: string; type: 'meal_suggestion' | 'hydration' | 'goal_adjustment' | 'behavior_insight'; confidence: number } {
    try {
      // Extract recommendation
      const recMatch = response.match(/RECOMMENDATION:\s*(.+?)(?=\nTYPE:|$)/s);
      const text = recMatch?.[1]?.trim() || response.substring(0, 100);

      // Extract type
      const typeMatch = response.match(/TYPE:\s*(.+?)(?=\nCONFIDENCE:|$)/s);
      const typeText = typeMatch?.[1]?.trim() || 'meal_suggestion';
      
      // Validate type is one of the allowed types
      const validTypes: Array<'meal_suggestion' | 'hydration' | 'goal_adjustment' | 'behavior_insight'> = ['meal_suggestion', 'hydration', 'goal_adjustment', 'behavior_insight'];
      let type: 'meal_suggestion' | 'hydration' | 'goal_adjustment' | 'behavior_insight' = 'meal_suggestion';
      
      if (validTypes.includes(typeText as any)) {
        type = typeText as 'meal_suggestion' | 'hydration' | 'goal_adjustment' | 'behavior_insight';
      }

      // Extract confidence
      const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9.]+)/);
      const confidence = confidenceMatch?.[1] ? parseFloat(confidenceMatch[1]) : 0.7;

      return { 
        text, 
        type, 
        confidence: Math.min(1.0, Math.max(0.1, confidence)) 
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return { text: response.substring(0, 100), type: 'meal_suggestion', confidence: 0.5 };
    }
  }

  /**
   * Store recommendation in database
   */
  private async storeRecommendation(recommendation: Partial<AIRecommendation>): Promise<AIRecommendation | null> {
    if (!this.userId) return null;

    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .insert([{
          user_id: this.userId,
          recommendation_text: recommendation.recommendation_text,
          context: recommendation.context,
          recommendation_type: recommendation.recommendation_type,
          confidence_score: recommendation.confidence_score,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error storing recommendation:', error);
      return null;
    }
  }

  /**
   * Update learning patterns based on successful recommendations
   */
  private async updateLearningPatterns(recommendation: Partial<AIRecommendation>, behaviorAnalysis: any): Promise<void> {
    if (!this.userId || !this.learningEnabled) return;

    try {
      // Example: Update meal timing patterns
      if (recommendation.recommendation_type === 'meal_suggestion') {
        const existingPattern = await this.getPattern('meal_timing');
        
        const patternData = {
          preferred_times: behaviorAnalysis.insights.find((i: any) => i.type === 'meal_frequency')?.value || 3,
          confidence: Math.max(existingPattern?.confidence_level || 0.5, behaviorAnalysis.overall_confidence * 0.8)
        };

        await supabase
          .from('ai_learning_patterns')
          .upsert({
            user_id: this.userId,
            pattern_type: 'meal_timing',
            pattern_data: patternData,
            confidence_level: patternData.confidence,
            last_applied: new Date().toISOString(),
          }, {
            onConflict: 'user_id,pattern_type'
          });
      }
    } catch (error) {
      console.error('Error updating learning patterns:', error);
    }
  }

  /**
   * Get specific pattern type
   */
  private async getPattern(patternType: string): Promise<any> {
    if (!this.userId) return null;

    try {
      const { data } = await supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('user_id', this.userId)
        .eq('pattern_type', patternType)
        .single();

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current time of day
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Track user behavior daily
   */
  async trackDailyBehavior(
    nutrition: any,
    waterIntake: number,
    goals: any,
    mealsLogged: number
  ): Promise<void> {
    if (!this.userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate goal adherence score
      const calorieAdherence = Math.min(1.0, nutrition.totalCalories / goals.daily_calories_target);
      const proteinAdherence = Math.min(1.0, nutrition.totalProtein / goals.daily_protein_target);
      const carbsAdherence = Math.min(1.0, nutrition.totalCarbs / goals.daily_carbs_target);
      const fatAdherence = Math.min(1.0, nutrition.totalFat / goals.daily_fat_target);
      const goalAdherenceScore = (calorieAdherence + proteinAdherence + carbsAdherence + fatAdherence) / 4;

      await supabase
        .from('user_nutrition_behavior')
        .upsert({
          user_id: this.userId,
          date: today,
          total_calories: Math.round(nutrition.totalCalories),
          total_protein: nutrition.totalProtein,
          total_carbs: nutrition.totalCarbs,
          total_fat: nutrition.totalFat,
          water_intake_ml: waterIntake,
          meals_logged: mealsLogged,
          goal_adherence_score: goalAdherenceScore,
        }, {
          onConflict: 'user_id,date'
        });

      console.log('✅ Daily behavior tracked successfully');
    } catch (error) {
      console.error('Error tracking daily behavior:', error);
    }
  }

  /**
   * Record user feedback on recommendation
   */
  async recordRecommendationFeedback(
    recommendationId: string,
    rating: number,
    feedback?: string,
    wasFollowed: boolean = false
  ): Promise<boolean> {
    if (!this.userId) return false;

    try {
      // Update recommendation with feedback
      const { error: updateError } = await supabase
        .from('ai_recommendations')
        .update({
          effectiveness_rating: rating,
          user_feedback: feedback,
          was_followed: wasFollowed,
        })
        .eq('id', recommendationId)
        .eq('user_id', this.userId);

      if (updateError) throw updateError;

      // Record interaction
      await supabase
        .from('recommendation_interactions')
        .insert([{
          recommendation_id: recommendationId,
          interaction_type: 'feedback_given',
          interaction_data: {
            rating,
            feedback,
            was_followed: wasFollowed,
            timestamp: new Date().toISOString()
          }
        }]);

      console.log('✅ Recommendation feedback recorded');
      return true;
    } catch (error) {
      console.error('Error recording feedback:', error);
      return false;
    }
  }

  /**
   * Get today's recommendation (cached for performance)
   */
  async getTodaysRecommendation(): Promise<AIRecommendation | null> {
    if (!this.userId) return null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `${CACHE_KEYS.AI_ADVICE}_${this.userId}_${today}`;

      // Check cache first
      const cached = cache.get<AIRecommendation>(cacheKey);
      if (cached) {
        console.log('Returning cached recommendation');
        return cached;
      }

      // Get latest recommendation from today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      // Cache for 1 hour
      cache.set(cacheKey, data, CACHE_TTL.SHORT);
      return data;
    } catch (error) {
      console.error('Error getting today\'s recommendation:', error);
      return null;
    }
  }

  /**
   * Enable/disable learning mode
   */
  setLearningEnabled(enabled: boolean) {
    this.learningEnabled = enabled;
  }
}

// Singleton instance
export const agenticNutritionCoach = new AgenticNutritionCoach();