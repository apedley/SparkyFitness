import React, { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import BottomSheetPicker from '../components/BottomSheetPicker';
import ScreenHeader from '../components/ScreenHeader';
import {
  getLogs,
  clearLogs,
  getLogFilter,
  setLogFilter,
  LOG_FILTER_OPTIONS,
} from '../services/LogService';
import type { LogEntry, LogFilter } from '../services/LogService';

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const LogScreen: React.FC = () => {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<LogFilter>('no_debug');

  const LOG_LIMIT = 30;

  const loadLogs = async (newOffset = 0, append = false): Promise<void> => {
    const storedLogs = await getLogs(newOffset, LOG_LIMIT);
    if (append) {
      setLogs(prevLogs => [...prevLogs, ...storedLogs]);
    } else {
      setLogs(storedLogs);
    }
    setOffset(newOffset + storedLogs.length);
    setHasMore(storedLogs.length === LOG_LIMIT);
  };

  const loadFilter = async (): Promise<void> => {
    const filter = await getLogFilter();
    setCurrentFilter(filter);
  };

  useFocusEffect(
    useCallback(() => {
      loadLogs();
      loadFilter();
    }, [])
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleLoadMore = (): void => {
    if (hasMore) {
      loadLogs(offset, true);
    }
  };

  const handleClearLogs = (): void => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            await clearLogs();
            setLogs([]);
            setOffset(0);
            setHasMore(true);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleFilterChange = async (filter: LogFilter): Promise<void> => {
    if (filter && filter !== currentFilter) {
      try {
        await setLogFilter(filter);
        setCurrentFilter(filter);
        loadLogs(0, false);
      } catch (error) {
        Alert.alert('Error', 'Failed to save log filter settings.');
        console.error('Failed to save log filter settings:', error);
      }
    }
  };

  const renderLogEntry = ({ item }: { item: LogEntry }) => (
    <Text className="text-text-primary text-xs font-mono px-4 py-0.5" selectable>
      {formatTimestamp(item.timestamp)} [{item.status}] [{item.source}] {item.message}
    </Text>
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Logs" onBack={() => navigation.goBack()} />

      <View className="flex-row justify-between items-center px-4 py-2">
        <BottomSheetPicker
          value={currentFilter}
          options={LOG_FILTER_OPTIONS}
          onSelect={handleFilterChange}
          title="Log Filter"
          containerStyle={{ flex: 1, maxWidth: '50%' }}
        />
        <TouchableOpacity
          className="bg-bg-danger rounded-lg py-3 px-6"
          onPress={handleClearLogs}
        >
          <Text className="text-white text-base font-bold">Clear All Logs</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogEntry}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              className="bg-accent-primary rounded-lg p-3 items-center mt-4 mx-4"
              onPress={handleLoadMore}
            >
              <Text className="text-white text-base font-bold">Load more logs</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <Text className="text-text-muted text-center py-8">No logs to display</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
};

export default LogScreen;
