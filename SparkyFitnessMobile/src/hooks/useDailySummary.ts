import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { fetchDailyGoals } from '../services/goalsApi';
import {
  fetchFoodEntries,
  calculateCaloriesConsumed,
  calculateProtein,
  calculateCarbs,
  calculateFat,
  calculateFiber,
} from '../services/foodEntriesApi';
import {
  fetchExerciseEntries,
  calculateCaloriesBurned,
  calculateActiveCalories,
  calculateOtherExerciseCalories,
} from '../services/exerciseApi';
import type { DailySummary } from '../types/dailySummary';

export const dailySummaryQueryKey = (date: string) => ['dailySummary', date] as const;

interface UseDailySummaryOptions {
  date: string;
  enabled?: boolean;
}

export function useDailySummary({ date, enabled = true }: UseDailySummaryOptions) {
  const query = useQuery({
    queryKey: dailySummaryQueryKey(date),
    queryFn: async (): Promise<DailySummary> => {
      const [goals, foodEntries, exerciseEntries] = await Promise.all([
        fetchDailyGoals(date),
        fetchFoodEntries(date),
        fetchExerciseEntries(date),
      ]);

      const calorieGoal = goals.calories || 0;
      const caloriesConsumed = calculateCaloriesConsumed(foodEntries);
      const caloriesBurned = calculateCaloriesBurned(exerciseEntries);
      const activeCalories = calculateActiveCalories(exerciseEntries);
      const otherExerciseCalories = calculateOtherExerciseCalories(exerciseEntries);
      const netCalories = caloriesConsumed - caloriesBurned;
      const remainingCalories = calorieGoal - netCalories;

      return {
        date,
        calorieGoal,
        caloriesConsumed,
        caloriesBurned,
        activeCalories,
        otherExerciseCalories,
        netCalories,
        remainingCalories,
        protein: {
          consumed: calculateProtein(foodEntries),
          goal: goals.protein || 0,
        },
        carbs: {
          consumed: calculateCarbs(foodEntries),
          goal: goals.carbs || 0,
        },
        fat: {
          consumed: calculateFat(foodEntries),
          goal: goals.fat || 0,
        },
        fiber: {
          consumed: calculateFiber(foodEntries),
          goal: goals.dietary_fiber || 0,
        },
      };
    },
    enabled,
  });

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        query.refetch();
      }
    }, [query, enabled])
  );

  return {
    summary: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
