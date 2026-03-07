import { z } from "zod";

// GET /api/meal-types — response item
export const mealTypeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: z.number().nullable(),
  user_id: z.string().nullable(),
  created_at: z.string().nullable(),
  is_visible: z.boolean(),
  show_in_quick_log: z.boolean().nullable(),
});

export const mealTypesResponseSchema = z.array(mealTypeResponseSchema);

// POST /api/meal-types — request body
export const createMealTypeRequestSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().nullable().optional(),
});

// PUT /api/meal-types/:id — request body
export const updateMealTypeRequestSchema = z.object({
  name: z.string().min(1).optional(),
  sort_order: z.number().nullable().optional(),
  is_visible: z.boolean().optional(),
  show_in_quick_log: z.boolean().nullable().optional(),
});

export type MealTypeResponse = z.infer<typeof mealTypeResponseSchema>;
export type CreateMealTypeRequest = z.infer<typeof createMealTypeRequestSchema>;
export type UpdateMealTypeRequest = z.infer<typeof updateMealTypeRequestSchema>;
