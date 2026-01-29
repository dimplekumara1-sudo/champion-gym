
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import { AppScreen } from '../types';
import { supabase } from '../lib/supabase';
import { analyzeFoodImage } from '../lib/gemini';

interface IndianFood {
  id: number;
  dish_name: string;
  calories_kcal: number;
  carbohydrates_g: number;
  protein_g: number;
  fats_g: number;
  free_sugar_g?: number;
  fibre_g?: number;
  sodium_mg?: number;
}

interface AddedFood {
  id: string;
  food_id: number;
  food_name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface MealSummary {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  label: string;
  icon: string;
  items: AddedFood[];
  totalCalories: number;
}

interface NutritionGoal {
  id: number;
  user_id: string;
  daily_calories_target: number;
  daily_protein_target: number;
  daily_carbs_target: number;
  daily_fat_target: number;
}

const DailyTracker: React.FC<{ onNavigate: (s: AppScreen) => void }> = ({ onNavigate }) => {
  const [meals, setMeals] = useState<AddedFood[]>([]);
  const [allFoods, setAllFoods] = useState<IndianFood[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<IndianFood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<IndianFood | null>(null);
  const [selectedAmount, setSelectedAmount] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [selectedFoodDetails, setSelectedFoodDetails] = useState<IndianFood | null>(null);
  const [showNutritionDetail, setShowNutritionDetail] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSubmitFood, setShowSubmitFood] = useState(false);
  const [submitFoodData, setSubmitFoodData] = useState({
    dish_name: '',
    calories_kcal: 0,
    protein_g: 0,
    carbohydrates_g: 0,
    fats_g: 0,
    free_sugar_g: 0,
    fibre_g: 0,
    sodium_mg: 0,
    calcium_mg: 0,
    iron_mg: 0,
    vitamin_c_mg: 0,
    folate_mcg: 0,
    submission_notes: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showMacrosAsKcal, setShowMacrosAsKcal] = useState(true);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal | null>(null);
  const [showPieChart, setShowPieChart] = useState(false);
  const [showLineChart, setShowLineChart] = useState(false);
  const [pieChartUnit, setPieChartUnit] = useState<'grams' | 'calories'>('grams');
  const [lineChartUnit, setLineChartUnit] = useState<'grams' | 'calories'>('grams');

  const [activeTab, setActiveTab] = useState<'daily' | 'report'>('daily');
  const [reportRange, setReportRange] = useState<'weekly' | 'monthly'>('weekly');
  const [historyMeals, setHistoryMeals] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal] = useState(2000); // 2L default goal

  const mealTypes = [
    { type: 'breakfast' as const, label: 'Breakfast', icon: 'light_mode' },
    { type: 'lunch' as const, label: 'Lunch', icon: 'lunch_dining' },
    { type: 'dinner' as const, label: 'Dinner', icon: 'dinner_dining' },
    { type: 'snack' as const, label: 'Snack', icon: 'bakery_dining' },
  ];

  // Fetch user and foods on mount
  useEffect(() => {
    fetchUserAndFoods();
  }, []);

  // Fetch all foods for preloading
  const fetchUserAndFoods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchAllFoods();
        await fetchTodaysMeals(user.id);
        await fetchNutritionGoals(user.id);
        await fetchWaterIntake(user.id, selectedDate);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchAllFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('indian_foods')
        .select('*')
        .order('dish_name', { ascending: true });

      if (error) throw error;
      setAllFoods(data || []);
      setFilteredFoods(data || []);
    } catch (error) {
      console.error('Error fetching foods:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      if (activeTab === 'daily') {
        fetchTodaysMeals(userId);
        fetchWaterIntake(userId, selectedDate);
      } else {
        fetchHistoryData(userId);
      }
    }
  }, [activeTab, reportRange, selectedDate, userId]);

  const fetchHistoryData = async (uid: string) => {
    try {
      setLoadingHistory(true);
      let startDate = new Date();
      if (reportRange === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data, error } = await supabase
        .from('user_daily_diet_tracking')
        .select('*')
        .eq('user_id', uid)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setHistoryMeals(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchTodaysMeals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_daily_diet_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('date', selectedDate);

      if (error) throw error;

      const formattedMeals = data?.map(item => ({
        id: `${item.id}`,
        food_id: item.food_id,
        food_name: item.food_name || '',
        amount: item.amount,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fats,
        meal_type: item.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      })) || [];

      setMeals(formattedMeals);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const fetchNutritionGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setNutritionGoals(data);
      } else {
        // Set default goals if none exist
        setNutritionGoals({
          id: 0,
          user_id: userId,
          daily_calories_target: 2000,
          daily_protein_target: 150,
          daily_carbs_target: 200,
          daily_fat_target: 65,
        });
      }
    } catch (error) {
      console.error('Error fetching nutrition goals:', error);
    }
  };

  const fetchWaterIntake = async (uid: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('water_intake')
        .select('amount_ml')
        .eq('user_id', uid)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setWaterIntake(data?.amount_ml || 0);
    } catch (error) {
      console.error('Error fetching water intake:', error);
    }
  };

  const handleUpdateWater = async (amount: number) => {
    if (!userId) return;
    
    const newAmount = Math.max(0, waterIntake + amount);
    try {
      const { error } = await supabase
        .from('water_intake')
        .upsert({
          user_id: userId,
          date: selectedDate,
          amount_ml: newAmount,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setWaterIntake(newAmount);
    } catch (error) {
      console.error('Error updating water intake:', error);
      alert('Failed to update water intake. Please try again.');
    }
  };

  const aggregateHistoryData = (data: any[]) => {
    const grouped = data.reduce((acc: any, item: any) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      acc[date].calories += item.calories;
      acc[date].protein += item.protein;
      acc[date].carbs += item.carbs;
      acc[date].fat += item.fats;
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) => b.date.localeCompare(a.date));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = allFoods.filter(food =>
        food.dish_name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredFoods(results);
    } else {
      setFilteredFoods(allFoods);
    }
  };

  const handleSelectFood = (food: IndianFood) => {
    setSelectedFood(food);
  };

  // Helper function to convert units to grams
  const convertToGrams = (amount: number, unit: string): number => {
    switch (unit) {
      case 'g':
        return amount;
      case 'oz':
        return amount * 28.35; // 1 oz = 28.35g
      case 'ml':
        return amount; // Assuming 1ml ≈ 1g for most foods (can vary)
      case 'cup':
        return amount * 240; // 1 cup ≈ 240g (varies by food)
      case 'piece':
        return amount * 100; // 1 piece ≈ 100g (varies by food, but reasonable estimate)
      default:
        return amount;
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !selectedAmount || !userId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const userAmount = parseFloat(selectedAmount);

      // Convert user amount to grams
      const amountInGrams = convertToGrams(userAmount, selectedUnit);
      const servingSize = 100; // Database values are per 100g

      // Calculate nutritional values based on amount in grams
      const multiplier = amountInGrams / servingSize;
      const calories = selectedFood.calories_kcal * multiplier;
      const protein = selectedFood.protein_g * multiplier;
      const carbs = selectedFood.carbohydrates_g * multiplier;
      const fat = selectedFood.fats_g * multiplier;

      const today = new Date().toISOString().split('T')[0];

      // Save to database
      const { data, error } = await supabase
        .from('user_daily_diet_tracking')
        .insert([{
          user_id: userId,
          date: today,
          meal_type: selectedMealType,
          food_id: selectedFood.id,
          food_name: selectedFood.dish_name,
          amount: userAmount,
          unit: selectedUnit,
          calories,
          protein,
          carbs,
          fats: fat,
        }])
        .select();

      if (error) throw error;

      const newFood: AddedFood = {
        id: `${data?.[0]?.id || Date.now()}`,
        food_id: selectedFood.id,
        food_name: selectedFood.dish_name,
        amount: userAmount,
        unit: selectedUnit,
        calories,
        protein,
        carbs,
        fat,
        meal_type: selectedMealType,
      };

      setMeals([...meals, newFood]);
      setSelectedFood(null);
      setSelectedAmount('100');
      setSearchQuery('');
      setShowSearchModal(false);
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Failed to add food');
    }
  };

  const handleAIScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setSubmitMessage('');
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await analyzeFoodImage(base64);
        
        if (result) {
          setSubmitFoodData({
            dish_name: result.dish_name,
            calories_kcal: result.calories_kcal,
            protein_g: result.protein_g,
            carbohydrates_g: result.carbohydrates_g,
            fats_g: result.fats_g,
            fibre_g: result.fiber_g || 0,
            free_sugar_g: result.sugar_g || 0,
            sodium_mg: result.sodium_mg || 0,
            calcium_mg: 0,
            iron_mg: 0,
            vitamin_c_mg: 0,
            folate_mcg: 0,
            submission_notes: 'Generated via AI Scan',
          });
          setSubmitMessage('success:✓ AI Scan successful! Review values below.');
        } else {
          setSubmitMessage('error:AI could not analyze image. Try again or enter manually.');
        }
        setIsScanning(false);
      };
    } catch (err) {
      setSubmitMessage('error:Error scanning image');
      setIsScanning(false);
    }
  };

  const handleSubmitFood = async () => {
    if (!submitFoodData.dish_name.trim()) {
      setSubmitMessage('error:Please enter a dish name');
      return;
    }

    if (submitFoodData.calories_kcal <= 0) {
      setSubmitMessage('error:Calories must be greater than 0');
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitMessage('');

      const { error } = await supabase
        .from('pending_food_submissions')
        .insert([{
          user_id: userId,
          dish_name: submitFoodData.dish_name.trim(),
          calories_kcal: submitFoodData.calories_kcal,
          carbohydrates_g: submitFoodData.carbohydrates_g,
          protein_g: submitFoodData.protein_g,
          fats_g: submitFoodData.fats_g,
          free_sugar_g: submitFoodData.free_sugar_g || null,
          fibre_g: submitFoodData.fibre_g || null,
          sodium_mg: submitFoodData.sodium_mg || null,
          calcium_mg: submitFoodData.calcium_mg || null,
          iron_mg: submitFoodData.iron_mg || null,
          vitamin_c_mg: submitFoodData.vitamin_c_mg || null,
          folate_mcg: submitFoodData.folate_mcg || null,
          submission_notes: submitFoodData.submission_notes || null,
        }]);

      if (error) throw error;

      setSubmitMessage('success:✓ Food submitted! Admin will review soon');
      setSubmitFoodData({
        dish_name: '',
        calories_kcal: 0,
        protein_g: 0,
        carbohydrates_g: 0,
        fats_g: 0,
        free_sugar_g: 0,
        fibre_g: 0,
        sodium_mg: 0,
        calcium_mg: 0,
        iron_mg: 0,
        vitamin_c_mg: 0,
        folate_mcg: 0,
        submission_notes: '',
      });
      setTimeout(() => {
        setShowSubmitFood(false);
        setSubmitMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error submitting food:', error);
      setSubmitMessage(`error:${error instanceof Error ? error.message : 'Failed to submit'}`);
    } finally {
      setSubmitLoading(false);
    }
  };
  const removeFood = async (id: string) => {
    try {
      const dbId = parseInt(id);
      if (!isNaN(dbId)) {
        const { error } = await supabase
          .from('user_daily_diet_tracking')
          .delete()
          .eq('id', dbId);

        if (error) throw error;
      }
      setMeals(meals.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error removing food:', error);
    }
  };

  // Calculate totals
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);
  const dailyGoal = nutritionGoals?.daily_calories_target || 2000;
  const remainingCalories = Math.max(0, dailyGoal - totalCalories);

  // Prepare pie chart data
  const pieData = [
    { name: 'Protein', value: totalProtein * 4, color: '#EF4444' },
    { name: 'Carbs', value: totalCarbs * 4, color: '#3B82F6' },
    { name: 'Fat', value: totalFat * 9, color: '#F59E0B' },
  ].filter(item => item.value > 0);

  // Group meals by type
  const mealSummaries: MealSummary[] = mealTypes.map(mealType => ({
    type: mealType.type,
    label: mealType.label,
    icon: mealType.icon,
    items: meals.filter(m => m.meal_type === mealType.type),
    totalCalories: meals
      .filter(m => m.meal_type === mealType.type)
      .reduce((sum, m) => sum + m.calories, 0),
  }));
  return (
    <div className="pb-32 bg-[#090E1A] min-h-screen">
      <StatusBar />
      <main className="pt-4 px-5">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => onNavigate('DASHBOARD')} className="p-2 -ml-2 rounded-full hover:bg-slate-800">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-extrabold tracking-tight">Daily Nutrition</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800/50 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700/50 outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => setShowSubmitFood(true)}
            className="p-2 rounded-full hover:bg-slate-800 text-primary transition-colors"
          >
            <span className="material-symbols-rounded text-2xl font-bold">add_circle</span>
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex bg-[#151C2C] p-1 rounded-2xl mb-6 border border-[#1E293B]">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'daily' ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Daily Log
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'report' ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            History & Reports
          </button>
        </div>

        {activeTab === 'daily' ? (
          <>
            {/* Daily Summary Card */}
        <div className="bg-[#151C2C] rounded-3xl p-5 mb-6 border border-[#1E293B]">
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center border border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Consumed</span>
              <span className="text-lg font-extrabold text-white">{Math.round(totalCalories)}</span>
              <span className="text-[9px] text-slate-500">kcal</span>
            </div>
            <div className="bg-primary p-4 rounded-2xl flex flex-col items-center shadow-lg shadow-primary/20">
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Remaining</span>
              <span className="text-lg font-extrabold text-white">{Math.round(remainingCalories)}</span>
              <span className="text-[9px] text-white/70">kcal</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center border border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Goal</span>
              <span className="text-lg font-extrabold text-white">{dailyGoal}</span>
              <span className="text-[9px] text-slate-500">kcal</span>
            </div>
          </div>

          {/* Nutrition Goals Summary */}
          {nutritionGoals && (
            <div className="bg-slate-800/20 p-4 rounded-2xl border border-slate-700/30 mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daily Nutrition Targets</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Protein Goal</p>
                  <p className="text-sm font-bold text-red-400">
                    {nutritionGoals.daily_protein_target}g
                  </p>
                  <p className="text-[9px] text-slate-600">{((totalProtein / nutritionGoals.daily_protein_target) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Carbs Goal</p>
                  <p className="text-sm font-bold text-blue-400">
                    {nutritionGoals.daily_carbs_target}g
                  </p>
                  <p className="text-[9px] text-slate-600">{((totalCarbs / nutritionGoals.daily_carbs_target) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Fat Goal</p>
                  <p className="text-sm font-bold text-amber-400">
                    {nutritionGoals.daily_fat_target}g
                  </p>
                  <p className="text-[9px] text-slate-600">{((totalFat / nutritionGoals.daily_fat_target) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Water Tracker Section */}
          <div className="bg-slate-800/20 p-5 rounded-2xl border border-slate-700/30 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="material-symbols-rounded text-blue-400">water_drop</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Water Intake</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Stay Hydrated</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-white">{waterIntake}</span>
                <span className="text-[10px] font-bold text-slate-500 ml-1">/ {waterGoal} ml</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-800 rounded-full mb-6 overflow-hidden border border-slate-700/30">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${Math.min(100, (waterIntake / waterGoal) * 100)}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {[100, 250, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleUpdateWater(amount)}
                  className="flex-1 bg-slate-800/60 hover:bg-blue-500/20 py-2.5 rounded-xl border border-slate-700/50 transition-all active:scale-95 group"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-400">+{amount}</span>
                    <span className="text-[8px] font-bold text-slate-600 group-hover:text-blue-500/60">ml</span>
                  </div>
                </button>
              ))}
              <button
                onClick={() => handleUpdateWater(-250)}
                className="w-12 bg-slate-800/60 hover:bg-red-500/20 rounded-xl border border-slate-700/50 transition-all active:scale-95 group flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-lg text-slate-500 group-hover:text-red-400">remove</span>
              </button>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-4 mb-4">
            {/* Pie Chart - Macro Distribution */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/30 overflow-hidden">
              <button
                onClick={() => setShowPieChart(!showPieChart)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Macro Distribution</h3>
                <span className={`material-symbols-rounded text-primary transition-transform ${showPieChart ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {showPieChart && (
                <div className="px-4 pb-4">
                  {/* Unit Toggle Buttons */}
                  <div className="flex bg-slate-700/50 rounded-lg p-1 mb-4">
                    <button
                      onClick={() => setPieChartUnit('grams')}
                      className={`flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${pieChartUnit === 'grams'
                          ? 'bg-primary text-slate-900'
                          : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                      Grams
                    </button>
                    <button
                      onClick={() => setPieChartUnit('calories')}
                      className={`flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${pieChartUnit === 'calories'
                          ? 'bg-primary text-slate-900'
                          : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                      Calories
                    </button>
                  </div>

                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartUnit === 'grams' ? [
                            { name: 'Protein', value: totalProtein, color: '#EF4444' },
                            { name: 'Carbs', value: totalCarbs, color: '#3B82F6' },
                            { name: 'Fat', value: totalFat, color: '#F59E0B' },
                          ].filter(item => item.value > 0) : [
                            { name: 'Protein', value: totalProtein * 4, color: '#EF4444' },
                            { name: 'Carbs', value: totalCarbs * 4, color: '#3B82F6' },
                            { name: 'Fat', value: totalFat * 9, color: '#F59E0B' },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#EF4444" />
                          <Cell fill="#3B82F6" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value: number, name: string, payload: any) => {
                            const total = pieChartUnit === 'grams' 
                              ? (totalProtein + totalCarbs + totalFat)
                              : (totalProtein * 4 + totalCarbs * 4 + totalFat * 9);
                            const percent = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                            
                            // Use the actual color from the data payload (bar colors)
                            const color = payload?.payload?.color || (name === 'Protein' ? '#EF4444' : name === 'Carbs' ? '#3B82F6' : '#F59E0B');
                            
                            return [
                              <span style={{ color: color, fontWeight: 'bold' }}>
                                {name}: {value.toFixed(1)} {pieChartUnit === 'grams' ? 'g' : 'kcal'} ({percent}%)
                              </span>,
                              ''
                            ];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Protein</p>
                      <p className="text-xs font-bold text-red-400">
                        {pieChartUnit === 'grams' ? totalProtein.toFixed(1) : (totalProtein * 4).toFixed(0)}
                        <span className="text-[9px] text-slate-500 ml-0.5">{pieChartUnit === 'grams' ? 'g' : 'kcal'}</span>
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {pieChartUnit === 'grams'
                          ? `${((totalProtein / (totalProtein + totalCarbs + totalFat)) * 100).toFixed(0)}%`
                          : `${((totalProtein * 4) / (totalProtein * 4 + totalCarbs * 4 + totalFat * 9) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Carbs</p>
                      <p className="text-xs font-bold text-blue-400">
                        {pieChartUnit === 'grams' ? totalCarbs.toFixed(1) : (totalCarbs * 4).toFixed(0)}
                        <span className="text-[9px] text-slate-500 ml-0.5">{pieChartUnit === 'grams' ? 'g' : 'kcal'}</span>
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {pieChartUnit === 'grams'
                          ? `${((totalCarbs / (totalProtein + totalCarbs + totalFat)) * 100).toFixed(0)}%`
                          : `${((totalCarbs * 4) / (totalProtein * 4 + totalCarbs * 4 + totalFat * 9) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Fat</p>
                      <p className="text-xs font-bold text-amber-400">
                        {pieChartUnit === 'grams' ? totalFat.toFixed(1) : (totalFat * 9).toFixed(0)}
                        <span className="text-[9px] text-slate-500 ml-0.5">{pieChartUnit === 'grams' ? 'g' : 'kcal'}</span>
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {pieChartUnit === 'grams'
                          ? `${((totalFat / (totalProtein + totalCarbs + totalFat)) * 100).toFixed(0)}%`
                          : `${((totalFat * 9) / (totalProtein * 4 + totalCarbs * 4 + totalFat * 9) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Line Chart - Goal vs Intake */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/30 overflow-hidden">
              <button
                onClick={() => setShowLineChart(!showLineChart)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Goal vs Intake</h3>
                <span className={`material-symbols-rounded text-primary transition-transform ${showLineChart ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {showLineChart && (
                <div className="px-4 pb-4">
                  {/* Unit Toggle Buttons */}
                  <div className="flex bg-slate-700/50 rounded-lg p-1 mb-4">
                    <button
                      onClick={() => setLineChartUnit('grams')}
                      className={`flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${lineChartUnit === 'grams'
                          ? 'bg-primary text-slate-900'
                          : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                      Grams
                    </button>
                    <button
                      onClick={() => setLineChartUnit('calories')}
                      className={`flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${lineChartUnit === 'calories'
                          ? 'bg-primary text-slate-900'
                          : 'text-slate-400 hover:text-slate-300'
                        }`}
                    >
                      Calories
                    </button>
                  </div>

                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartUnit === 'grams' ? [
                        { name: 'Protein', goal: nutritionGoals?.daily_protein_target || 150, intake: totalProtein },
                        { name: 'Carbs', goal: nutritionGoals?.daily_carbs_target || 200, intake: totalCarbs },
                        { name: 'Fat', goal: nutritionGoals?.daily_fat_target || 65, intake: totalFat },
                      ] : [
                        { name: 'Protein', goal: (nutritionGoals?.daily_protein_target || 150) * 4, intake: totalProtein * 4 },
                        { name: 'Carbs', goal: (nutritionGoals?.daily_carbs_target || 200) * 4, intake: totalCarbs * 4 },
                        { name: 'Fat', goal: (nutritionGoals?.daily_fat_target || 65) * 9, intake: totalFat * 9 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                          axisLine={{ stroke: '#374151' }}
                        />
                        <YAxis
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                          axisLine={{ stroke: '#374151' }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value: number, name: string, payload: any) => {
                            // Get the macro name from the data payload for color determination
                            const macroName = payload?.payload?.name;
                            
                            let color;
                            if (name === 'Goal') {
                              color = '#10b981'; // Green for goals
                            } else if (name === 'Intake') {
                              // Color based on macro type
                              color = macroName === 'Protein' ? '#EF4444' : 
                                     macroName === 'Carbs' ? '#3B82F6' : 
                                     macroName === 'Fat' ? '#F59E0B' : '#f59e0b';
                            } else {
                              color = '#f59e0b'; // Default amber
                            }
                            
                            // Calculate percentage for goals vs intake
                            let percent = '';
                            if (payload?.payload?.goal && payload?.payload?.intake) {
                              const goal = payload?.payload?.goal;
                              const intake = payload?.payload?.intake;
                              percent = goal > 0 ? ` (${((intake / goal) * 100).toFixed(0)}%)` : '';
                            }
                            
                            return [
                              <span style={{ color: color, fontWeight: 'bold' }}>
                                {name}: {value.toFixed(1)} {lineChartUnit === 'grams' ? 'g' : 'kcal'}{percent}
                              </span>,
                              ''
                            ];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="goal"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 4 }}
                          name="Goal"
                        />
                        <Line
                          type="monotone"
                          dataKey="intake"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', r: 4 }}
                          name="Intake"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Protein</p>
                      <p className="text-xs font-bold text-red-400">
                        {lineChartUnit === 'grams'
                          ? `${totalProtein.toFixed(1)}/${nutritionGoals?.daily_protein_target || 150}g`
                          : `${(totalProtein * 4).toFixed(0)}/${((nutritionGoals?.daily_protein_target || 150) * 4).toFixed(0)}kcal`
                        }
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {lineChartUnit === 'grams'
                          ? `${((totalProtein / (nutritionGoals?.daily_protein_target || 150)) * 100).toFixed(0)}%`
                          : `${((totalProtein * 4) / ((nutritionGoals?.daily_protein_target || 150) * 4) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Carbs</p>
                      <p className="text-xs font-bold text-blue-400">
                        {lineChartUnit === 'grams'
                          ? `${totalCarbs.toFixed(1)}/${nutritionGoals?.daily_carbs_target || 200}g`
                          : `${(totalCarbs * 4).toFixed(0)}/${((nutritionGoals?.daily_carbs_target || 200) * 4).toFixed(0)}kcal`
                        }
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {lineChartUnit === 'grams'
                          ? `${((totalCarbs / (nutritionGoals?.daily_carbs_target || 200)) * 100).toFixed(0)}%`
                          : `${((totalCarbs * 4) / ((nutritionGoals?.daily_carbs_target || 200) * 4) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Fat</p>
                      <p className="text-xs font-bold text-amber-400">
                        {lineChartUnit === 'grams'
                          ? `${totalFat.toFixed(1)}/${nutritionGoals?.daily_fat_target || 65}g`
                          : `${(totalFat * 9).toFixed(0)}/${((nutritionGoals?.daily_fat_target || 65) * 9).toFixed(0)}kcal`
                        }
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {lineChartUnit === 'grams'
                          ? `${((totalFat / (nutritionGoals?.daily_fat_target || 65)) * 100).toFixed(0)}%`
                          : `${((totalFat * 9) / ((nutritionGoals?.daily_fat_target || 65) * 9) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Macros Summary with Toggle */}
          <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Macronutrients</h3>
              <div className="flex bg-slate-700/50 rounded-lg p-1">
                <button
                  onClick={() => setShowMacrosAsKcal(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!showMacrosAsKcal
                      ? 'bg-primary text-slate-900'
                      : 'text-slate-400 hover:text-slate-300'
                    }`}
                >
                  Grams
                </button>
                <button
                  onClick={() => setShowMacrosAsKcal(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${showMacrosAsKcal
                      ? 'bg-primary text-slate-900'
                      : 'text-slate-400 hover:text-slate-300'
                    }`}
                >
                  Calories
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-400 mb-1">Protein</p>
                <p className="text-sm font-bold text-red-400">
                  {showMacrosAsKcal ? `${(totalProtein * 4).toFixed(0)}` : `${totalProtein.toFixed(1)}`}
                  <span className="text-xs text-slate-500 ml-0.5">{showMacrosAsKcal ? 'kcal' : 'g'}</span>
                </p>
                {showMacrosAsKcal && <p className="text-[9px] text-slate-600 mt-1">×4 cal/g</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Carbs</p>
                <p className="text-sm font-bold text-blue-400">
                  {showMacrosAsKcal ? `${(totalCarbs * 4).toFixed(0)}` : `${totalCarbs.toFixed(1)}`}
                  <span className="text-xs text-slate-500 ml-0.5">{showMacrosAsKcal ? 'kcal' : 'g'}</span>
                </p>
                {showMacrosAsKcal && <p className="text-[9px] text-slate-600 mt-1">×4 cal/g</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Fat</p>
                <p className="text-sm font-bold text-amber-400">
                  {showMacrosAsKcal ? `${(totalFat * 9).toFixed(0)}` : `${totalFat.toFixed(1)}`}
                  <span className="text-xs text-slate-500 ml-0.5">{showMacrosAsKcal ? 'kcal' : 'g'}</span>
                </p>
                {showMacrosAsKcal && <p className="text-[9px] text-slate-600 mt-1">×9 cal/g</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Meals by Type */}
        <div className="space-y-6">
          {mealSummaries.map((mealSummary) => (
            <section key={mealSummary.type}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <span className="material-symbols-rounded text-orange-400">{mealSummary.icon}</span>
                  {mealSummary.label}
                  <span className="text-xs font-medium text-slate-400 ml-2">
                    ({Math.round(mealSummary.totalCalories)} kcal)
                  </span>
                </h2>
                <button
                  onClick={() => {
                    setSelectedMealType(mealSummary.type);
                    setShowSearchModal(true);
                  }}
                  className="text-xs font-bold text-primary hover:text-green-600 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-rounded text-sm">add</span>
                  Add
                </button>
              </div>
              <div className="bg-[#151C2C] rounded-2xl divide-y divide-[#1E293B] border border-[#1E293B]">
                {mealSummary.items.length > 0 ? (
                  mealSummary.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex items-center justify-between group hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedFoodDetails(allFoods.find(f => f.id === item.food_id) || null);
                        setShowNutritionDetail(true);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-slate-200">{item.food_name}</p>
                        <p className="text-xs text-slate-500">
                          {item.amount}{item.unit} • {Math.round(item.calories)} kcal
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFood(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all"
                      >
                        <span className="material-symbols-rounded text-lg">close</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500">
                    <p className="text-xs font-medium">No meals added yet</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </>
      ) : (
          <div className="space-y-6">
            <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6 border border-slate-700/30">
              <button
                onClick={() => setReportRange('weekly')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${reportRange === 'weekly' ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setReportRange('monthly')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${reportRange === 'monthly' ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Last 30 Days
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm font-medium">Analyzing your data...</p>
              </div>
            ) : historyMeals.length > 0 ? (
              <>
                {/* Historical Chart */}
                <div className="bg-[#151C2C] rounded-3xl p-5 border border-[#1E293B] shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Calorie Trends</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Intake</span>
                    </div>
                  </div>
                  <div className="h-64 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={aggregateHistoryData(historyMeals)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(str) => {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                          }}
                        />
                        <YAxis 
                          tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}
                          labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          cursor={{ stroke: '#334155', strokeWidth: 2 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="calories" 
                          stroke="#10b981" 
                          strokeWidth={4} 
                          dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#151C2C'}} 
                          activeDot={{r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily History List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily Breakdown</h3>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{aggregateHistoryData(historyMeals).length} Days Logged</span>
                  </div>
                  {aggregateHistoryData(historyMeals).map((day) => (
                    <button 
                      key={day.date}
                      className="w-full bg-[#151C2C] p-4 rounded-2xl border border-[#1E293B] flex items-center justify-between hover:bg-slate-800/40 transition-all active:scale-[0.98] group"
                      onClick={() => {
                        setSelectedDate(day.date);
                        setActiveTab('daily');
                      }}
                    >
                      <div className="text-left">
                        <p className="font-bold text-slate-200 group-hover:text-primary transition-colors">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <div className="flex gap-2 mt-1.5">
                          <div className="flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded">
                            <span className="text-[9px] text-red-400 font-black uppercase">P</span>
                            <span className="text-[10px] text-red-200 font-bold">{day.protein.toFixed(0)}g</span>
                          </div>
                          <div className="flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            <span className="text-[9px] text-blue-400 font-black uppercase">C</span>
                            <span className="text-[10px] text-blue-200 font-bold">{day.carbs.toFixed(0)}g</span>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <span className="text-[9px] text-amber-400 font-black uppercase">F</span>
                            <span className="text-[10px] text-amber-200 font-bold">{day.fat.toFixed(0)}g</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-black text-white">{Math.round(day.calories)}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest -mt-1">kcal</p>
                        </div>
                        <span className="material-symbols-rounded text-slate-700 group-hover:text-slate-500 transition-colors">chevron_right</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-[#151C2C] rounded-3xl p-12 text-center border border-[#1E293B]">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-3xl text-slate-600">history_toggle_off</span>
                </div>
                <h4 className="text-white font-bold mb-1">No history yet</h4>
                <p className="text-slate-500 text-sm">Start logging your meals to see reports and trends here.</p>
                <button 
                  onClick={() => setActiveTab('daily')}
                  className="mt-6 px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Log Today's Meals
                </button>
              </div>
            )}
          </div>
        )}

        {/* Food Search Modal */}
        {
          showSearchModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="sticky top-0 p-6 border-b border-slate-800 bg-[#1f2937]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Add Food</h2>
                    <button
                      onClick={() => {
                        setShowSearchModal(false);
                        setSelectedFood(null);
                        setSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  </div>

                  {!selectedFood && (
                    <div>
                      <input
                        type="text"
                        placeholder="Search food..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {filteredFoods.length} items available
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                  {selectedFood ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-4">{selectedFood.dish_name}</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                              Amount
                            </label>
                            <input
                              type="number"
                              value={selectedAmount}
                              onChange={(e) => setSelectedAmount(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                              Unit
                            </label>
                            <select
                              value={selectedUnit}
                              onChange={(e) => setSelectedUnit(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="g">Grams (g)</option>
                              <option value="oz">Ounces (oz)</option>
                              <option value="ml">Milliliters (ml)</option>
                              <option value="cup">Cup</option>
                              <option value="piece">Piece</option>
                            </select>
                          </div>

                          {/* Nutrition Preview */}
                          <div className="bg-slate-800/50 p-4 rounded-xl space-y-2">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Nutrition per serving</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-slate-700/50 p-2 rounded">
                                <p className="text-xs text-slate-400">Calories</p>
                                <p className="text-sm font-bold text-white">
                                  {(selectedFood.calories_kcal * (convertToGrams(parseFloat(selectedAmount), selectedUnit) / 100)).toFixed(0)} kcal
                                </p>
                              </div>
                              <div className="bg-slate-700/50 p-2 rounded">
                                <p className="text-xs text-slate-400">Protein</p>
                                <p className="text-sm font-bold text-red-400">
                                  {(selectedFood.protein_g * (convertToGrams(parseFloat(selectedAmount), selectedUnit) / 100)).toFixed(1)}g
                                </p>
                              </div>
                              <div className="bg-slate-700/50 p-2 rounded">
                                <p className="text-xs text-slate-400">Carbs</p>
                                <p className="text-sm font-bold text-blue-400">
                                  {(selectedFood.carbohydrates_g * (convertToGrams(parseFloat(selectedAmount), selectedUnit) / 100)).toFixed(1)}g
                                </p>
                              </div>
                              <div className="bg-slate-700/50 p-2 rounded">
                                <p className="text-xs text-slate-400">Fat</p>
                                <p className="text-sm font-bold text-amber-400">
                                  {(selectedFood.fats_g * (convertToGrams(parseFloat(selectedAmount), selectedUnit) / 100)).toFixed(1)}g
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFoods.length > 0 ? (
                        filteredFoods.map((food) => (
                          <button
                            key={food.id}
                            onClick={() => handleSelectFood(food)}
                            className="w-full p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-left border border-slate-700/30 transition-colors group"
                          >
                            <p className="font-semibold text-white text-sm group-hover:text-primary transition-colors">
                              {food.dish_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {food.calories_kcal} kcal • P: {food.protein_g}g • C: {food.carbohydrates_g}g • F: {food.fats_g}g
                            </p>
                          </button>
                        ))
                      ) : searchQuery ? (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm">No foods found</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <p className="text-sm">Type a food name to search</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedFood && (
                  <div className="border-t border-slate-800 p-6 bg-[#1f2937]">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedFood(null);
                          setSelectedAmount('100');
                        }}
                        className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleAddFood}
                        className="flex-1 bg-primary text-slate-900 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                      >
                        Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {/* Nutrition Detail Modal */}
        {
          showNutritionDetail && selectedFoodDetails && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">{selectedFoodDetails.dish_name}</h2>
                    <button
                      onClick={() => setShowNutritionDetail(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Macro Pie Chart */}
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Protein', value: selectedFoodDetails.protein_g * 4 },
                            { name: 'Carbs', value: selectedFoodDetails.carbohydrates_g * 4 },
                            { name: 'Fat', value: selectedFoodDetails.fats_g * 9 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#EF4444" />
                          <Cell fill="#3B82F6" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Nutrition */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 mb-1">Calories</p>
                      <p className="text-2xl font-bold text-white">{selectedFoodDetails.calories_kcal}</p>
                      <p className="text-xs text-slate-500">kcal</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 mb-1">Protein</p>
                      <p className="text-2xl font-bold text-red-400">{selectedFoodDetails.protein_g.toFixed(1)}</p>
                      <p className="text-xs text-slate-500">g</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 mb-1">Carbs</p>
                      <p className="text-2xl font-bold text-blue-400">{selectedFoodDetails.carbohydrates_g.toFixed(1)}</p>
                      <p className="text-xs text-slate-500">g</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 mb-1">Fat</p>
                      <p className="text-2xl font-bold text-amber-400">{selectedFoodDetails.fats_g.toFixed(1)}</p>
                      <p className="text-xs text-slate-500">g</p>
                    </div>
                  </div>

                  {/* Additional Nutrients */}
                  {(selectedFoodDetails.fibre_g || selectedFoodDetails.sodium_mg || selectedFoodDetails.free_sugar_g) && (
                    <div className="bg-slate-800/30 p-4 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Info</p>
                      {selectedFoodDetails.fibre_g && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">Fibre</span>
                          <span className="text-sm font-semibold text-white">{selectedFoodDetails.fibre_g.toFixed(1)}g</span>
                        </div>
                      )}
                      {selectedFoodDetails.sodium_mg && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">Sodium</span>
                          <span className="text-sm font-semibold text-white">{selectedFoodDetails.sodium_mg.toFixed(0)}mg</span>
                        </div>
                      )}
                      {selectedFoodDetails.free_sugar_g && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">Sugar</span>
                          <span className="text-sm font-semibold text-white">{selectedFoodDetails.free_sugar_g.toFixed(1)}g</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 p-6">
                  <button
                    onClick={() => setShowNutritionDetail(false)}
                    className="w-full bg-primary text-slate-900 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Submit Food Modal */}
        {
          showSubmitFood && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-[#1f2937] w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="sticky top-0 p-6 border-b border-slate-800 bg-[#1f2937]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Suggest Food Item</h2>
                    <button
                      onClick={() => {
                        setShowSubmitFood(false);
                        setSubmitMessage('');
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Help us build our food database. Admin will review your submission.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                    <div className="flex flex-col gap-3">
                      <p className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-rounded text-sm">auto_awesome</span>
                        Quick AI Scan
                      </p>
                      <p className="text-xs text-slate-300">Scan a nutrition label or dish photo to fill the form automatically.</p>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleAIScan}
                          className="hidden"
                          id="ai-scan-user"
                          disabled={isScanning}
                        />
                        <label
                          htmlFor="ai-scan-user"
                          className={`w-full flex items-center justify-center gap-2 py-3 bg-primary text-slate-900 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span className="material-symbols-rounded text-lg">
                            {isScanning ? 'sync' : 'photo_camera'}
                          </span>
                          {isScanning ? 'AI SCANNING...' : 'SCAN LABEL / FOOD'}
                        </label>
                      </div>
                    </div>
                  </div>

                  {submitMessage && (
                    <div className={`p-3 rounded-lg text-sm ${submitMessage.startsWith('success')
                      ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                      : 'bg-red-500/10 border border-red-500/50 text-red-400'
                      }`}>
                      {submitMessage.replace(/^(success|error):/, '')}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Dish Name *</label>
                    <input
                      type="text"
                      value={submitFoodData.dish_name}
                      onChange={(e) => setSubmitFoodData({ ...submitFoodData, dish_name: e.target.value })}
                      placeholder="e.g., Paneer Butter Masala"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Calories *</label>
                      <input
                        type="number"
                        value={submitFoodData.calories_kcal}
                        onChange={(e) => setSubmitFoodData({ ...submitFoodData, calories_kcal: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Protein (g) *</label>
                      <input
                        type="number"
                        value={submitFoodData.protein_g}
                        onChange={(e) => setSubmitFoodData({ ...submitFoodData, protein_g: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Carbs (g) *</label>
                      <input
                        type="number"
                        value={submitFoodData.carbohydrates_g}
                        onChange={(e) => setSubmitFoodData({ ...submitFoodData, carbohydrates_g: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Fat (g) *</label>
                      <input
                        type="number"
                        value={submitFoodData.fats_g}
                        onChange={(e) => setSubmitFoodData({ ...submitFoodData, fats_g: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Fibre (g)</label>
                    <input
                      type="number"
                      value={submitFoodData.fibre_g}
                      onChange={(e) => setSubmitFoodData({ ...submitFoodData, fibre_g: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Sodium (mg)</label>
                    <input
                      type="number"
                      value={submitFoodData.sodium_mg}
                      onChange={(e) => setSubmitFoodData({ ...submitFoodData, sodium_mg: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Notes (optional)</label>
                    <textarea
                      value={submitFoodData.submission_notes}
                      onChange={(e) => setSubmitFoodData({ ...submitFoodData, submission_notes: e.target.value })}
                      placeholder="e.g., nutrition data source, recipe details, etc."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 p-6 space-y-3">
                  <button
                    onClick={handleSubmitFood}
                    disabled={submitLoading || !submitFoodData.dish_name.trim()}
                    className="w-full bg-primary hover:bg-green-600 text-slate-900 py-3 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submitLoading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded">check</span>
                        Submit for Approval
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowSubmitFood(false);
                      setSubmitMessage('');
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </main >

      <BottomNav active="HOME" onNavigate={onNavigate} />
    </div >
  );
};

export default DailyTracker;
