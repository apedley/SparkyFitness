import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SummaryScreenProps {
  navigation: { navigate: (screen: string) => void };
}

const SummaryScreen: React.FC<SummaryScreenProps> = () => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header Bar */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
        <Text className="text-2xl font-bold text-text">Daily Summary</Text>
      </View>

      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-text-muted text-lg text-center">
          Coming soon
        </Text>
        <Text className="text-text-muted text-sm text-center mt-2">
          Charts for calories, macronutrients, and exercise will appear here.
        </Text>
      </View>
    </View>
  );
};

export default SummaryScreen;
