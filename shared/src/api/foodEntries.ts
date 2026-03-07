import { z } from "zod";

// Shared nutrition fields used across response, create, and update schemas
const nutritionFieldsSchema = z.object({
  food_name: z.string().optional(),
  brand_name: z.string().optional(),
  serving_size: z.number().optional(),
  serving_unit: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  saturated_fat: z.number().optional(),
  polyunsaturated_fat: z.number().optional(),
  monounsaturated_fat: z.number().optional(),
  trans_fat: z.number().optional(),
  cholesterol: z.number().optional(),
  sodium: z.number().optional(),
  potassium: z.number().optional(),
  dietary_fiber: z.number().optional(),
  sugars: z.number().optional(),
  vitamin_a: z.number().optional(),
  vitamin_c: z.number().optional(),
  calcium: z.number().optional(),
  iron: z.number().optional(),
  glycemic_index: z.string().optional(),
  custom_nutrients: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

// GET /api/food-entries/by-date/:date — response item
export const foodEntryResponseSchema = nutritionFieldsSchema.extend({
  id: z.string(),
  user_id: z.string().optional(),
  food_id: z.string().nullable().optional(),
  meal_id: z.string().nullable().optional(),
  food_entry_meal_id: z.string().nullable().optional(),
  meal_type: z.string(),
  meal_type_id: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  variant_id: z.string().nullable().optional(),
  entry_date: z.string(),
  meal_plan_template_id: z.string().nullable().optional(),
});

export const foodEntriesResponseSchema = z.array(foodEntryResponseSchema);

// POST /api/food-entries — request body
export const createFoodEntryRequestSchema = nutritionFieldsSchema.extend({
  meal_type_id: z.string(),
  quantity: z.number(),
  unit: z.string(),
  entry_date: z.string(),
  food_id: z.string().optional(),
  variant_id: z.string().nullable().optional(),
  meal_id: z.string().optional(),
});

// PUT /api/food-entries/:id — request body
export const updateFoodEntryRequestSchema = nutritionFieldsSchema.extend({
  quantity: z.number().optional(),
  unit: z.string().optional(),
  meal_type_id: z.string().optional(),
  variant_id: z.string().nullable().optional(),
  entry_date: z.string().optional(),
});

export type FoodEntryResponse = z.infer<typeof foodEntryResponseSchema>;
export type CreateFoodEntryRequest = z.infer<typeof createFoodEntryRequestSchema>;
export type UpdateFoodEntryRequest = z.infer<typeof updateFoodEntryRequestSchema>;
