export interface FoodVariant {
  id: string;
  food_id: string;
  serving_size: string;
  serving_weight: number;
  data: string; // JSON stringified nutritional data
}

export type { FoodEntryResponse as FoodEntry } from '@workspace/shared';