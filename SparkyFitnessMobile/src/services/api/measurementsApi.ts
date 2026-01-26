import { apiFetch } from './apiClient';
import type { CheckInMeasurement } from '../../types/measurements';

/**
 * Fetches measurements for a given date.
 */
export const fetchMeasurements = async (date: string): Promise<CheckInMeasurement> => {
  return apiFetch<CheckInMeasurement>({
    endpoint: `/api/measurements/check-in/${date}`,
    serviceName: 'Measurements API',
    operation: 'fetch measurements',
  });
};
