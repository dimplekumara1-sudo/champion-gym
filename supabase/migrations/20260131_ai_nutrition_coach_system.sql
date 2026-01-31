-- AI Recommendations Table for storing all nutrition coach recommendations
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_text TEXT NOT NULL,
  context JSONB NOT NULL, -- User data at time of recommendation (nutrition, goals, etc.)
  recommendation_type VARCHAR(50) NOT NULL DEFAULT 'meal_suggestion', -- meal_suggestion, hydration, goal_adjustment, etc.
  confidence_score DECIMAL(3,2) DEFAULT 0.80, -- AI confidence in recommendation (0.00-1.00)
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5), -- User feedback 1-5 stars
  user_feedback TEXT, -- Optional user feedback text
  was_followed BOOLEAN DEFAULT FALSE, -- Did user follow the recommendation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Nutrition Behavior Tracking
CREATE TABLE user_nutrition_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein DECIMAL(8,2) NOT NULL DEFAULT 0,
  total_carbs DECIMAL(8,2) NOT NULL DEFAULT 0,
  total_fat DECIMAL(8,2) NOT NULL DEFAULT 0,
  water_intake_ml INTEGER NOT NULL DEFAULT 0,
  meals_logged INTEGER NOT NULL DEFAULT 0,
  goal_adherence_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00-1.00 based on meeting daily targets
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- AI Learning Patterns - Stores learned insights about user preferences
CREATE TABLE ai_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL, -- 'meal_timing', 'food_preferences', 'goal_trends', etc.
  pattern_data JSONB NOT NULL, -- The actual pattern insights
  confidence_level DECIMAL(3,2) DEFAULT 0.50, -- How confident AI is about this pattern
  last_applied TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation Interactions - Track how users interact with recommendations
CREATE TABLE recommendation_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'viewed', 'followed', 'ignored', 'feedback_given'
  interaction_data JSONB, -- Additional data about the interaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX idx_ai_recommendations_created_at ON ai_recommendations(created_at DESC);
CREATE INDEX idx_ai_recommendations_effectiveness ON ai_recommendations(effectiveness_rating) WHERE effectiveness_rating IS NOT NULL;

CREATE INDEX idx_user_nutrition_behavior_user_id ON user_nutrition_behavior(user_id);
CREATE INDEX idx_user_nutrition_behavior_date ON user_nutrition_behavior(date DESC);
CREATE INDEX idx_user_nutrition_behavior_user_date ON user_nutrition_behavior(user_id, date DESC);

CREATE INDEX idx_ai_learning_patterns_user_id ON ai_learning_patterns(user_id);
CREATE INDEX idx_ai_learning_patterns_type ON ai_learning_patterns(pattern_type);

CREATE INDEX idx_recommendation_interactions_recommendation_id ON recommendation_interactions(recommendation_id);

-- RLS Policies
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_nutrition_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view their own AI recommendations" ON ai_recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI recommendations" ON ai_recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI recommendations" ON ai_recommendations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own nutrition behavior" ON user_nutrition_behavior
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition behavior" ON user_nutrition_behavior
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition behavior" ON user_nutrition_behavior
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own learning patterns" ON ai_learning_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning patterns" ON ai_learning_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning patterns" ON ai_learning_patterns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own recommendation interactions" ON recommendation_interactions
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM ai_recommendations WHERE id = recommendation_id)
  );

CREATE POLICY "Users can insert their own recommendation interactions" ON recommendation_interactions
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM ai_recommendations WHERE id = recommendation_id)
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_recommendations_updated_at BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_nutrition_behavior_updated_at BEFORE UPDATE ON user_nutrition_behavior
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_learning_patterns_updated_at BEFORE UPDATE ON ai_learning_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();