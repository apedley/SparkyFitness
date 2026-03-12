import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addLog,
  getLogs,
  clearLogs,
  pruneLogs,
  setLogFilter,
  getLogFilter,
  getLogSummary,
  _resetForTesting,
  _flushBuffer,
  LogFilter,
} from '../../src/services/LogService';

describe('LogService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    _resetForTesting();
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    _resetForTesting();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('addLog + getLogs', () => {
    test('creates retrievable log entry with default values', async () => {
      await addLog('Test message');

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].status).toBe('INFO');
      expect(logs[0].source).toBe('App');
      expect(logs[0].details).toEqual([]);
      expect(logs[0].id).toEqual(expect.any(String));
      expect(logs[0].id.length).toBeGreaterThan(0);
    });

    test('creates log entry with all specified values', async () => {
      await addLog('Error occurred', 'ERROR', ['detail1', 'detail2']);

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].status).toBe('ERROR');
      expect(logs[0].details).toEqual(['detail1', 'detail2']);
    });

    test('stores logs in descending chronological order (newest first)', async () => {
      await addLog('First');
      await addLog('Second');
      await addLog('Third');

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Third');
      expect(logs[1].message).toBe('Second');
      expect(logs[2].message).toBe('First');
    });

    test('stores all entries regardless of current filter', async () => {
      await setLogFilter('errors_only');

      await addLog('Debug message', 'DEBUG');
      await addLog('Info message', 'INFO');
      await addLog('Error message', 'ERROR');

      // All entries should be stored, regardless of filter
      const logs = await getLogs(0, 30, 'all');
      expect(logs).toHaveLength(3);
    });

    test('log entries have correct structure', async () => {
      await addLog('Test', 'SUCCESS', ['detail']);

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0]).toMatchObject({
        message: 'Test',
        status: 'SUCCESS',
        source: 'App',
        details: ['detail'],
      });
      expect(logs[0].id).toEqual(expect.any(String));
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('each entry gets a unique id', async () => {
      await addLog('First');
      await addLog('Second');

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0].id).not.toBe(logs[1].id);
    });
  });

  describe('source parsing from [Tag] prefix', () => {
    test('extracts source from [Tag] prefix and strips it from message', async () => {
      await addLog('[Background Sync] Starting sync');

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0].source).toBe('Background Sync');
      expect(logs[0].message).toBe('Starting sync');
    });

    test('defaults source to App when no tag present', async () => {
      await addLog('Active server configuration changed.');

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0].source).toBe('App');
      expect(logs[0].message).toBe('Active server configuration changed.');
    });

    test('handles various tag formats', async () => {
      await addLog('[HealthKit] Synced 42 records');
      await addLog('[Auth Service] Session expired');
      await addLog('[API] Request failed');

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0].source).toBe('API');
      expect(logs[0].message).toBe('Request failed');
      expect(logs[1].source).toBe('Auth Service');
      expect(logs[1].message).toBe('Session expired');
      expect(logs[2].source).toBe('HealthKit');
      expect(logs[2].message).toBe('Synced 42 records');
    });

    test('does not parse brackets in the middle of a message', async () => {
      await addLog('Something [not a tag] happened');

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0].source).toBe('App');
      expect(logs[0].message).toBe('Something [not a tag] happened');
    });
  });

  describe('getLogs', () => {
    test('returns empty array when no logs exist', async () => {
      const logs = await getLogs();

      expect(logs).toEqual([]);
    });

    test('when filter is null, uses stored filter', async () => {
      await setLogFilter('all');
      await addLog('Error log', 'ERROR');
      await addLog('Info log', 'INFO');

      const allLogs = await getLogs(0, 30, 'all');
      expect(allLogs).toHaveLength(2);

      const filteredLogs = await getLogs(0, 30, null);
      expect(filteredLogs).toHaveLength(2);

      await setLogFilter('errors_only');
      const errorOnlyLogs = await getLogs(0, 30, null);
      expect(errorOnlyLogs).toHaveLength(1);
      expect(errorOnlyLogs[0].status).toBe('ERROR');
    });

    test('respects filter parameter over stored filter', async () => {
      await addLog('Error log', 'ERROR');
      await addLog('Warning log', 'WARNING');
      await addLog('Info log', 'INFO');

      await setLogFilter('errors_only');

      // Override with filter='all'
      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(3);
    });

    test('applies pagination with offset and limit', async () => {
      for (let i = 1; i <= 5; i++) {
        await addLog(`Log ${i}`);
      }

      const page1 = await getLogs(0, 2);
      const page2 = await getLogs(2, 2);
      const page3 = await getLogs(4, 2);

      expect(page1).toHaveLength(2);
      expect(page1[0].message).toBe('Log 5');
      expect(page1[1].message).toBe('Log 4');

      expect(page2).toHaveLength(2);
      expect(page2[0].message).toBe('Log 3');
      expect(page2[1].message).toBe('Log 2');

      expect(page3).toHaveLength(1);
      expect(page3[0].message).toBe('Log 1');
    });

    test('offset beyond available logs returns empty array', async () => {
      await addLog('Only log');

      const logs = await getLogs(10, 30);

      expect(logs).toEqual([]);
    });

    test('limit larger than available returns all available', async () => {
      await addLog('Log 1');
      await addLog('Log 2');

      const logs = await getLogs(0, 100);

      expect(logs).toHaveLength(2);
    });
  });

  describe('pruneLogs', () => {
    test('removes logs older than specified days', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      await addLog('Old log');

      // Move time forward 5 days
      jest.setSystemTime(new Date('2024-06-20T10:00:00.000Z'));

      await addLog('New log');
      await pruneLogs(3);

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('New log');
    });

    test('preserves logs within retention period', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      await addLog('Recent log');

      // Move time forward only 1 day
      jest.setSystemTime(new Date('2024-06-16T10:00:00.000Z'));

      await pruneLogs(3);

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Recent log');
    });

    test('defaults to 3 days retention', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      await addLog('Old log');

      // Move time forward 4 days
      jest.setSystemTime(new Date('2024-06-19T10:00:00.000Z'));

      await pruneLogs(); // No parameter = default 3 days

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(0);
    });

    test('handles empty log list without error', async () => {
      await expect(pruneLogs()).resolves.toBeUndefined();
    });
  });

  describe('clearLogs', () => {
    test('removes all log entries', async () => {
      await addLog('Log 1');
      await addLog('Log 2');
      await addLog('Log 3');

      await clearLogs();

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toEqual([]);
    });

    test('does not affect log filter setting', async () => {
      await setLogFilter('errors_only');
      await addLog('Some log', 'ERROR');

      await clearLogs();

      const filter = await getLogFilter();
      expect(filter).toBe('errors_only');
    });

    test('succeeds when no logs exist', async () => {
      await expect(clearLogs()).resolves.toBeUndefined();
    });

    test('clears buffered entries that have not been flushed', async () => {
      await addLog('Buffered log');

      // Don't flush — clearLogs should discard the buffer
      await clearLogs();

      const logs = await getLogs(0, 30, 'all');
      expect(logs).toEqual([]);
    });

    test('waits for in-flight flush before removing storage', async () => {
      // Trigger a flush so flushPromise is set
      await addLog('Entry before clear');
      const flushDone = _flushBuffer();

      // clearLogs runs while flush is in progress — should wait for it,
      // then remove storage so the flushed entries don't survive.
      await clearLogs();
      await flushDone;

      const logs = await getLogs(0, 30, 'all');
      expect(logs).toEqual([]);
    });

    test('discards entries requeued by a failed in-flight flush', async () => {
      await addLog('Will be requeued');

      // Make setItem fail once so flushBuffer's catch path restores entries
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(
        new Error('simulated storage failure')
      );

      // Start a flush that will fail and requeue entries into writeBuffer
      const flushDone = _flushBuffer();

      // clearLogs awaits the failed flush, then re-clears writeBuffer
      await clearLogs();
      await flushDone;

      const logs = await getLogs(0, 30, 'all');
      expect(logs).toEqual([]);
    });
  });

  describe('setLogFilter / getLogFilter', () => {
    test('persists log filter setting', async () => {
      await setLogFilter('all');

      const filter = await getLogFilter();

      expect(filter).toBe('all');
    });

    test('returns no_debug as default when no filter set', async () => {
      const filter = await getLogFilter();

      expect(filter).toBe('no_debug');
    });

    test('accepts all valid log filters', async () => {
      const filters: LogFilter[] = ['all', 'no_debug', 'warnings_errors', 'errors_only'];

      for (const f of filters) {
        await setLogFilter(f);
        const result = await getLogFilter();
        expect(result).toBe(f);
      }
    });

    test('invalid log filter preserves previous valid filter', async () => {
      await setLogFilter('warnings_errors');

      // Cast to bypass TypeScript, simulating runtime invalid input
      await setLogFilter('invalid' as LogFilter);

      const filter = await getLogFilter();
      expect(filter).toBe('warnings_errors');
    });

    test('getLogFilter returns cached value without hitting AsyncStorage', async () => {
      await setLogFilter('all');

      // First call populates cache
      await getLogFilter();

      // Clear AsyncStorage — cached value should still be returned
      await AsyncStorage.removeItem('log_filter');

      const filter = await getLogFilter();
      expect(filter).toBe('all');
    });
  });

  describe('getLogSummary', () => {
    test('returns zero counts when no logs exist', async () => {
      const summary = await getLogSummary();

      expect(summary).toEqual({
        DEBUG: 0,
        INFO: 0,
        SUCCESS: 0,
        WARNING: 0,
        ERROR: 0,
      });
    });

    test('counts only logs from today', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      await addLog('Yesterday log', 'SUCCESS');

      // Move to next day
      jest.setSystemTime(new Date('2024-06-16T10:00:00.000Z'));

      await addLog('Today log', 'SUCCESS');

      const summary = await getLogSummary();

      expect(summary.SUCCESS).toBe(1);
    });

    test('counts all statuses to match list display', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      await setLogFilter('all');
      await addLog('Success 1', 'SUCCESS');
      await addLog('Success 2', 'SUCCESS');
      await addLog('Warning', 'WARNING');
      await addLog('Error 1', 'ERROR');
      await addLog('Error 2', 'ERROR');
      await addLog('Error 3', 'ERROR');
      await addLog('Info status', 'INFO');
      await addLog('Debug status', 'DEBUG');

      const summary = await getLogSummary();

      expect(summary.SUCCESS).toBe(2);
      expect(summary.WARNING).toBe(1);
      expect(summary.ERROR).toBe(3);
      expect(summary.INFO).toBe(1);
      expect(summary.DEBUG).toBe(1);
    });

    test('filters by current filter to match getLogs display', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));

      await addLog('Info log', 'SUCCESS');
      await addLog('Warn log', 'WARNING');
      await addLog('Error log', 'ERROR');
      await addLog('Debug log', 'DEBUG');

      // With 'all' filter, all logs should be counted
      await setLogFilter('all');
      let summary = await getLogSummary();
      expect(summary.SUCCESS).toBe(1);
      expect(summary.WARNING).toBe(1);
      expect(summary.ERROR).toBe(1);
      expect(summary.DEBUG).toBe(1);

      // Change to 'errors_only' filter - only error logs should be counted
      await setLogFilter('errors_only');
      summary = await getLogSummary();
      expect(summary.SUCCESS).toBe(0);
      expect(summary.WARNING).toBe(0);
      expect(summary.ERROR).toBe(1);
      expect(summary.DEBUG).toBe(0);
    });
  });

  describe('Migration', () => {
    test('migrates old log entries with level field to new format', async () => {
      // Simulate old format log entries directly in storage
      const oldLogs = [
        { timestamp: new Date().toISOString(), message: 'Debug log', level: 'debug', status: 'INFO', details: [] },
        { timestamp: new Date().toISOString(), message: 'Success log', level: 'info', status: 'SUCCESS', details: [] },
        { timestamp: new Date().toISOString(), message: 'Error log', level: 'error', status: 'ERROR', details: [] },
      ];
      await AsyncStorage.setItem('app_logs', JSON.stringify(oldLogs));

      // getLogs should migrate on read
      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(3);
      // Old debug level should become DEBUG status
      expect(logs[0].status).toBe('DEBUG');
      // Old info level with SUCCESS status should keep SUCCESS
      expect(logs[1].status).toBe('SUCCESS');
      // Old error level should keep ERROR status
      expect(logs[2].status).toBe('ERROR');
    });

    test('migrates old entries without id/source', async () => {
      const oldLogs = [
        { timestamp: new Date().toISOString(), message: '[Background Sync] Data synced', status: 'SUCCESS', details: [] },
        { timestamp: new Date().toISOString(), message: 'Plain message', status: 'INFO', details: [] },
      ];
      await AsyncStorage.setItem('app_logs', JSON.stringify(oldLogs));

      const logs = await getLogs(0, 30, 'all');

      expect(logs).toHaveLength(2);
      // First entry: [Tag] prefix should be parsed into source
      expect(logs[0].source).toBe('Background Sync');
      expect(logs[0].message).toBe('Data synced');
      expect(logs[0].id).toEqual(expect.any(String));
      // Second entry: no tag → source defaults to 'App'
      expect(logs[1].source).toBe('App');
      expect(logs[1].message).toBe('Plain message');
      expect(logs[1].id).toEqual(expect.any(String));
    });

    test('does not re-migrate entries that already have id and source', async () => {
      const existingLogs = [
        { id: 'abc123', timestamp: new Date().toISOString(), source: 'HealthKit', message: 'Synced', status: 'SUCCESS', details: [] },
      ];
      await AsyncStorage.setItem('app_logs', JSON.stringify(existingLogs));

      const logs = await getLogs(0, 30, 'all');

      expect(logs[0].id).toBe('abc123');
      expect(logs[0].source).toBe('HealthKit');
      expect(logs[0].message).toBe('Synced');
    });

    test('migrates old log level preference to new filter format', async () => {
      // Simulate old format log level preference
      await AsyncStorage.setItem('log_level', 'debug');

      const filter = await getLogFilter();

      // 'debug' should migrate to 'all'
      expect(filter).toBe('all');
    });

    test('cleans up old log level key after migration', async () => {
      // Simulate old format log level preference
      await AsyncStorage.setItem('log_level', 'warn');

      await getLogFilter();

      // Old key should be removed
      const oldValue = await AsyncStorage.getItem('log_level');
      expect(oldValue).toBeNull();
    });
  });

  describe('Write buffering', () => {
    test('buffers entries and flushes them to storage on getLogs', async () => {
      await addLog('Buffered entry 1');
      await addLog('Buffered entry 2');

      // Entries should not be in AsyncStorage yet (below flush threshold)
      const rawBefore = await AsyncStorage.getItem('app_logs');
      expect(rawBefore).toBeNull();

      // getLogs flushes before reading
      const logs = await getLogs(0, 30, 'all');
      expect(logs).toHaveLength(2);

      // Now entries should be in AsyncStorage
      const rawAfter = await AsyncStorage.getItem('app_logs');
      expect(rawAfter).not.toBeNull();
      expect(JSON.parse(rawAfter!)).toHaveLength(2);
    });

    test('flushes immediately when buffer hits threshold', async () => {
      // Add enough entries to trigger an immediate flush (FLUSH_THRESHOLD = 20)
      for (let i = 0; i < 20; i++) {
        await addLog(`Entry ${i}`);
      }

      // Should have been flushed to storage already
      const raw = await AsyncStorage.getItem('app_logs');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).length).toBe(20);
    });

    test('explicit _flushBuffer writes buffered entries to storage', async () => {
      await addLog('Manual flush test');

      await _flushBuffer();

      const raw = await AsyncStorage.getItem('app_logs');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toHaveLength(1);
      expect(JSON.parse(raw!)[0].message).toBe('Manual flush test');
    });

    test('_flushBuffer is a no-op when buffer is empty', async () => {
      await _flushBuffer();

      const raw = await AsyncStorage.getItem('app_logs');
      expect(raw).toBeNull();
    });

    test('flush merges with existing entries in storage', async () => {
      // Pre-populate storage with an existing entry
      const existing = [{ id: 'old1', timestamp: '2024-01-01T00:00:00.000Z', source: 'App', message: 'Existing', status: 'INFO', details: [] }];
      await AsyncStorage.setItem('app_logs', JSON.stringify(existing));

      await addLog('New entry');
      await _flushBuffer();

      const raw = await AsyncStorage.getItem('app_logs');
      const logs = JSON.parse(raw!);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('New entry');
      expect(logs[1].message).toBe('Existing');
    });

    test('flush caps total entries at MAX_LOG_ENTRIES', async () => {
      // Pre-populate storage with entries near the cap
      const existing = Array.from({ length: 995 }, (_, i) => ({
        id: `old-${i}`,
        timestamp: new Date().toISOString(),
        source: 'App',
        message: `Old ${i}`,
        status: 'INFO',
        details: [],
      }));
      await AsyncStorage.setItem('app_logs', JSON.stringify(existing));

      // Add 10 new entries
      for (let i = 0; i < 10; i++) {
        await addLog(`New ${i}`);
      }
      await _flushBuffer();

      const raw = await AsyncStorage.getItem('app_logs');
      const logs = JSON.parse(raw!);
      expect(logs.length).toBe(1000);
      // Newest entries should be first
      expect(logs[0].message).toBe('New 9');
    });

    test('_resetForTesting clears all buffer state', async () => {
      await addLog('Should be cleared');

      _resetForTesting();

      // Buffer should be empty — flushing should write nothing
      await _flushBuffer();

      const raw = await AsyncStorage.getItem('app_logs');
      expect(raw).toBeNull();
    });

    test('getLogs waits for in-flight flush even when buffer is empty', async () => {
      await addLog('Entry during flush');

      // Start a flush — this swaps writeBuffer to [] immediately
      const flushDone = _flushBuffer();

      // getLogs runs while flush is in progress. The buffer is empty (already
      // swapped), but getLogs should still wait for the flush to commit.
      const logs = await getLogs(0, 30, 'all');
      await flushDone;

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Entry during flush');
    });
  });
});
