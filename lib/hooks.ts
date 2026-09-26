import React, { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
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
    const isProVal = await AsyncStorage.getItem(`@nourish_is_pro_${userId}`);
    const subPlanVal = await AsyncStorage.getItem(`@nourish_sub_plan_${userId}`);
    const scansVal = await AsyncStorage.getItem(`@nourish_scans_used_${userId}`);

    setIsProState(isProVal === 'true');
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

  const setIsPro = (val: boolean) => {
    setIsProState(val);
    if (currentUserId) {
      AsyncStorage.setItem(`@nourish_is_pro_${currentUserId}`, val ? 'true' : 'false');
    }
  };

  const unlockPro = async (plan: 'annual' | 'monthly' = 'annual') => {
    setIsProState(true);
    setSubscriptionPlan(plan);
    if (currentUserId) {
      await AsyncStorage.setItem(`@nourish_is_pro_${currentUserId}`, 'true');
      await AsyncStorage.setItem(`@nourish_sub_plan_${currentUserId}`, plan);
    }
  };

  const resetPro = async () => {
    setIsProState(false);
    setSubscriptionPlan('none');
    if (currentUserId) {
      await AsyncStorage.setItem(`@nourish_is_pro_${currentUserId}`, 'false');
      await AsyncStorage.setItem(`@nourish_sub_plan_${currentUserId}`, 'none');
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!currentUserId) return false;
    const val = await AsyncStorage.getItem(`@nourish_is_pro_${currentUserId}`);
    if (val === 'true') {
      setIsProState(true);
      const plan = (await AsyncStorage.getItem(`@nourish_sub_plan_${currentUserId}`)) as 'annual' | 'monthly' | null;
      setSubscriptionPlan(plan || 'annual');
      return true;
    }
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
    const tempId = 'item-' + Math.random().toString(36).substr(2, 9);
    const tempRow: InventoryRow = {
      id: tempId, name: input.name, category, added_at: new Date().toISOString(),
      quantity: input.quantity ?? 1, unit: input.unit ?? 'unit',
      expires_at: expires, freshness_score: input.freshnessScore ?? 1, notes: input.notes ?? null
    };
    
    // GUEST MODE STORAGE
    if (!user) {
      setItems((prev) => {
        const updated = [...prev, tempRow].sort((a, b) =>
          (a.expires_at ?? '').localeCompare(b.expires_at ?? ''));
        AsyncStorage.setItem('@nourish_guest_inventory', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return tempRow;
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
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== id);
        AsyncStorage.setItem('@nourish_guest_inventory', JSON.stringify(filtered)).catch(() => {});
        return filtered;
      });
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
    // Instant zero-lag local profile load
    try {
      const local = await AsyncStorage.getItem('@nourish_user_profile');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed?.name) {
          setProfile(parsed);
        }
      }
    } catch {}

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const local = await AsyncStorage.getItem('@nourish_user_profile');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed?.name) {
              setProfile(parsed);
              setLoading(false);
              return;
            }
          } catch {}
        }
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setProfile(data as ProfileRow);
        await AsyncStorage.setItem('@nourish_user_profile', JSON.stringify(data));
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
        await AsyncStorage.setItem('@nourish_user_profile', JSON.stringify(defaultProfile));
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
      const updated: ProfileRow = {
        id: profile?.id || 'guest-profile-id',
        ...p,
        updated_at: new Date().toISOString(),
      };
      setProfile(updated);
      AsyncStorage.setItem('@nourish_guest_profile', JSON.stringify(updated)).catch(() => {});
      return;
    }

    const existing = profile?.id;
    if (existing) {
      const { data, error } = await supabase
        .from('user_profile')
        .update({ ...p, user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', existing)
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error) setProfile(data as ProfileRow);
    } else {
      const { data, error } = await supabase
        .from('user_profile')
        .insert({ ...p, user_id: user.id })
        .select()
        .single();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_impact');
        setLog(stored ? JSON.parse(stored) : []);
      } catch {
        setLog([]);
      }
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('impact_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLog((data as ImpactLogRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logEvent = useCallback(async (event_type: ImpactLogRow['event_type'], co2e_kg: number, payload: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const newEntry: ImpactLogRow = {
      id: 'impact-' + Math.random().toString(36).substr(2, 9),
      event_type,
      co2e_kg: +co2e_kg.toFixed(2),
      payload,
      created_at: new Date().toISOString(),
    };

    if (!user) {
      setLog((prev) => {
        const updated = [newEntry, ...prev];
        AsyncStorage.setItem('@nourish_guest_impact', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

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
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_disposals');
        setDisposals(stored ? JSON.parse(stored) : []);
      } catch {
        setDisposals([]);
      }
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('disposal_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDisposals((data as DisposalRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logDisposal = useCallback(async (item_name: string, category: FoodCategory, reason: DisposalRow['reason']) => {
    const { data: { user } } = await supabase.auth.getUser();
    const newEntry: DisposalRow = {
      id: 'disp-' + Math.random().toString(36).substr(2, 9),
      item_name,
      category,
      reason,
      created_at: new Date().toISOString(),
    };

    if (!user) {
      setDisposals((prev) => {
        const updated = [newEntry, ...prev];
        AsyncStorage.setItem('@nourish_guest_disposals', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

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
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_favorites');
        setFavs(stored ? JSON.parse(stored) : []);
      } catch {
        setFavs([]);
      }
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
    if (!user) {
      setFavs((prev) => {
        const updated = prev.includes(recipeName)
          ? prev.filter((f) => f !== recipeName)
          : [...prev, recipeName];
        AsyncStorage.setItem('@nourish_guest_favorites', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

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
        id: 'shop-' + Math.random().toString(36).substr(2, 9),
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

    if (!user) {
      AsyncStorage.getItem('@nourish_guest_shopping').then((raw) => {
        const prev: ShoppingItem[] = raw ? JSON.parse(raw) : [];
        const updated = prev.map((i) => (i.id === id ? { ...i, checked } : i));
        AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(updated)).catch(() => {});
      }).catch(() => {});
      return;
    }

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

    if (!user) {
      AsyncStorage.getItem('@nourish_guest_shopping').then((raw) => {
        const prev: ShoppingItem[] = raw ? JSON.parse(raw) : [];
        const updated = prev.filter((i) => i.id !== id);
        AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(updated)).catch(() => {});
      }).catch(() => {});
      return;
    }

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
      setItems((prev) => {
        const updated = prev.filter((i) => !i.checked);
        AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
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
    const today = new Date();
    today.setDate(today.getDate() + day_of_week);
    const dateStr = today.toISOString().slice(0, 10);
    const tempId = 'plan-' + Math.random().toString(36).substr(2, 9);
    const tempEntry: MealPlanEntry = {
      id: tempId,
      day_of_week,
      meal_type,
      recipe_name,
      planned_date: dateStr,
    };

    // Optimistic addition
    setPlan((prev) => [...prev, tempEntry]);

    if (!user) {
      AsyncStorage.getItem('@nourish_guest_meal_plan').then((raw) => {
        const prev = raw ? JSON.parse(raw) : [];
        AsyncStorage.setItem('@nourish_guest_meal_plan', JSON.stringify([...prev, tempEntry])).catch(() => {});
      }).catch(() => {});
      return;
    }

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

    if (!user) {
      AsyncStorage.getItem('@nourish_guest_meal_plan').then((raw) => {
        const prev: MealPlanEntry[] = raw ? JSON.parse(raw) : [];
        AsyncStorage.setItem('@nourish_guest_meal_plan', JSON.stringify(prev.filter((p) => p.id !== id))).catch(() => {});
      }).catch(() => {});
      return;
    }

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


