export type FoodCategory =
  | 'leafy_green'
  | 'root'
  | 'fruit'
  | 'dairy'
  | 'protein'
  | 'grain'
  | 'allium'
  | 'fungi'
  | 'other';

export interface FoodItem {
  name: string;
  category: FoodCategory;
  shelfLifeDays: number; // typical whole shelf life at room temp
  fragility: number; // 0..1, 1 = highly fragile micronutrient decay
  // per 100g
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  // micronutrients (selected, %RDA per 100g)
  vitC: number;
  vitA: number;
  calcium: number;
  iron: number;
  potassium: number;
  // CO2e kg per kg of food (approx lifecycle)
  co2ePerKg: number;
  // therapeutic flags — conditions this item is contraindicated for
  avoid?: Condition[];
  // safe substitute name (same category) for contraindicated items
  substitute?: string;
}

export type Condition = 'hypertension' | 'diabetes' | 'celiac' | 'lactose_intolerant';

export interface InventoryRow {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  added_at: string;
  expires_at: string | null;
  freshness_score: number;
  notes: string | null;
}

export interface ProfileRow {
  id: string;
  name?: string;
  age: number;
  sex: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  conditions: Condition[];
  updated_at: string;
}

export interface ImpactLogRow {
  id: string;
  event_type: 'rescue_meal' | 'item_discarded' | 'item_consumed';
  co2e_kg: number;
  payload: Record<string, any>;
  created_at: string;
}

export interface DisposalRow {
  id: string;
  item_name: string;
  category: FoodCategory;
  reason: 'expired' | 'spoiled' | 'overpurchased' | 'other';
  created_at: string;
}
