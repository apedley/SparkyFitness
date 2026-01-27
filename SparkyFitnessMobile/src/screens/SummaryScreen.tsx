import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import Icon from '../components/Icon';
import { useServerConnection, useDailySummary, usePreferences, useMeasurements } from '../hooks';
import OnboardingModal, { shouldShowOnboardingModal } from '../components/OnboardingModal';
import FoodSummary from '../components/FoodSummary';
import { getActiveServerConfig } from '../services/storage';
import { calculateEffectiveBurned, calculateCalorieBalance } from '../services/calculations';

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
    <Text className="text-xl font-bold text-text-primary">
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
  const progress = goal > 0 ? consumed / goal : 0;
  const isOver = progress > 1;

  // When over: bar fills 100%, goal marker shows where 100% was
  // When under: bar shows progress, no marker needed
  const barWidth = isOver ? 100 : progress * 100;
  const goalMarkerPosition = isOver ? (1 / progress) * 100 : null;

  return (
    <View className="w-[48%] bg-surface-primary rounded-xl p-3 mb-3 dark:opacity-85">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-text-primary">{label}</Text>
        <Text className="text-xs text-text-secondary">
          {Math.round(consumed)}{unit} / {Math.round(goal)}{unit}
        </Text>
      </View>
      {/* Progress bar container */}
      <View className="relative h-2">
        {/* Track background */}
        <View className="absolute left-0 right-0 top-0 bottom-0 bg-progress-track rounded-full" />
        {/* Progress bar fill */}
        <View
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            opacity: isOver ? 0.6 : 1,
          }}
        />
        {/* Goal marker - vertical line showing where 100% is when over */}
        {isOver && goalMarkerPosition && (
          <View
            className="absolute top-0 h-full"
            style={{
              left: `${goalMarkerPosition}%`,
              width: 2,
              backgroundColor: color,
              marginLeft: -1,
            }}
          />
        )}
      </View>
    </View>
  );
};

interface MacroColors {
  protein: string;
  carbs: string;
  fat: string;
}

interface MacroStackedBarProps {
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  colors: MacroColors;
}

const MacroStackedBar: React.FC<MacroStackedBarProps> = ({
  protein,
  carbs,
  fat,
  colors,
}) => {
  // Convert grams to calories
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;

  const macroCals = proteinCal + carbsCal + fatCal;

  // Calculate percentages of the bar
  const proteinPct = macroCals > 0 ? (proteinCal / macroCals) * 100 : 0;
  const carbsPct = macroCals > 0 ? (carbsCal / macroCals) * 100 : 0;
  const fatPct = macroCals > 0 ? (fatCal / macroCals) * 100 : 0;

  return (
    <View className="bg-surface-primary rounded-xl p-4 mb-4">
      <Text className="text-sm font-medium text-text-primary mb-3">Macro Breakdown</Text>

      {/* Stacked bar */}
      <View className="h-6 bg-progress-track rounded-full overflow-hidden flex-row dark:opacity-85">
        {proteinPct > 0 && (
          <View
            style={{
              width: `${proteinPct}%`,
              backgroundColor: colors.protein,
            }}
            className="h-full"
          />
        )}
        {carbsPct > 0 && (
          <View
            style={{
              width: `${carbsPct}%`,
              backgroundColor: colors.carbs,
            }}
            className="h-full"
          />
        )}
        {fatPct > 0 && (
          <View
            style={{
              width: `${fatPct}%`,
              backgroundColor: colors.fat,
            }}
            className="h-full"
          />
        )}
      </View>

      {/* Legend */}
      <View className="flex-row mt-3 justify-between">
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-1"
            style={{ backgroundColor: colors.protein }}
          />
          <Text className="text-xs text-text-secondary">
            Protein {Math.round(proteinCal)} cal
          </Text>
        </View>
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-1"
            style={{ backgroundColor: colors.carbs }}
          />
          <Text className="text-xs text-text-secondary">
            Carbs {Math.round(carbsCal)} cal
          </Text>
        </View>
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-1"
            style={{ backgroundColor: colors.fat }}
          />
          <Text className="text-xs text-text-secondary">
            Fat {Math.round(fatCal)} cal
          </Text>
        </View>
      </View>
    </View>
  );
};

const SummaryScreen: React.FC<SummaryScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [todayDate, setTodayDate] = useState(getTodayDate);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const hasCheckedOnboarding = useRef(false);

  // Update date when screen comes into focus (handles day rollover)
  useFocusEffect(
    useCallback(() => {
      setTodayDate(getTodayDate());
    }, [])
  );

  // Check for onboarding on initial mount only
  useEffect(() => {
    const checkOnboarding = async () => {
      if (hasCheckedOnboarding.current) return;
      hasCheckedOnboarding.current = true;

      if (!shouldShowOnboardingModal()) return;

      const activeConfig = await getActiveServerConfig();
      if (!activeConfig) {
        setShowOnboardingModal(true);
      }
    };

    checkOnboarding();
  }, []);

  const { isConnected, isLoading: isConnectionLoading } = useServerConnection();
  const { summary, isLoading, isError, refetch } = useDailySummary({
    date: todayDate,
    enabled: isConnected,
  });
  const { preferences, isLoading: isPreferencesLoading, isError: isPreferencesError } = usePreferences({
    enabled: isConnected,
  });
  const { measurements, isLoading: isMeasurementsLoading, isError: isMeasurementsError } = useMeasurements({
    date: todayDate,
    enabled: isConnected,
  });

  // Get macro colors from CSS variables (theme-aware)
  const [proteinColor, carbsColor, fatColor, fiberColor, primaryColor, primarySubtleColor] = useCSSVariable([
    '--color-macro-protein',
    '--color-macro-carbs',
    '--color-macro-fat',
    '--color-macro-fiber',
    '--color-accent-primary',
    '--color-accent-subtle',
  ]) as [string, string, string, string, string, string];

  const macroColors = { protein: proteinColor, carbs: carbsColor, fat: fatColor };

  // Render content based on state
  const renderContent = () => {
    // No server configured
    if (!isConnectionLoading && !isConnected) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Icon name="cloud-offline" size={64} color="#9CA3AF" />
          <Text className="text-text-muted text-lg text-center mt-4">
            No server configured
          </Text>
          <Text className="text-text-muted text-sm text-center mt-2">
            Configure your server connection in Settings to view your daily summary.
          </Text>
          <TouchableOpacity
            className="bg-accent-primary rounded-xl py-3 px-6 mt-6"
            onPress={() => navigation.navigate('Settings')}
          >
            <Text className="text-white font-semibold">Go to Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Loading state
    if (isLoading || isConnectionLoading || isPreferencesLoading || isMeasurementsLoading) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-text-muted text-base mt-4">Loading summary...</Text>
        </View>
      );
    }

    // Error state
    if (isError || isPreferencesError || isMeasurementsError) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-text-muted text-lg text-center mt-4">
            Failed to load summary
          </Text>
          <Text className="text-text-muted text-sm text-center mt-2">
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            className="bg-accent-primary rounded-xl py-3 px-6 mt-6"
            onPress={() => refetch()}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Data loaded successfully
    if (!summary || !preferences) {
      return null;
    }

    const totalBurned = calculateEffectiveBurned({
      activeCalories: summary.activeCalories,
      otherExerciseCalories: summary.otherExerciseCalories,
      steps: measurements?.steps || 0,
    });

    const { netCalories, remainingCalories } = calculateCalorieBalance({
      calorieGoal: summary.calorieGoal,
      caloriesConsumed: summary.caloriesConsumed,
      caloriesBurned: totalBurned,
    });
    const progressPercent = summary.calorieGoal > 0 ? netCalories / summary.calorieGoal : 0;
    const displayRemaining = Math.round(remainingCalories);
    const remainingText = displayRemaining >= 0
      ? `${displayRemaining.toLocaleString()}`
      : `+${Math.abs(displayRemaining).toLocaleString()}`;

    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Calories Section - Ring with flanking stats */}
        <View className="bg-surface-primary rounded-xl p-4 mb-4">
          <View className="flex-row items-center justify-center">
            {/* Left: Consumed */}
            <SideStat
              label="Consumed"
              value={summary.caloriesConsumed}
            />

            {/* Center: Progress Ring */}
            <View className="relative items-center justify-center mx-2">
              <View className="dark:opacity-85">
                <ProgressRing
                  progress={progressPercent}
                  size={160}
                  strokeWidth={12}
                  color={primaryColor}
                  backgroundColor={primarySubtleColor}
                />
              </View>
              {/* Center text overlay */}
              <View className="absolute items-center justify-center">
                <Text className="text-2xl font-bold text-text-primary">
                  {remainingText}
                </Text>
                <Text className="text-text-secondary text-xs">
                  {displayRemaining >= 0 ? 'remaining' : 'over goal'}
                </Text>
                <Text className="text-text-muted text-[10px] mt-0.5">
                  of {summary.calorieGoal.toLocaleString()} kcal
                </Text>
              </View>
            </View>

            {/* Right: Burned */}
            <SideStat
              label="Burned"
              value={totalBurned}
            />
          </View>
        </View>

        {/* Macro Stacked Bar */}
        <MacroStackedBar
          protein={summary.protein.consumed}
          carbs={summary.carbs.consumed}
          fat={summary.fat.consumed}
          colors={macroColors}
        />

        {/* Macros Section - 2x2 grid */}
        <View className="flex-row flex-wrap justify-between">
          <MacroCard
            label="Protein"
            consumed={summary.protein.consumed}
            goal={summary.protein.goal}
            color={proteinColor}
          />
          <MacroCard
            label="Carbs"
            consumed={summary.carbs.consumed}
            goal={summary.carbs.goal}
            color={carbsColor}
          />
          <MacroCard
            label="Fat"
            consumed={summary.fat.consumed}
            goal={summary.fat.goal}
            color={fatColor}
          />
          <MacroCard
            label="Fiber"
            consumed={summary.fiber.consumed}
            goal={summary.fiber.goal}
            color={fiberColor}
          />
        </View>

        {/* Food Summary */}
        <FoodSummary foodEntries={summary.foodEntries} />
      </ScrollView>
    );
  };

  const handleOnboardingGoToSettings = () => {
    setShowOnboardingModal(false);
    navigation.navigate('Settings');
  };

  const handleOnboardingDismiss = () => {
    setShowOnboardingModal(false);
  };

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top }}>
      {/* Header Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-border-subtle">
        <Text className="text-2xl font-bold text-text-primary">Daily Summary</Text>
        <Text className="text-text-secondary">Today</Text>
      </View>

      {renderContent()}

      <OnboardingModal
        visible={showOnboardingModal}
        onGoToSettings={handleOnboardingGoToSettings}
        onDismiss={handleOnboardingDismiss}
      />
    </View>
  );
};

export default SummaryScreen;
