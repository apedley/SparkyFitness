import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Canvas, Path, Circle as SkiaCircle, Rect, RoundedRect, Group, Skia, rect, rrect } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
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
  const center = size / 2;
  const progressCapped = Math.min(Math.max(progress, 0), 1);

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progressCapped, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressCapped, animatedProgress]);

  const progressPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const sweepAngle = animatedProgress.value * 360;
    if (sweepAngle > 0) {
      const startAngle = -90; // Start from top
      const oval = {
        x: center - radius,
        y: center - radius,
        width: radius * 2,
        height: radius * 2,
      };
      path.addArc(oval, startAngle, sweepAngle);
    }
    return path;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Background circle */}
      <SkiaCircle
        cx={center}
        cy={center}
        r={radius}
        style="stroke"
        strokeWidth={strokeWidth}
        color={backgroundColor}
      />
      {/* Progress arc */}
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={strokeWidth}
        color={color}
        strokeCap="round"
      />
    </Canvas>
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
  overfillColor: string;
  unit?: string;
}

const MacroCard: React.FC<MacroCardProps> = ({ label, consumed, goal, color, overfillColor, unit = 'g' }) => {
  const [barWidth, setBarWidth] = useState(0);
  const progress = goal > 0 ? consumed / goal : 0;
  const isOver = progress > 1;
  const barHeight = 8;
  const borderRadius = 4;
  const trackColor = useCSSVariable('--color-progress-track') as string;

  // When over: solid fill to goal point, reduced opacity for overage
  const solidFillWidth = isOver ? barWidth / progress : barWidth * Math.min(progress, 1);
  const overflowWidth = isOver ? barWidth - solidFillWidth - 2 : 0; // 2px gap

  return (
    <View className="w-[48%] bg-surface-primary rounded-xl p-3 mb-3 light:shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-text-primary">{label}</Text>
        <Text className="text-xs text-text-secondary">
          {Math.round(consumed)}{unit} / {Math.round(goal)}{unit}
        </Text>
      </View>
      {/* Progress bar container */}
      <View
        className="h-2"
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Canvas style={{ width: barWidth, height: barHeight }}>
            {/* Track background */}
            <RoundedRect
              x={0}
              y={0}
              width={barWidth}
              height={barHeight}
              r={borderRadius}
              color={trackColor}
            />
            {/* Solid fill portion */}
            {solidFillWidth > 0 && (
              <Group
                clip={rrect(
                  rect(0, 0, solidFillWidth, barHeight),
                  borderRadius,
                  isOver ? 0 : borderRadius
                )}
              >
                <Rect
                  x={0}
                  y={0}
                  width={solidFillWidth}
                  height={barHeight}
                  color={color}
                />
              </Group>
            )}
            {/* Overflow portion with reduced opacity */}
            {isOver && overflowWidth > 0 && (
              <Group opacity={0.65}>
                <Group
                  clip={rrect(
                    rect(solidFillWidth + 2, 0, overflowWidth, barHeight),
                    0,
                    borderRadius
                  )}
                >
                  <Rect
                    x={solidFillWidth + 2}
                    y={0}
                    width={overflowWidth}
                    height={barHeight}
                    color={color}
                  />
                </Group>
              </Group>
            )}
          </Canvas>
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
  const [barWidth, setBarWidth] = useState(0);
  const barHeight = 24;
  const borderRadius = 12;
  const gap = 2;

  // Convert grams to calories
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;

  const macroCals = proteinCal + carbsCal + fatCal;

  // Calculate percentages of the bar
  const proteinPct = macroCals > 0 ? proteinCal / macroCals : 0;
  const carbsPct = macroCals > 0 ? carbsCal / macroCals : 0;
  const fatPct = macroCals > 0 ? fatCal / macroCals : 0;

  // Calculate widths accounting for gaps
  const totalGaps = [proteinPct, carbsPct, fatPct].filter(p => p > 0).length - 1;
  const availableWidth = barWidth - (totalGaps > 0 ? totalGaps * gap : 0);
  const proteinWidth = availableWidth * proteinPct;
  const carbsWidth = availableWidth * carbsPct;
  const fatWidth = availableWidth * fatPct;

  // Calculate x positions
  let currentX = 0;
  const proteinX = currentX;
  currentX += proteinWidth + (proteinPct > 0 && carbsPct > 0 ? gap : 0);
  const carbsX = currentX;
  currentX += carbsWidth + (carbsPct > 0 && fatPct > 0 ? gap : 0);
  const fatX = currentX;

  const progressTrackColor = useCSSVariable('--color-progress-track') as string;

  return (
    <View className="bg-surface-primary rounded-xl p-4 mb-4 light:shadow-sm">
      <Text className="text-sm font-medium text-text-primary mb-3">Macro Breakdown</Text>

      {/* Stacked bar */}
      <View
        className="h-6"
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Canvas style={{ width: barWidth, height: barHeight }}>
            {/* Clip group for rounded edges */}
            <Group clip={rrect(rect(0, 0, barWidth, barHeight), borderRadius, borderRadius)}>
              {/* Track background */}
              <Rect x={0} y={0} width={barWidth} height={barHeight} color={progressTrackColor} />
              {/* Protein segment */}
              {proteinPct > 0 && (
                <Rect
                  x={proteinX}
                  y={0}
                  width={proteinWidth}
                  height={barHeight}
                  color={colors.protein}
                />
              )}
              {/* Carbs segment */}
              {carbsPct > 0 && (
                <Rect
                  x={carbsX}
                  y={0}
                  width={carbsWidth}
                  height={barHeight}
                  color={colors.carbs}
                />
              )}
              {/* Fat segment */}
              {fatPct > 0 && (
                <Rect
                  x={fatX}
                  y={0}
                  width={fatWidth}
                  height={barHeight}
                  color={colors.fat}
                />
              )}
            </Group>
          </Canvas>
        )}
      </View>

      {/* Legend */}
      <View className="flex-row mt-3 justify-between">
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-1 light:opacity-45"
            style={{ backgroundColor: colors.protein }}
          />
          <Text className="text-xs text-text-secondary">
            Protein {Math.round(proteinCal)} cal
          </Text>
        </View>
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-1 light:opacity-45"
            style={{ backgroundColor: colors.carbs }}
          />
          <Text className="text-xs text-text-secondary">
            Carbs {Math.round(carbsCal)} cal
          </Text>
        </View>
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-1 light:opacity-45"
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
  const [proteinColor, carbsColor, fatColor, fiberColor, primaryColor, primarySubtleColor, progressTrackColor, progressFillColor, progressTrackOverfillColor] = useCSSVariable([
    '--color-macro-protein',
    '--color-macro-carbs',
    '--color-macro-fat',
    '--color-macro-fiber',
    '--color-accent-primary',
    '--color-accent-subtle',
    '--color-progress-track',
    '--color-progress-fill',
    '--color-progress-overfill',
  ]) as [string, string, string, string, string, string, string, string, string];

  const macroColors = { protein: proteinColor, carbs: carbsColor, fat: fatColor };

  // Render content based on state
  const renderContent = () => {
    // No server configured
    if (!isConnectionLoading && !isConnected) {
      return (
        <View className="flex-1 items-center justify-center p-8 light:shadow-sm">
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
        <View className="flex-1 items-center justify-center p-8 light:shadow-sm">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-text-muted text-base mt-4">Loading summary...</Text>
        </View>
      );
    }

    // Error state
    if (isError || isPreferencesError || isMeasurementsError) {
      return (
        <View className="flex-1 items-center justify-center p-8 light:shadow-sm">
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
        <View className="bg-surface-primary rounded-xl p-4 mb-4 light:shadow-sm">
          <View className="flex-row items-center justify-center">
            {/* Left: Consumed */}
            <SideStat
              label="Consumed"
              value={summary.caloriesConsumed}
            />

            {/* Center: Progress Ring */}
            <View className="relative items-center justify-center mx-2">
              <View>
                <ProgressRing
                  progress={progressPercent}
                  size={160}
                  strokeWidth={12}
                  color={progressFillColor}
                  backgroundColor={progressTrackColor}
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
            overfillColor={progressTrackOverfillColor}
          />
          <MacroCard
            label="Carbs"
            consumed={summary.carbs.consumed}
            goal={summary.carbs.goal}
            color={carbsColor}
            overfillColor={progressTrackOverfillColor}
          />
          <MacroCard
            label="Fat"
            consumed={summary.fat.consumed}
            goal={summary.fat.goal}
            color={fatColor}
            overfillColor={progressTrackOverfillColor}
          />
          <MacroCard
            label="Fiber"
            consumed={summary.fiber.consumed}
            goal={summary.fiber.goal}
            color={fiberColor}
            overfillColor={progressTrackOverfillColor}
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
