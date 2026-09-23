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
  openPaywallFor: (feature?: ProEntitlement) => void;
  closePaywall: () => void;
  subscriptionPlan: 'annual' | 'monthly' | 'none';
  trialDaysLeft: number;
  restorePurchases: () => Promise<boolean>;
}

const ProContext = createContext<ProContextType>({
  isPro: false,
  setIsPro: () => {},
  unlockPro: async () => {},
  resetPro: async () => {},
  scansRemaining: 3,
  consumeScan: async () => true,
  useScan: async () => true,
  hasEntitlement: () => false,
  activeFeaturePaywall: null,
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
  };

  const closePaywall = () => {
    setActiveFeaturePaywall(null);
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

const STARTER_GUEST_INVENTORY: InventoryRow[] = [
  {
    id: 'starter-1',
    name: 'Toor Dal',
    category: 'protein',
    quantity: 500,
    unit: 'g',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 180 * 86400000).toISOString(),
    freshness_score: 0.99,
    notes: 'Dal tadka, dal fry, sambar — perfect base',
  },
  {
    id: 'starter-2',
    name: 'Aloo',
    category: 'root',
    quantity: 6,
    unit: 'pcs',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 20 * 86400000).toISOString(),
    freshness_score: 0.92,
    notes: 'Sabzi, paratha, or dum aloo',
  },
  {
    id: 'starter-3',
    name: 'Palak',
    category: 'leafy_green',
    quantity: 1,
    unit: 'bunch',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    freshness_score: 0.72,
    notes: 'Palak paneer or palak dal — use soon!',
  },
  {
    id: 'starter-4',
    name: 'Paneer',
    category: 'dairy',
    quantity: 200,
    unit: 'g',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    freshness_score: 0.85,
    notes: 'Fresh from local dairy — use within 3 days',
  },
  {
    id: 'starter-5',
    name: 'Chawal',
    category: 'grain',
    quantity: 1,
    unit: 'kg',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    freshness_score: 0.99,
    notes: 'Basmati rice — biryani, pulao or simple chawal dal',
  },
  {
    id: 'starter-6',
    name: 'Tamatar',
    category: 'fruit',
    quantity: 4,
    unit: 'pcs',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    freshness_score: 0.88,
    notes: 'Gravy base for most Indian curries',
  },
  {
    id: 'starter-7',
    name: 'Pyaaz',
    category: 'allium',
    quantity: 5,
    unit: 'pcs',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 25 * 86400000).toISOString(),
    freshness_score: 0.95,
    notes: 'Essential for every sabzi and curry',
  },
  {
    id: 'starter-8',
    name: 'Dahi',
    category: 'dairy',
    quantity: 400,
    unit: 'g',
    added_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    freshness_score: 0.90,
    notes: 'Raita, kadhi, or marinade for tandoori',
  },
];

export function useInventory() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_inventory');
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          setItems(STARTER_GUEST_INVENTORY);
          await AsyncStorage.setItem('@nourish_guest_inventory', JSON.stringify(STARTER_GUEST_INVENTORY));
        }
      } catch {
        setItems(STARTER_GUEST_INVENTORY);
      }
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

const DEFAULT_GUEST_PROFILE: ProfileRow = {
  id: 'guest-profile-id',
  name: 'Chef',
  age: 28,
  sex: 'female',
  weight_kg: 68,
  height_cm: 168,
  activity_level: 'moderate',
  conditions: [],
  updated_at: new Date().toISOString(),
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileRow | null>(DEFAULT_GUEST_PROFILE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_profile');
        if (stored) {
          setProfile(JSON.parse(stored));
        } else {
          setProfile(DEFAULT_GUEST_PROFILE);
        }
      } catch {
        setProfile(DEFAULT_GUEST_PROFILE);
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
    setProfile(data as ProfileRow | null);
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

    if (favs.includes(recipeName)) {
      await supabase
        .from('recipe_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_name', recipeName);
      setFavs((prev) => prev.filter((f) => f !== recipeName));
    } else {
      await supabase
        .from('recipe_favorites')
        .insert({ user_id: user.id, recipe_name: recipeName });
      setFavs((prev) => [recipeName, ...prev]);
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

const STARTER_GUEST_SHOPPING: ShoppingItem[] = [
  { id: 'shop-1', item_name: 'Extra Virgin Olive Oil', category: 'pantry', quantity: 1, checked: false },
  { id: 'shop-2', item_name: 'Rolled Oats', category: 'grain', quantity: 1, checked: false },
  { id: 'shop-3', item_name: 'Chia Seeds', category: 'other', quantity: 1, checked: false },
  { id: 'shop-4', item_name: 'Fresh Lemons', category: 'fresh_produce', quantity: 4, checked: false },
];

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(STARTER_GUEST_SHOPPING);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_shopping');
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          setItems(STARTER_GUEST_SHOPPING);
          await AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(STARTER_GUEST_SHOPPING));
        }
      } catch {
        setItems(STARTER_GUEST_SHOPPING);
      }
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
    if (!user) {
      setItems((prev) => {
        const updated = prev.map((i) => (i.id === id ? { ...i, checked } : i));
        AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

    await supabase
      .from('shopping_list')
      .update({ checked })
      .eq('id', id)
      .eq('user_id', user.id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
  }, []);

  const remove = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        AsyncStorage.setItem('@nourish_guest_shopping', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

    await supabase
      .from('shopping_list')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    setItems((prev) => prev.filter((i) => i.id !== id));
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

    const checked = items.filter((i) => i.checked);
    for (const item of checked) {
      await supabase
        .from('shopping_list')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id);
    }
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

const STARTER_GUEST_PLAN: MealPlanEntry[] = [
  { id: 'plan-1', day_of_week: 0, meal_type: 'Lunch', recipe_name: 'Green Power Bowl', planned_date: new Date().toISOString().slice(0, 10) },
  { id: 'plan-2', day_of_week: 0, meal_type: 'Dinner', recipe_name: 'Tuscan White Bean Soup', planned_date: new Date().toISOString().slice(0, 10) },
  { id: 'plan-3', day_of_week: 1, meal_type: 'Dinner', recipe_name: 'Rescue Stir-Fry', planned_date: null },
  { id: 'plan-4', day_of_week: 2, meal_type: 'Breakfast', recipe_name: 'Overnight Chia Oats', planned_date: null },
  { id: 'plan-5', day_of_week: 2, meal_type: 'Dinner', recipe_name: 'Chicken & Herb Quinoa', planned_date: null },
  { id: 'plan-6', day_of_week: 3, meal_type: 'Lunch', recipe_name: 'Mediterranean Salad', planned_date: null },
  { id: 'plan-7', day_of_week: 4, meal_type: 'Dinner', recipe_name: 'Roasted Root Plate', planned_date: null },
];

export function useMealPlan() {
  const [plan, setPlan] = useState<MealPlanEntry[]>(STARTER_GUEST_PLAN);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      try {
        const stored = await AsyncStorage.getItem('@nourish_guest_meal_plan');
        if (stored) {
          setPlan(JSON.parse(stored));
        } else {
          setPlan(STARTER_GUEST_PLAN);
          await AsyncStorage.setItem('@nourish_guest_meal_plan', JSON.stringify(STARTER_GUEST_PLAN));
        }
      } catch {
        setPlan(STARTER_GUEST_PLAN);
      }
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
    const tempEntry: MealPlanEntry = {
      id: 'plan-' + Math.random().toString(36).substr(2, 9),
      day_of_week,
      meal_type,
      recipe_name,
      planned_date: dateStr,
    };

    if (!user) {
      setPlan((prev) => {
        const updated = [...prev, tempEntry];
        AsyncStorage.setItem('@nourish_guest_meal_plan', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

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
    if (error) {
      console.warn('Meal plan insert error:', error);
    }
    if (data) setPlan((prev) => [...prev, data as MealPlanEntry]);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPlan((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        AsyncStorage.setItem('@nourish_guest_meal_plan', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return;
    }

    await supabase
      .from('meal_plan')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
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

    const newXp = xp + amount;
    if (id) {
      const { data } = await supabase
        .from('xp_state')
        .update({ total_xp: newXp, user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) setXp((data as any).total_xp);
    } else {
      const { data } = await supabase
        .from('xp_state')
        .insert({ user_id: user.id, total_xp: newXp })
        .select()
        .single();
      if (data) {
        setXp((data as any).total_xp);
        setId((data as any).id);
      }
    }
  }, [xp, id]);

  return { xp, loading, addXp };
}


