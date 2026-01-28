import React from 'react';
import { View, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { ExerciseEntry } from '../types/exercise';
import Icon from './Icon';

interface ExerciseSummaryProps {
  exerciseEntries: ExerciseEntry[];
}

const ExerciseSummary: React.FC<ExerciseSummaryProps> = ({ exerciseEntries }) => {
  const textSecondary = useCSSVariable('--color-text-secondary') as string;

  const filtered = exerciseEntries.filter(
    (entry) => entry.exercise_snapshot?.name !== 'Active Calories'
  );

  if (filtered.length === 0) return null;

  return (
    <View className="bg-section rounded-xl p-4 mt-2 shadow-sm">
      <View className="flex-row items-center gap-2 mb-2">
        <Icon name="exercise" size={18} color={textSecondary} />
        <Text className="text-base font-semibold text-text-secondary">Exercise</Text>
      </View>
      {filtered.map((entry, index) => {
        const name = entry.exercise_snapshot?.name || 'Unknown exercise';
        const calories = Math.round(entry.calories_burned);
        const duration = entry.duration_minutes;

        return (
          <View key={entry.id || index} className="py-1.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-base text-text-primary flex-1 mr-2 font-medium" numberOfLines={1}>
                {name}
                {duration != null && duration > 0 && (
                  <Text className="text-sm text-text-muted">
                    {' · '}{Math.round(duration)} min
                  </Text>
                )}
              </Text>
              <Text className="text-sm text-text-primary">
                {calories} Cal
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default ExerciseSummary;
