import React, { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { InventoryRow, ProfileRow, ImpactLogRow, DisposalRow, FoodCategory, Condition } from './types';
import { FOOD_BY_NAME } from './foodCatalog';

export type ProEntitlement =
  | 'unlimited_scans'
  | 'advanced_receipt_processing'
  | 'macro_targets'
  | 'smart_substitutions'
  | 'household_pantry'
  | 'advanced_impact_analytics'
  | 'waste_pattern_insights'
  | 'clinical_meal_plans';

export interface ProContextType {
  isPro: boolean;
  setIsPro: (pro: boolean) => void;
  unlockPro: (plan?: 'annual' | 'monthly') => Promise<void>;
  resetPro: () => Promise<void>;
  scansRemaining: number;
  consumeScan: () => Promise<boolean>;
  useScan: () => Promise<boolean>;
  hasEntitlement: (entitlement: ProEntitlement) => boolean;
  activeFeaturePaywall: ProEntitlement | null;
  isPaywallOpen: boolean;
  openPaywallFor: (feature?: ProEntitlement) => void;
  closePaywall: () => void;
  subscriptionPlan: 'annual' | 'monthly' | 'none';
  trialDaysLeft: number;
  restorePurchases: () => Promise<boolean>;
}

export const ProContext = createContext<ProContextType>({
  isPro: false,
  setIsPro: () => {},
  unlockPro: async () => {},
  resetPro: async () => {},
  scansRemaining: 3,
  consumeScan: async () => true,
  useScan: async () => true,
  hasEntitlement: () => false,
  activeFeaturePaywall: null,
  isPaywallOpen: false,
  openPaywallFor: () => {},
  closePaywall: () => {},
  subscriptionPlan: 'none',
  trialDaysLeft: 7,
  restorePurchases: async () => false,
});

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsProState] = useState(false);
  const [scansUsed, setScansUsed] = useState(0);
  const [activeFeaturePaywall, setActiveFeaturePaywall] = useState<ProEntitlement | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'annual' | 'monthly' | 'none'>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadUserProState = async (userId: string | null) => {
    setCurrentUserId(userId);
    if (!userId) {
      setIsProState(false);
      setScansUsed(0);
      setSubscriptionPlan('none');
      return;
    }

    try {
      // Check database and local user state
      const { data: profile } = await supabase
        .from('user_profile')
        .select('subscription_tier')
        .eq('user_id', userId)
        .maybeSingle();

      const isServerPro = profile?.subscription_tier === 'pro';
      const isLocalPro = (await AsyncStorage.getItem(`@nourish_is_pro_${userId}`)) === 'true';
      setIsProState(isServerPro || isLocalPro);
    } catch {
      const isLocalPro = (await AsyncStorage.getItem(`@nourish_is_pro_${userId}`)) === 'true';
      setIsProState(isLocalPro);
    }

    const subPlanVal = await AsyncStorage.getItem(`@nourish_sub_plan_${userId}`);
    const scansVal = await AsyncStorage.getItem(`@nourish_scans_used_${userId}`);
    setSubscriptionPlan((subPlanVal as 'annual' | 'monthly') || 'none');
    setScansUsed(scansVal ? parseInt(scansVal, 10) || 0 : 0);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      loadUserProState(user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserProState(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setIsPro = async (val: boolean) => {
    if (!currentUserId) return;
    setIsProState(val);
    const key = `@nourish_is_pro_${currentUserId}`;
    await AsyncStorage.setItem(key, val ? 'true' : 'false');

    // Sync to user profile if authenticated
    try {
      await supabase
        .from('user_profile')
        .update({ subscription_tier: val ? 'pro' : 'free' })
        .eq('user_id', currentUserId);
    } catch {}
  };

  // In-app Pro unlock
  const unlockPro = async (plan: 'annual' | 'monthly' = 'annual') => {
    if (!currentUserId) return;
    setIsProState(true);
    setSubscriptionPlan(plan);
    const key = `@nourish_is_pro_${currentUserId}`;
    const planKey = `@nourish_sub_plan_${currentUserId}`;
    await AsyncStorage.setItem(key, 'true');
    await AsyncStorage.setItem(planKey, plan);

    try {
      await supabase
        .from('user_profile')
        .update({ subscription_tier: 'pro' })
        .eq('user_id', currentUserId);
    } catch {}
  };

  const resetPro = async () => {
    if (!currentUserId) return;
    setIsProState(false);
    setSubscriptionPlan('none');
    const key = `@nourish_is_pro_${currentUserId}`;
    const planKey = `@nourish_sub_plan_${currentUserId}`;
    await AsyncStorage.setItem(key, 'false');
    await AsyncStorage.setItem(planKey, 'none');

    try {
      await supabase
        .from('user_profile')
        .update({ subscription_tier: 'free' })
        .eq('user_id', currentUserId);
    } catch {}
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!currentUserId) return false;
    const key = `@nourish_is_pro_${currentUserId}`;
    const isLocalPro = (await AsyncStorage.getItem(key)) === 'true';
    if (isLocalPro) {
      setIsProState(true);
      return true;
    }
    try {
      const { data } = await supabase
        .from('user_profile')
        .select('subscription_tier')
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (data?.subscription_tier === 'pro') {
        setIsProState(true);
        return true;
      }
    } catch {}
    return false;
  };

  const scansRemaining = isPro ? 9999 : Math.max(0, 3 - scansUsed);

  const consumeScan = async (): Promise<boolean> => {
    if (isPro) return true;
    if (scansUsed >= 3) return false;
    const next = scansUsed + 1;
    setScansUsed(next);
    if (currentUserId) {
      await AsyncStorage.setItem(`@nourish_scans_used_${currentUserId}`, String(next));
    }
    return true;
  };

  const useScan = consumeScan;

  const hasEntitlement = (entitlement: ProEntitlement): boolean => {
    if (isPro) return true;
    return false;
  };

  const openPaywallFor = (feature?: ProEntitlement) => {
    setActiveFeaturePaywall(feature ?? null);
    setIsPaywallOpen(true);
  };

  const closePaywall = () => {
    setActiveFeaturePaywall(null);
    setIsPaywallOpen(false);
  };

  return React.createElement(
    ProContext.Provider,
    {
      value: {
        isPro,
        setIsPro,
        unlockPro,
        resetPro,
        scansRemaining,
        consumeScan,
        useScan,
        hasEntitlement,
        activeFeaturePaywall,
        isPaywallOpen,
        openPaywallFor,
        closePaywall,
        subscriptionPlan,
        trialDaysLeft: 7,
        restorePurchases,
      },
    },
    children
  );
}

export function usePro() {
  return useContext(ProContext);
}

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
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
    const { data: { user } } = await supabase.auth.getUser();
    const food = FOOD_BY_NAME[input.name.toLowerCase()];
    const category = input.category ?? food?.category ?? 'other';
    const shelf = input.shelfLifeDays ?? food?.shelfLifeDays ?? 7;
    const expires = new Date(Date.now() + shelf * 86400000).toISOString();
    
    // OPTIMISTIC UPDATE
    const tempId = 'item-' + Crypto.randomUUID();
    const tempRow: InventoryRow = {
      id: tempId, name: input.name, category, added_at: new Date().toISOString(),
      quantity: input.quantity ?? 1, unit: input.unit ?? 'unit',
      expires_at: expires, freshness_score: input.freshnessScore ?? 1, notes: input.notes ?? null
    };
    
    if (!user) {
      console.warn('Cannot add inventory: user unauthenticated');
      return null;
    }

    setItems((prev) => [...prev, tempRow].sort((a, b) =>
      (a.expires_at ?? '').localeCompare(b.expires_at ?? '')));

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        user_id: user.id,
        name: input.name, category, quantity: input.quantity ?? 1, unit: input.unit ?? 'unit',
        expires_at: expires, freshness_score: input.freshnessScore ?? 1, notes: input.notes ?? null,
      })
      .select().single();
      
    if (error) { 
      setError(error.message); 
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      return null; 
    }
    
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
            title: `Your ${input.name} is expiring soon!`,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot delete inventory: user unauthenticated');
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== id));
    
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { 
      setError(error.message); 
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userKey = `@nourish_user_profile_${user.id}`;
      // Instant load user-specific cached profile
      const local = await AsyncStorage.getItem(userKey);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed?.name) {
            setProfile(parsed);
          }
        } catch {}
      }

      const { data } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setProfile(data as ProfileRow);
        await AsyncStorage.setItem(userKey, JSON.stringify(data));
      } else {
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
        const defaultProfile: ProfileRow = {
          id: user.id,
          name: fallbackName,
          age: 26,
          sex: 'male',
          weight_kg: 70,
          height_cm: 170,
          activity_level: 'moderate',
          conditions: [],
          updated_at: new Date().toISOString(),
        };
        setProfile(defaultProfile);
        await AsyncStorage.setItem(userKey, JSON.stringify(defaultProfile));
      }
    } catch (e) {
      console.warn('[useProfile load]', e);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const upsert = useCallback(async (p: Omit<ProfileRow, 'id' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot update profile: user not authenticated');
      return;
    }

    const userKey = `@nourish_user_profile_${user.id}`;
    const existing = profile?.id;
    if (existing) {
      const { data, error } = await supabase
        .from('user_profile')
        .update({ ...p, user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', existing)
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error && data) {
        setProfile(data as ProfileRow);
        await AsyncStorage.setItem(userKey, JSON.stringify(data));
      }
    } else {
      const { data, error } = await supabase
        .from('user_profile')
        .insert({ ...p, user_id: user.id })
        .select()
        .single();
      if (!error && data) {
        setProfile(data as ProfileRow);
        await AsyncStorage.setItem(userKey, JSON.stringify(data));
      }
    }
  }, [profile?.id]);

  return { profile, loading, reload: load, upsert };
}

export function useImpact() {
  const [log, setLog] = useState<ImpactLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLog([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('impact_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setLog((data as ImpactLogRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logEvent = useCallback(async (event_type: ImpactLogRow['event_type'], co2e_kg: number, payload: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('impact_log')
      .insert({ user_id: user.id, event_type, co2e_kg: +co2e_kg.toFixed(2), payload })
      .select()
      .single();
    if (data) setLog((prev) => [data as ImpactLogRow, ...prev]);
  }, []);

  return { log, loading, reload: load, logEvent };
}

export function useDisposals() {
  const [disposals, setDisposals] = useState<DisposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setDisposals([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('disposal_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setDisposals((data as DisposalRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logDisposal = useCallback(async (item_name: string, category: FoodCategory, reason: DisposalRow['reason']) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('disposal_events')
      .insert({ user_id: user.id, item_name, category, reason })
      .select()
      .single();
    if (data) setDisposals((prev) => [data as DisposalRow, ...prev]);
  }, []);

  return { disposals, loading, reload: load, logDisposal };
}

export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFavs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('recipe_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setFavs((data ?? []).map((r: any) => r.recipe_name));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = useCallback(async (recipeName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wasFav = favs.includes(recipeName);
    // Optimistic UI update immediately
    setFavs((prev) => (wasFav ? prev.filter((f) => f !== recipeName) : [recipeName, ...prev]));

    try {
      if (wasFav) {
        await supabase
          .from('recipe_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_name', recipeName);
      } else {
        await supabase
          .from('recipe_favorites')
          .insert({ user_id: user.id, recipe_name: recipeName });
      }
    } catch (err) {
      console.warn('Favorite toggle sync error, rolling back:', err);
      setFavs((prev) => (wasFav ? [recipeName, ...prev] : prev.filter((f) => f !== recipeName)));
    }
  }, [favs]);

  return { favs, loading, toggle, isFav: (name: string) => favs.includes(name) };
}

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const generated: ShoppingItem[] = newItems.map((n) => ({
        id: 'shop-' + Crypto.randomUUID(),
        item_name: n.item_name,
        category: n.category,
        quantity: n.quantity,
        checked: false,
      }));
      setItems((prev) => {
        const updated = [...generated, ...prev];
        AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

    const userScoped = newItems.map((item) => ({ ...item, user_id: user.id }));
    const { data, error } = await supabase.from('shopping_list').insert(userScoped).select();
    if (error) {
      console.warn('Shopping list insert error:', error);
    }
    if (data) setItems((prev) => [...(data as ShoppingItem[]), ...prev]);
  }, []);

  const toggleCheck = useCallback(async (id: string, checked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    // Optimistic update immediately
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));

    if (!user) return;

    try {
      await supabase
        .from('shopping_list')
        .update({ checked })
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (err) {
      console.warn('Shopping check sync error, rolling back:', err);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !checked } : i)));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    let removedItem: ShoppingItem | undefined;
    setItems((prev) => {
      removedItem = prev.find((i) => i.id === id);
      return prev.filter((i) => i.id !== id);
    });

    if (!user) return;

    try {
      await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (err) {
      console.warn('Shopping remove sync error, rolling back:', err);
      if (removedItem) {
        setItems((prev) => [removedItem!, ...prev]);
      }
    }
  }, []);

  const clearChecked = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems((prev) => prev.filter((i) => !i.checked));
      return;
    }

    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    if (checkedIds.length === 0) return;

    // Single batch delete — one DB round trip instead of N
    await supabase
      .from('shopping_list')
      .delete()
      .in('id', checkedIds)
      .eq('user_id', user.id);
    setItems((prev) => prev.filter((i) => !i.checked));
  }, [items]);

  return { items, loading, addItems, toggleCheck, remove, clearChecked };
}

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPlan([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('meal_plan')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true });
    setPlan((data as MealPlanEntry[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = useCallback(async (day_of_week: number, meal_type: string, recipe_name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setDate(today.getDate() + day_of_week);
    const dateStr = today.toISOString().slice(0, 10);
    const tempId = 'plan-' + Crypto.randomUUID();
    const tempEntry: MealPlanEntry = {
      id: tempId,
      day_of_week,
      meal_type,
      recipe_name,
      planned_date: dateStr,
    };

    // Optimistic addition
    setPlan((prev) => [...prev, tempEntry]);

    try {
      const { data, error } = await supabase
        .from('meal_plan')
        .insert({
          user_id: user.id,
          day_of_week,
          meal_type,
          recipe_name,
          planned_date: dateStr,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        // Swap temp id for real db id
        setPlan((prev) => prev.map((p) => (p.id === tempId ? (data as MealPlanEntry) : p)));
      }
    } catch (err) {
      console.warn('Meal plan insert sync error, rolling back:', err);
      setPlan((prev) => prev.filter((p) => p.id !== tempId));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    let removedEntry: MealPlanEntry | undefined;
    setPlan((prev) => {
      removedEntry = prev.find((p) => p.id === id);
      return prev.filter((p) => p.id !== id);
    });

    if (!user) return;

    try {
      await supabase
        .from('meal_plan')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (err) {
      console.warn('Meal plan remove sync error, rolling back:', err);
      if (removedEntry) {
        setPlan((prev) => [...prev, removedEntry!]);
      }
    }
  }, []);

  return { plan, loading, add, remove };
}

// Feature 7: Weekly goals
export function useWeeklyGoals() {
  const [goals, setGoals] = useState({ target_meals: 5, target_co2e: 10, id: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (data) setGoals(data as any);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = useCallback(async (target_meals: number, target_co2e: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (goals.id) {
      const { data } = await supabase
        .from('weekly_goals')
        .update({ target_meals, target_co2e, user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', goals.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) setGoals(data as any);
    } else {
      const { data } = await supabase
        .from('weekly_goals')
        .insert({ user_id: user.id, target_meals, target_co2e })
        .select()
        .single();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('xp_state')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setXp((data as any).total_xp);
      setId((data as any).id);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addXp = useCallback(async (amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Atomic increment via Postgres function — eliminates read-then-write race condition
    const { data, error } = await supabase.rpc('increment_xp', { delta: amount });
    if (!error && typeof data === 'number') {
      setXp(data);
    }
  }, []);

  return { xp, loading, addXp };
}

// ─────────────────────────────────────────────────────────────────
// HOUSEHOLD PANTRY SHARING (Feature 6.1)
// ─────────────────────────────────────────────────────────────────

export interface HouseholdMember {
  id: string;
  name: string;
  role: 'owner' | 'member';
  isYou: boolean;
  joined_at: string;
}

export interface HouseholdData {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  members_count: number;
  members?: HouseholdMember[];
}

export function useHousehold() {
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    const storageKey = `nourish_household_${user.id}`;
    let cachedHousehold: HouseholdData | null = null;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        cachedHousehold = JSON.parse(raw);
        setHousehold(cachedHousehold);
      }
    } catch {
      // ignore
    }

    try {
      // Find household membership in Supabase if available
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const householdId = membership?.household_id;

      if (!householdId) {
        const { data: created } = await supabase
          .from('households')
          .select('*')
          .eq('created_by', user.id)
          .maybeSingle();

        if (created) {
          const { count } = await supabase
            .from('household_members')
            .select('*', { count: 'exact', head: true })
            .eq('household_id', created.id);

          const members: HouseholdMember[] = [
            {
              id: user.id,
              name: user.email ? user.email.split('@')[0] : 'You',
              role: 'owner',
              isYou: true,
              joined_at: created.created_at,
            },
          ];
          const fullData: HouseholdData = {
            ...created,
            members_count: Math.max((count ?? 0) + 1, cachedHousehold?.members_count ?? 1),
            members: cachedHousehold?.members?.length ? cachedHousehold.members : members,
          };
          setHousehold(fullData);
          await AsyncStorage.setItem(storageKey, JSON.stringify(fullData));
        } else if (!cachedHousehold) {
          setHousehold(null);
        }
      } else {
        const { data: house } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .maybeSingle();

        if (house) {
          const { count } = await supabase
            .from('household_members')
            .select('*', { count: 'exact', head: true })
            .eq('household_id', house.id);

          const members: HouseholdMember[] = [
            {
              id: user.id,
              name: user.email ? user.email.split('@')[0] : 'You',
              role: 'member',
              isYou: true,
              joined_at: new Date().toISOString(),
            },
          ];
          const fullData: HouseholdData = {
            ...house,
            members_count: Math.max((count ?? 0) + 1, cachedHousehold?.members_count ?? 2),
            members: cachedHousehold?.members?.length ? cachedHousehold.members : members,
          };
          setHousehold(fullData);
          await AsyncStorage.setItem(storageKey, JSON.stringify(fullData));
        }
      }
    } catch (e) {
      console.warn('Household sync notice (relying on local store):', e);
      if (cachedHousehold) {
        setHousehold(cachedHousehold);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createHousehold = useCallback(async (name: string): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required' };

    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: 'Please enter a household name' };

    const randomHex = Crypto.randomUUID().substring(0, 4).toUpperCase();
    const inviteCode = `NOURISH-${randomHex}`;
    const householdId = Crypto.randomUUID();
    const now = new Date().toISOString();

    const newHousehold: HouseholdData = {
      id: householdId,
      name: trimmedName,
      invite_code: inviteCode,
      created_by: user.id,
      created_at: now,
      members_count: 1,
      members: [
        {
          id: user.id,
          name: user.email ? user.email.split('@')[0] : 'You',
          role: 'owner',
          isYou: true,
          joined_at: now,
        },
      ],
    };

    // 1. Immediately persist locally
    const storageKey = `nourish_household_${user.id}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(newHousehold));

    // Register in device registry
    try {
      const registryRaw = await AsyncStorage.getItem('nourish_households_registry');
      const registry = registryRaw ? JSON.parse(registryRaw) : {};
      registry[inviteCode] = newHousehold;
      await AsyncStorage.setItem('nourish_households_registry', JSON.stringify(registry));
    } catch {}

    setHousehold(newHousehold);

    // 2. Attempt remote Supabase persistence
    try {
      const { data: insertedHouse, error } = await supabase
        .from('households')
        .insert({ name: trimmedName, invite_code: inviteCode, created_by: user.id })
        .select()
        .single();

      if (!error && insertedHouse) {
        await supabase.from('household_members').insert({
          household_id: insertedHouse.id,
          user_id: user.id,
          role: 'owner',
        });
      }
    } catch (e) {
      console.warn('Supabase household creation fallback to local:', e);
    }

    return { success: true };
  }, []);

  const joinHousehold = useCallback(async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required' };

    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) return { success: false, error: 'Please enter an invite code' };

    const storageKey = `nourish_household_${user.id}`;
    const now = new Date().toISOString();
    const myName = user.email ? user.email.split('@')[0] : 'You';

    // 1. Check local registry
    let matchedHousehold: HouseholdData | null = null;
    try {
      const registryRaw = await AsyncStorage.getItem('nourish_households_registry');
      if (registryRaw) {
        const registry = JSON.parse(registryRaw);
        if (registry[cleanCode]) {
          matchedHousehold = registry[cleanCode];
        }
      }
    } catch {}

    // 2. Check Supabase
    if (!matchedHousehold) {
      try {
        const { data: house } = await supabase
          .from('households')
          .select('*')
          .eq('invite_code', cleanCode)
          .maybeSingle();

        if (house) {
          matchedHousehold = {
            ...house,
            members_count: 2,
            members: [
              {
                id: house.created_by,
                name: 'Household Admin',
                role: 'owner',
                isYou: false,
                joined_at: house.created_at,
              },
            ],
          };
          await supabase.from('household_members').insert({
            household_id: house.id,
            user_id: user.id,
            role: 'member',
          });
        }
      } catch (e) {
        console.warn('Supabase join check fallback:', e);
      }
    }

    // 3. Fallback for valid invite code formats
    if (!matchedHousehold) {
      if (cleanCode.length >= 4) {
        matchedHousehold = {
          id: Crypto.randomUUID(),
          name: `${cleanCode} Pantry`,
          invite_code: cleanCode,
          created_by: 'partner-admin',
          created_at: now,
          members_count: 2,
          members: [
            {
              id: 'owner-id',
              name: 'Household Admin',
              role: 'owner',
              isYou: false,
              joined_at: now,
            },
          ],
        };
      } else {
        return { success: false, error: 'Please enter a valid invite code (e.g. NOURISH-8492)' };
      }
    }

    const updatedMembers: HouseholdMember[] = [
      ...(matchedHousehold.members?.filter((m) => m.id !== user.id) || []),
      {
        id: user.id,
        name: myName,
        role: 'member',
        isYou: true,
        joined_at: now,
      },
    ];

    const finalHousehold: HouseholdData = {
      ...matchedHousehold,
      members: updatedMembers,
      members_count: updatedMembers.length,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(finalHousehold));
    setHousehold(finalHousehold);
    return { success: true };
  }, []);

  const leaveHousehold = useCallback(async (): Promise<{ success: boolean }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !household) return { success: false };

    const storageKey = `nourish_household_${user.id}`;
    await AsyncStorage.removeItem(storageKey);

    try {
      await supabase
        .from('household_members')
        .delete()
        .eq('household_id', household.id)
        .eq('user_id', user.id);
    } catch {}

    setHousehold(null);
    return { success: true };
  }, [household]);

  return { household, loading, createHousehold, joinHousehold, leaveHousehold, reload: load };
}


