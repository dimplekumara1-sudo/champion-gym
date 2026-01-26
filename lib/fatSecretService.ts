// FatSecret API Service
// Uses Supabase Edge Function as proxy to avoid CORS issues
// Requires FatSecret API credentials in Supabase environment variables:
// FATSECRET_CLIENT_ID
// FATSECRET_CLIENT_SECRET

import { supabase } from './supabase'

interface FoodSearchResult {
    food_id: string;
    food_name: string;
    brand_name?: string;
}

interface FoodNutrition {
    food_id: string;
    food_name: string;
    servings: {
        serving: Array<{
            serving_id: string;
            serving_description: string;
            serving_size: string;
            calories: string;
            carbohydrate: string;
            protein: string;
            fat: string;
        }>;
    };
}

interface AddedFood {
    food_id: string;
    food_name: string;
    amount: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export const searchFoods = async (query: string, maxResults: number = 10): Promise<FoodSearchResult[]> => {
    try {
        const { data, error } = await supabase.functions.invoke('fatsecret-proxy', {
            body: {
                action: 'search',
                query,
                maxResults,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // Handle different response formats
        if (data?.error) {
            throw new Error(data.error);
        }

        return data?.foods?.food || [];
    } catch (error) {
        console.error('Error searching foods:', error);
        throw error;
    }
};

export const getFoodNutrition = async (foodId: string): Promise<FoodNutrition> => {
    try {
        const { data, error } = await supabase.functions.invoke('fatsecret-proxy', {
            body: {
                action: 'getNutrition',
                foodId,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // Handle different response formats
        if (data?.error) {
            throw new Error(data.error);
        }

        return data?.food;
    } catch (error) {
        console.error('Error getting food nutrition:', error);
        throw error;
    }
};

export const calculateCalories = (
    caloriesPerServing: number,
    servingSize: number,
    userAmount: number
): number => {
    return Math.round((caloriesPerServing / servingSize) * userAmount);
};

export const parseNutritionValue = (value: string | number): number => {
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
};
