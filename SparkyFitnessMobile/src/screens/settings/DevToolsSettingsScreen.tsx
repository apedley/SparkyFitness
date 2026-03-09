import React from 'react';
import { ScrollView, View } from 'react-native';
import DevTools from '../../components/DevTools';

const DevToolsSettingsScreen: React.FC = () => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-4">
        <DevTools />
      </View>
    </ScrollView>
  );
};

export default DevToolsSettingsScreen;
