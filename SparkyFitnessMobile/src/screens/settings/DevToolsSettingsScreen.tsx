import React from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DevTools from '../../components/DevTools';
import ScreenHeader from '../../components/ScreenHeader';

const DevToolsSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Developer Tools" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="p-4">
          <DevTools />
        </View>
      </ScrollView>
    </View>
  );
};

export default DevToolsSettingsScreen;
