import React from 'react';
import { View, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { FoodEntry } from '../types/foodEntries';
import Icon, { type IconName } from './Icon';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

interface MealConfig {
  label: string;
  icon: IconName;
}

const MEAL_CONFIG: Record<string, MealConfig> = {
  breakfast: { label: 'Breakfast', icon: 'meal-breakfast' },
  lunch: { label: 'Lunch', icon: 'meal-lunch' },
  dinner: { label: 'Dinner', icon: 'meal-dinner' },
  snack: { label: 'Snack', icon: 'meal-snack' },
};

interface FoodSummaryProps {
  foodEntries: FoodEntry[];
}

function groupByMealType(entries: FoodEntry[]): Record<string, FoodEntry[]> {
  const grouped: Record<string, FoodEntry[]> = {};
  for (const mealType of MEAL_TYPES) {
    grouped[mealType] = [];
  }
  for (const entry of entries) {
    const mealType = entry.meal_type?.toLowerCase() || 'snack';
    if (grouped[mealType]) {
      grouped[mealType].push(entry);
    } else {
      grouped.snack.push(entry);
    }
  }
  return grouped;
}

function calculateEntryValue(value: number | undefined, entry: FoodEntry): number {
  if (value === undefined || !entry.serving_size) return 0;
  return (value * entry.quantity) / entry.serving_size;
}

interface EntryNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function calculateEntryNutrition(entry: FoodEntry): EntryNutrition {
  return {
    calories: Math.round(calculateEntryValue(entry.calories, entry)),
    protein: Math.round(calculateEntryValue(entry.protein, entry)),
    carbs: Math.round(calculateEntryValue(entry.carbs, entry)),
    fat: Math.round(calculateEntryValue(entry.fat, entry)),
  };
}

interface MealSectionProps {
  mealType: string;
  entries: FoodEntry[];
}

const MealSection: React.FC<MealSectionProps> = ({ mealType, entries }) => {
  const config = MEAL_CONFIG[mealType] || { label: mealType, icon: 'meal-snack' as IconName };
  const textSecondary = useCSSVariable('--color-text-secondary') as string;
  const textPrimary = useCSSVariable('--color-text-primary') as string;
  const textAccent = useCSSVariable('--color-accent-primary') as string;

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-2">
        <Icon name={config.icon} size={18} color={textSecondary} />
        <Text className="text-base font-semibold text-text-secondary">{config.label}</Text>
      </View>
      {entries.length === 0 ? (
        <Text className="text-sm text-text-muted pl-7">No entries</Text>
      ) : (
        entries.map((entry, index) => {
          const nutrition = calculateEntryNutrition(entry);
          const name = entry.food_name || 'Unknown food';
          return (
            <View key={entry.id || index} className="py-1.5 flex flex-row justify-between items-center">
              <Text className="text-base text-text-primary flex-1 mr-2" numberOfLines={1}>
                {name}
              </Text>
              <Text className="text-sm text-text-muted">
                {nutrition.calories} cal · {nutrition.protein}p · {nutrition.carbs}c · {nutrition.fat}f
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
};

const FoodSummary: React.FC<FoodSummaryProps> = ({ foodEntries }) => {
  const grouped = groupByMealType(foodEntries);

  return (
    <View className="bg-surface-primary rounded-xl p-4 mt-2 gap-3 light:shadow-sm">
      {MEAL_TYPES.map((mealType) => (
        <MealSection key={mealType} mealType={mealType} entries={grouped[mealType]} />
      ))}
    </View>
  );
};

export default FoodSummary;
