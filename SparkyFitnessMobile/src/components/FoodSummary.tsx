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
  snack: { label: 'Snack', icon: 'meal-snack' },
  dinner: { label: 'Dinner', icon: 'meal-dinner' },
  other: { label: 'Other', icon: 'meal-snack' },
};

interface FoodSummaryProps {
  foodEntries: FoodEntry[];
}

function groupByMealType(entries: FoodEntry[]): Record<string, FoodEntry[]> {
  const grouped: Record<string, FoodEntry[]> = {};
  for (const mealType of MEAL_TYPES) {
    grouped[mealType] = [];
  }
  grouped.other = [];
  for (const entry of entries) {
    const mealType = entry.meal_type?.toLowerCase() || 'snack';
    if (MEAL_TYPES.includes(mealType as (typeof MEAL_TYPES)[number])) {
      grouped[mealType].push(entry);
    } else {
      grouped.other.push(entry);
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

function getDominantMacroColor(
  nutrition: EntryNutrition,
  proteinColor: string,
  carbsColor: string,
  fatColor: string,
): string | null {
  const proteinCals = nutrition.protein * 4;
  const carbsCals = nutrition.carbs * 4;
  const fatCals = nutrition.fat * 9;

  if (proteinCals === 0 && carbsCals === 0 && fatCals === 0) return null;

  if (fatCals >= proteinCals && fatCals >= carbsCals) return fatColor;
  if (proteinCals >= carbsCals) return proteinColor;
  return carbsColor;
}

interface MealSectionProps {
  mealType: string;
  entries: FoodEntry[];
}

const MealSection: React.FC<MealSectionProps> = ({ mealType, entries }) => {
  const config = MEAL_CONFIG[mealType] || { label: mealType, icon: 'meal-snack' as IconName };
  const [textSecondary, proteinColor, carbsColor, fatColor] = useCSSVariable([
    '--color-text-secondary',
    '--color-macro-protein',
    '--color-macro-carbs',
    '--color-macro-fat',
  ]) as [string, string, string, string];

  const totalCalories = entries.reduce((sum, entry) => sum + calculateEntryNutrition(entry).calories, 0);

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-2">
        <Icon name={config.icon} size={18} color={textSecondary} />
        <Text className="text-sm font-semibold text-text-secondary flex-1">{config.label}</Text>
        {totalCalories > 0 && (
          <Text className="text-sm text-text-secondary font-bold">{totalCalories} Cal</Text>
        )}
      </View>
      {entries.length === 0 ? (
        <Text className="text-sm text-text-muted pl-7">No entries</Text>
      ) : (
        entries.map((entry, index) => {
          const nutrition = calculateEntryNutrition(entry);
          const dotColor = getDominantMacroColor(nutrition, proteinColor, carbsColor, fatColor);
          const name = entry.food_name || 'Unknown food';
          return (
            <View key={entry.id || index} className="py-1.5">
              <View className="flex-row justify-between items-center">
                <Text className="text-base text-text-primary flex-1 mr-2 font-medium" numberOfLines={1}>
                  {name}
                  <Text className="text-sm text-text-muted">
                    {' · '}{entry.quantity} {entry.unit}
                  </Text>
                </Text>
                <View className="flex-row items-center gap-1.5">
                  {dotColor ? (
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                  ) : (
                    <View className="w-2" />
                  )}
                  <Text className="text-sm text-text-primary">
                    {nutrition.calories} Cal
                  </Text>
                </View>
              </View>
              {/* <View className="flex-row justify-end mt-0.5">
                <View className="flex-row">
                  
                  <Text className="text-s w-10 text-right" style={{ color: proteinColor }}>
                    {nutrition.protein}
                  </Text>
                  <Text className="text-s w-10 text-right" style={{ color: carbsColor }}>
                    {nutrition.carbs}
                  </Text>
                  <Text className="text-s w-10 text-right" style={{ color: fatColor }}>
                    {nutrition.fat}
                  </Text>
                </View>
              </View> */}
            </View>
          );
        })
      )}
    </View>
  );
};

const FoodSummary: React.FC<FoodSummaryProps> = ({ foodEntries }) => {
  if (foodEntries.length === 0) {
    return (
      <View className="bg-section rounded-xl p-4 mt-2 shadow-sm items-center py-6">
        <Text className="text-text-muted text-base">No food entries for today</Text>
      </View>
    );
  }

  const grouped = groupByMealType(foodEntries);

  return (
    <View className="bg-section rounded-xl p-4 mt-2 gap-3 shadow-sm">
      {MEAL_TYPES.map((mealType, index) => (
        <React.Fragment key={mealType}>
          {index > 0 && <View className="border-b border-border-subtle" />}
          <MealSection mealType={mealType} entries={grouped[mealType]} />
        </React.Fragment>
      ))}
      {grouped.other.length > 0 && (
        <>
          <View className="border-b border-border-subtle" />
          <MealSection mealType="other" entries={grouped.other} />
        </>
      )}
    </View>
  );
};

export default FoodSummary;
