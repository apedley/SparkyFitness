export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary_fiber: number;
}

export interface FoodEntry {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary_fiber: number;
  quantity: number;
  serving_size: number;
}

export interface ExerciseEntry {
  id: string;
  calories_burned: number;
}

export interface MacroSummary {
  consumed: number;
  goal: number;
}

export interface DailySummary {
  date: string;
  calorieGoal: number;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;      // consumed - burned
  remainingCalories: number; // goal - net
  protein: MacroSummary;
  carbs: MacroSummary;
  fat: MacroSummary;
  fiber: MacroSummary;
}
