import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useServerConnection, useDailySummary } from '../hooks';

interface SummaryScreenProps {
  navigation: { navigate: (screen: string) => void };
}

// Get today's date in YYYY-MM-DD format (local timezone)
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ProgressRingProps {
  progress: number; // 0-1 value (capped at 1 for display)
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size,
  strokeWidth,
  color,
  backgroundColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressCapped = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - progressCapped);

  return (
    <Svg width={size} height={size}>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

interface SideStatProps {
  label: string;
  value: number;
  color?: string;
}

const SideStat: React.FC<SideStatProps> = ({ label, value }) => (
  <View className="items-center justify-center flex-1">
    <Text className="text-xl font-bold text-text">
      {Math.round(value).toLocaleString()}
    </Text>
    <Text className="text-text-secondary text-sm mt-1">{label}</Text>
  </View>
);

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  unit?: string;
}

const MacroCard: React.FC<MacroCardProps> = ({ label, consumed, goal, color, unit = 'g' }) => {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const isOver = consumed > goal && goal > 0;

  return (
    <View className="w-[48%] bg-card rounded-xl p-3 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-text">{label}</Text>
        <Text className="text-xs text-text-secondary">
          {Math.round(consumed)}{unit} / {Math.round(goal)}{unit}
        </Text>
      </View>
      {/* Progress bar background */}
      <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
        {/* Progress bar fill */}
        <View
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: isOver ? '#EF4444' : color,
          }}
        />
      </View>
    </View>
  );
};

const SummaryScreen: React.FC<SummaryScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const todayDate = getTodayDate();

  const { isConnected, isLoading: isConnectionLoading } = useServerConnection();
  const { summary, isLoading, isError, refetch } = useDailySummary({
    date: todayDate,
    enabled: isConnected,
  });

  // Determine progress ring color based on percentage
  const getProgressColor = (percent: number): string => {
    if (percent >= 1) return '#EF4444'; // danger (red) - at or over goal
    if (percent >= 0.9) return '#F59E0B'; // warning (orange/yellow) - 90-99%
    return '#3B82F6'; // primary (blue) - under 90%
  };

  const progressPercent = summary
    ? summary.calorieGoal > 0
      ? summary.netCalories / summary.calorieGoal
      : 0
    : 0;
  const progressColor = getProgressColor(progressPercent);

  // Render content based on state
  const renderContent = () => {
    // No server configured
    if (!isConnectionLoading && !isConnected) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="cloud-offline-outline" size={64} color="#9CA3AF" />
          <Text className="text-text-muted text-lg text-center mt-4">
            No server configured
          </Text>
          <Text className="text-text-muted text-sm text-center mt-2">
            Configure your server connection in Settings to view your daily summary.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-xl py-3 px-6 mt-6"
            onPress={() => navigation.navigate('Settings')}
          >
            <Text className="text-white font-semibold">Go to Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Loading state
    if (isLoading || isConnectionLoading) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-text-muted text-base mt-4">Loading summary...</Text>
        </View>
      );
    }

    // Error state
    if (isError) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-text-muted text-lg text-center mt-4">
            Failed to load summary
          </Text>
          <Text className="text-text-muted text-sm text-center mt-2">
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-xl py-3 px-6 mt-6"
            onPress={() => refetch()}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Data loaded successfully
    if (!summary) {
      return null;
    }

    const displayRemaining = Math.round(summary.remainingCalories);
    const remainingText = displayRemaining >= 0
      ? `${displayRemaining.toLocaleString()}`
      : `${Math.abs(displayRemaining).toLocaleString()} over`;

    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Calories Section - Ring with flanking stats */}
        <View className="bg-card rounded-xl p-4 mb-4">
          <View className="flex-row items-center justify-center">
            {/* Left: Consumed */}
            <SideStat
              label="Consumed"
              value={summary.caloriesConsumed}
            />

            {/* Center: Progress Ring */}
            <View className="relative items-center justify-center mx-2">
              <ProgressRing
                progress={progressPercent}
                size={160}
                strokeWidth={12}
                color={progressColor}
                backgroundColor="#374151"
              />
              {/* Center text overlay */}
              <View className="absolute items-center justify-center">
                <Text className="text-3xl font-bold text-text">
                  {remainingText}
                </Text>
                <Text className="text-text-secondary text-xs mt-1">
                  {displayRemaining >= 0 ? 'remaining' : ''}
                </Text>
                <Text className="text-text-muted text-xs">
                  of {summary.calorieGoal.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Right: Burned */}
            <SideStat
              label="Burned"
              value={summary.caloriesBurned}
            />
          </View>
        </View>

        {/* Macros Section - 2x2 grid */}
        <View className="flex-row flex-wrap justify-between">
          <MacroCard
            label="Protein"
            consumed={summary.protein.consumed}
            goal={summary.protein.goal}
            color="#F97316"
          />
          <MacroCard
            label="Carbs"
            consumed={summary.carbs.consumed}
            goal={summary.carbs.goal}
            color="#3B82F6"
          />
          <MacroCard
            label="Fat"
            consumed={summary.fat.consumed}
            goal={summary.fat.goal}
            color="#FBBF24"
          />
          <MacroCard
            label="Fiber"
            consumed={summary.fiber.consumed}
            goal={summary.fiber.goal}
            color="#22C55E"
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
        <Text className="text-2xl font-bold text-text">Daily Summary</Text>
        <Text className="text-text-secondary">Today</Text>
      </View>

      {renderContent()}
    </View>
  );
};

export default SummaryScreen;
