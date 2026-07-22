import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { InventoryRow, ProfileRow, ImpactLogRow, DisposalRow, FoodCategory, Condition } from './types';
import { FOOD_BY_NAME } from './foodCatalog';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useInventory() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('expires_at', { ascending: true });
    if (error) setError(error.message);
    else setItems(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = useCallback(async (input: {
    name: string; category?: FoodCategory; quantity?: number; unit?: string;
    shelfLifeDays?: number; freshnessScore?: number; notes?: string;
  }) => {
    const food = FOOD_BY_NAME[input.name.toLowerCase()];
    const category = input.category ?? food?.category ?? 'other';
    const shelf = input.shelfLifeDays ?? food?.shelfLifeDays ?? 7;
    const expires = new Date(Date.now() + shelf * 86400000).toISOString();
    
    // OPTIMISTIC UPDATE
    const tempId = 'temp-' + Math.random().toString(36).substr(2, 9);
    const tempRow: InventoryRow = {
      id: tempId, name: input.name, category, added_at: new Date().toISOString(),
      quantity: input.quantity ?? 1, unit: input.unit ?? 'unit',
      expires_at: expires, freshness_score: input.freshnessScore ?? 1, notes: input.notes ?? null
    };
    
    setItems((prev) => [...prev, tempRow].sort((a, b) =>
      (a.expires_at ?? '').localeCompare(b.expires_at ?? '')));

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        name: input.name, category, quantity: input.quantity ?? 1, unit: input.unit ?? 'unit',
        expires_at: expires, freshness_score: input.freshnessScore ?? 1, notes: input.notes ?? null,
      })
      .select().single();
      
    if (error) { 
      setError(error.message); 
      // Revert optimistic update on failure
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      return null; 
    }
    
    // Replace temp row with real data from DB
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== tempId);
      return [...filtered, data as InventoryRow].sort((a, b) =>
        (a.expires_at ?? '').localeCompare(b.expires_at ?? ''));
    });
    
    if (shelf > 2) {
      const notifyDate = new Date(Date.now() + (shelf - 2) * 86400000);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Your ${input.name} is expiring soon! 🥗`,
            body: `Use it in the next 2 days to prevent food waste. Tap to find a recipe.`,
            data: { screen: 'recipes' },
          },
          trigger: { type: 'date', date: notifyDate } as Notifications.DateTriggerInput,
        });
      } catch (e) {
        console.warn('Notification scheduling failed', e);
      }
    }

    return data as InventoryRow;
  }, []);

  const remove = useCallback(async (id: string) => {
    // OPTIMISTIC UPDATE
    setItems((prev) => prev.filter((i) => i.id !== id));
    
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) { 
      setError(error.message); 
      // Rollback would go here if we kept a backup of the items, but for now we'll just reload
      load();
      return; 
    }
  }, [load]);

  return { items, loading, error, reload: load, add, remove };
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('user_profile').select('*').limit(1).maybeSingle();
    setProfile(data as ProfileRow | null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const upsert = useCallback(async (p: Omit<ProfileRow, 'id' | 'updated_at'>) => {
    const existing = profile?.id;
    if (existing) {
      const { data, error } = await supabase
        .from('user_profile').update({ ...p, updated_at: new Date().toISOString() })
        .eq('id', existing).select().single();
      if (!error) setProfile(data as ProfileRow);
    } else {
      const { data, error } = await supabase
        .from('user_profile').insert({ ...p }).select().single();
      if (!error) setProfile(data as ProfileRow);
    }
  }, [profile]);

  return { profile, loading, reload: load, upsert };
}

export function useImpact() {
  const [log, setLog] = useState<ImpactLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('impact_log').select('*').order('created_at', { ascending: false });
    setLog((data as ImpactLogRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logEvent = useCallback(async (event_type: ImpactLogRow['event_type'], co2e_kg: number, payload: Record<string, any>) => {
    const { data } = await supabase
      .from('impact_log').insert({ event_type, co2e_kg: +co2e_kg.toFixed(2), payload })
      .select().single();
    if (data) setLog((prev) => [data as ImpactLogRow, ...prev]);
  }, []);

  return { log, loading, reload: load, logEvent };
}

export function useDisposals() {
  const [disposals, setDisposals] = useState<DisposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('disposal_events').select('*').order('created_at', { ascending: false });
    setDisposals((data as DisposalRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logDisposal = useCallback(async (item_name: string, category: FoodCategory, reason: DisposalRow['reason']) => {
    const { data } = await supabase
      .from('disposal_events').insert({ item_name, category, reason })
      .select().single();
    if (data) setDisposals((prev) => [data as DisposalRow, ...prev]);
  }, []);

  return { disposals, loading, reload: load, logDisposal };
}

// Feature 5: Recipe favorites
export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('recipe_favorites').select('*').order('created_at', { ascending: false });
    setFavs((data ?? []).map((r: any) => r.recipe_name));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = useCallback(async (recipeName: string) => {
    if (favs.includes(recipeName)) {
      await supabase.from('recipe_favorites').delete().eq('recipe_name', recipeName);
      setFavs((prev) => prev.filter((f) => f !== recipeName));
    } else {
      await supabase.from('recipe_favorites').insert({ recipe_name: recipeName });
      setFavs((prev) => [recipeName, ...prev]);
    }
  }, [favs]);

  return { favs, loading, toggle, isFav: (name: string) => favs.includes(name) };
}

// Feature 3: Shopping list
export interface ShoppingItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  checked: boolean;
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: false });
    setItems((data as ShoppingItem[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addItems = useCallback(async (newItems: { item_name: string; category: string; quantity: number }[]) => {
    if (newItems.length === 0) return;
    const { data, error } = await supabase.from('shopping_list').insert(newItems).select();
    if (error) {
      console.error('Shopping list insert error:', error);
      alert('Database error: ' + error.message + ' (Did you run ids_feature_expansion.sql?)');
    }
    if (data) setItems((prev) => [...(data as ShoppingItem[]), ...prev]);
  }, []);

  const toggleCheck = useCallback(async (id: string, checked: boolean) => {
    await supabase.from('shopping_list').update({ checked }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from('shopping_list').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearChecked = useCallback(async () => {
    const checked = items.filter((i) => i.checked);
    for (const item of checked) {
      await supabase.from('shopping_list').delete().eq('id', item.id);
    }
    setItems((prev) => prev.filter((i) => !i.checked));
  }, [items]);

  return { items, loading, addItems, toggleCheck, remove, clearChecked };
}

// Feature 2: Meal plan
export interface MealPlanEntry {
  id: string;
  day_of_week: number;
  meal_type: string;
  recipe_name: string;
  planned_date: string | null;
}

export function useMealPlan() {
  const [plan, setPlan] = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('meal_plan').select('*').order('day_of_week', { ascending: true });
    setPlan((data as MealPlanEntry[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = useCallback(async (day_of_week: number, meal_type: string, recipe_name: string) => {
    const today = new Date();
    today.setDate(today.getDate() + day_of_week);
    const { data, error } = await supabase
      .from('meal_plan').insert({ day_of_week, meal_type, recipe_name, planned_date: today.toISOString().slice(0, 10) })
      .select().single();
    if (error) {
      console.error('Meal plan insert error:', error);
      alert('Database error: ' + error.message);
    }
    if (data) setPlan((prev) => [...prev, data as MealPlanEntry]);
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from('meal_plan').delete().eq('id', id);
    setPlan((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { plan, loading, add, remove };
}

// Feature 7: Weekly goals
export function useWeeklyGoals() {
  const [goals, setGoals] = useState({ target_meals: 5, target_co2e: 10, id: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('weekly_goals').select('*').limit(1).maybeSingle();
    if (data) setGoals(data as any);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = useCallback(async (target_meals: number, target_co2e: number) => {
    if (goals.id) {
      const { data } = await supabase
        .from('weekly_goals').update({ target_meals, target_co2e, updated_at: new Date().toISOString() })
        .eq('id', goals.id).select().single();
      if (data) setGoals(data as any);
    } else {
      const { data } = await supabase
        .from('weekly_goals').insert({ target_meals, target_co2e }).select().single();
      if (data) setGoals(data as any);
    }
  }, [goals]);

  return { goals, loading, update };
}

// Feature 15: XP state
export function useXp() {
  const [xp, setXp] = useState(0);
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('xp_state').select('*').limit(1).maybeSingle();
    if (data) { setXp((data as any).total_xp); setId((data as any).id); }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addXp = useCallback(async (amount: number) => {
    const newXp = xp + amount;
    if (id) {
      const { data } = await supabase.from('xp_state').update({ total_xp: newXp, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (data) setXp((data as any).total_xp);
    } else {
      const { data } = await supabase.from('xp_state').insert({ total_xp: newXp }).select().single();
      if (data) { setXp((data as any).total_xp); setId((data as any).id); }
    }
  }, [xp, id]);

  return { xp, loading, addXp };
}
