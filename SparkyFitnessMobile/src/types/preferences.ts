export interface UserPreferences {
  bmr_algorithm?: string;
  body_fat_algorithm?: string;
  include_bmr_in_net_calories?: boolean;  // <-- here                                                                                                                                                        
  weight_unit?: 'kg' | 'lbs';
  distance_unit?: 'km' | 'miles';
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | string;
  energy_unit?: 'kcal' | 'kJ';
  fat_breakdown_algorithm?: string;
  mineral_calculation_algorithm?: string;
  vitamin_calculation_algorithm?: string;
  sugar_calculation_algorithm?: string;
}