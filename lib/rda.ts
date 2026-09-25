import { ProfileRow, Condition } from './types';

export interface RDA {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  vitC: number; // mg
  vitA: number; // mcg
  calcium: number; // mg
  iron: number; // mg
  potassium: number; // mg
  sodium: number; // mg upper
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Mifflin-St Jeor BMR
export function computeBMR(p: Pick<ProfileRow, 'weight_kg' | 'height_cm' | 'age' | 'sex'>): number {
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function computeTDEE(p: ProfileRow): number {
  const bmr = computeBMR(p);
  const factor = ACTIVITY_FACTORS[p.activity_level] ?? 1.55;
  return Math.round(bmr * factor);
}

// RDA base values (adult) with sex adjustments.
export function computeRDA(p: ProfileRow): RDA {
  const tdee = computeTDEE(p);
  const proteinPerKg = p.activity_level === 'sedentary' ? 0.8 : p.activity_level === 'light' ? 1.0 : p.activity_level === 'moderate' ? 1.2 : 1.6;
  let proteinG = Math.round(p.weight_kg * proteinPerKg);
  let fatG = Math.round((tdee * 0.3) / 9);
  let carbG = Math.round((tdee * 0.45) / 4);
  const fiberG = p.age > 50 ? 28 : 30;

  let vitC = p.sex === 'male' ? 90 : 75;
  let vitA = p.sex === 'male' ? 900 : 700;
  let calcium = p.age > 50 ? 1200 : 1000;
  let iron = p.sex === 'male' ? 8 : (p.age > 50 ? 8 : 18);
  let potassium = 3400;
  let sodium = 2300;

  // Condition adjustments
  if (p.conditions.includes('hypertension')) {
    sodium = 1500; // DASH lower
    potassium = 4700;
  }
  if (p.conditions.includes('diabetes')) {
    // General dietary guidance only — not medical advice.
    // Standard diabetes-friendly approach: reduce carb % to ~40% of TDEE
    // (from 45%), redistribute to protein (25%) and fat (35%) to reduce
    // glycemic load. Increase fiber target for better glucose management.
    carbG = Math.round((tdee * 0.40) / 4);
    proteinG = Math.round((tdee * 0.25) / 4);
    fatG = Math.round((tdee * 0.35) / 9);
    // Bump fiber: 35-38g is recommended for better glycemic control
    // (overrides the age-based default above)
  }
  // Diabetes + higher fiber target
  const fiberTarget = p.conditions.includes('diabetes') ? 38 : fiberG;


  return {
    kcal: tdee,
    proteinG,
    carbG,
    fatG,
    fiberG: fiberTarget,
    vitC,
    vitA,
    calcium,
    iron,
    potassium,
    sodium,
  };
}

export function bmi(p: Pick<ProfileRow, 'weight_kg' | 'height_cm'>): number {
  const m = p.height_cm / 100;
  return +(p.weight_kg / (m * m)).toFixed(1);
}

export function bmiCategory(v: number): string {
  if (v < 18.5) return 'Underweight';
  if (v < 25) return 'Healthy';
  if (v < 30) return 'Overweight';
  return 'Obese';
}

export const CONDITION_LABELS: Record<Condition, string> = {
  hypertension: 'Hypertension',
  diabetes: 'Diabetes',
  celiac: 'Celiac',
  lactose_intolerant: 'Lactose Intolerant',
};
