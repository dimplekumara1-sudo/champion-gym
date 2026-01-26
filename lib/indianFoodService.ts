import { supabase } from './supabase';

export interface IndianFood {
    id: number;
    dish_name: string;
    calories_kcal: number;
    carbohydrates_g: number;
    protein_g: number;
    fats_g: number;
    free_sugar_g: number | null;
    fibre_g: number | null;
    sodium_mg: number | null;
    calcium_mg: number | null;
    iron_mg: number | null;
    vitamin_c_mg: number | null;
    folate_mcg: number | null;
    created_at: string;
    updated_at: string;
}

export interface FoodSearchFilters {
    maxCalories?: number;
    minProtein?: number;
    maxFat?: number;
    searchTerm?: string;
}

/**
 * Search Indian foods by various criteria
 */
export async function searchIndianFoods(
    filters: FoodSearchFilters = {}
): Promise<IndianFood[]> {
    let query = supabase.from('indian_foods').select('*');

    if (filters.searchTerm) {
        query = query.ilike(
            'dish_name',
            `%${filters.searchTerm}%`
        );
    }

    if (filters.maxCalories) {
        query = query.lte('calories_kcal', filters.maxCalories);
    }

    if (filters.minProtein) {
        query = query.gte('protein_g', filters.minProtein);
    }

    if (filters.maxFat) {
        query = query.lte('fats_g', filters.maxFat);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error searching Indian foods:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get a specific food by ID
 */
export async function getIndianFoodById(id: number): Promise<IndianFood | null> {
    const { data, error } = await supabase
        .from('indian_foods')
        .select('*')
        .eq('id', id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching food:', error);
        throw error;
    }

    return data || null;
}

/**
 * Get foods by name (partial match)
 */
export async function searchFoodByName(name: string): Promise<IndianFood[]> {
    const { data, error } = await supabase
        .from('indian_foods')
        .select('*')
        .ilike('dish_name', `%${name}%`)
        .limit(20);

    if (error) {
        console.error('Error searching by name:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get high-protein foods
 */
export async function getHighProteinFoods(minProtein: number = 10): Promise<IndianFood[]> {
    const { data, error } = await supabase
        .from('indian_foods')
        .select('*')
        .gte('protein_g', minProtein)
        .order('protein_g', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching high-protein foods:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get low-calorie foods
 */
export async function getLowCalorieFoods(maxCalories: number = 200): Promise<IndianFood[]> {
    const { data, error } = await supabase
        .from('indian_foods')
        .select('*')
        .lte('calories_kcal', maxCalories)
        .order('calories_kcal', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error fetching low-calorie foods:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get foods by calorie range
 */
export async function getFoodsByCalorieRange(
    minCalories: number,
    maxCalories: number
): Promise<IndianFood[]> {
    const { data, error } = await supabase
        .from('indian_foods')
        .select('*')
        .gte('calories_kcal', minCalories)
        .lte('calories_kcal', maxCalories)
        .order('calories_kcal', { ascending: true });

    if (error) {
        console.error('Error fetching foods by calorie range:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get all Indian foods (paginated)
 */
export async function getAllIndianFoods(
    page: number = 1,
    pageSize: number = 20
): Promise<{ foods: IndianFood[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from('indian_foods')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('dish_name', { ascending: true });

    if (error) {
        console.error('Error fetching all foods:', error);
        throw error;
    }

    return {
        foods: data || [],
        total: count || 0,
    };
}

/**
 * Get nutrition summary for a specific food
 */
export function getNutritionSummary(food: IndianFood): {
    label: string;
    value: string;
}[] {
    return [
        { label: 'Calories', value: `${food.calories_kcal.toFixed(1)} kcal` },
        { label: 'Protein', value: `${food.protein_g.toFixed(1)}g` },
        { label: 'Carbs', value: `${food.carbohydrates_g.toFixed(1)}g` },
        { label: 'Fat', value: `${food.fats_g.toFixed(1)}g` },
        ...(food.fibre_g ? [{ label: 'Fibre', value: `${food.fibre_g.toFixed(1)}g` }] : []),
        ...(food.sodium_mg ? [{ label: 'Sodium', value: `${food.sodium_mg.toFixed(0)}mg` }] : []),
    ];
}
