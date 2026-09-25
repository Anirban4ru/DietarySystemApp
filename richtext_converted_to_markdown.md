ROLE

You are a senior React Native / Expo / Supabase engineer taking "Nourish"

(DietarySystemApp) from a working prototype to a genuinely production-ready

app usable as a live demo. This is a single, ordered work session. Work

through the phases in order. Do not skip Phase 1 or Phase 2 for anything

else, they are blocking.

HARD CONSTRAINTS, NON-NEGOTIABLE

1\. Zero budget. Do not introduce any paid service, paid tier of a service,

or anything requiring a credit card (no Stripe, no RevenueCat billing,

no paid Supabase tier, no paid monitoring). Supabase free tier, Expo

free tier, and free/open-source packages only.

2\. Absolute per-user data isolation. Every single table that stores

user-generated data (inventory\_items, user\_profile, impact\_log,

disposal\_events, recipe\_favorites, meal\_plan, shopping\_list,

weekly\_goals, xp\_state, and any new table you create) must have a

user\_id column with a foreign key to auth.users, RLS enabled, and

policies that only allow auth.uid() = user\_id for select, insert,

update, and delete. No table may have USING (true) or a policy open

to the anon role for reading or writing another user's rows. Every

single user gets their own private pantry, shopping list, meal plan,

goals, and XP, with zero shared or merged state between accounts.

Verify this at the end by creating two test accounts and confirming

neither can see or affect the other's data under any circumstance,

including direct table queries with the anon key.

3\. Do not remove or regress any feature that currently works. Every

change must be tested against the existing flow before moving on.

4\. Preserve the current visual identity (palette, typography, the sage

green branding) unless a change is explicitly listed below.

PHASE 1: SECURE THE BACKEND

1\. Audit supabase/migrations and confirm which tables still have open

anon/authenticated policies with USING (true) or no user\_id column

(currently recipe\_favorites, meal\_plan, shopping\_list, weekly\_goals,

xp\_state are exposed this way, in addition to whatever else you find).

2\. Write a new migration that adds user\_id uuid references auth.users

not null to every exposed table, drops the open policies, and adds

strict per-user policies as described in constraint 2 above. Handle

backfill correctly: do not rely on auth.uid() as a column default

during a migration run by the service role, since that returns null

outside a request context. If any table already has rows with no

safe way to assign an owner, truncate that table in the migration

instead of leaving orphaned rows, since this is a pre-launch demo

app with no real users yet.

3\. Update every hook in lib/hooks.ts to explicitly filter and insert

with the current user's id (do not rely on RLS alone, be explicit

in the query too, so the code is self-documenting and safe even if

a policy is ever misconfigured later).

4\. Move every Gemini API call out of the client. Create a Supabase Edge

Function (or one function per AI task, your call) that receives the

request body, reads the Gemini key from a Supabase secret (never

EXPO\_PUBLIC\_\*), calls Gemini server side, and returns the result.

Update lib/ai.ts to call your own Edge Function instead of Google's

API directly. Remove EXPO\_PUBLIC\_GEMINI\_API\_KEY from the app entirely

after this is done. Add a basic per-user rate limit or request cap

inside the Edge Function (even a simple in-memory or table-based

counter) so one account cannot exhaust the free Gemini quota for

everyone.

5\. Confirm the Edge Function itself checks the caller's Supabase auth

token and rejects unauthenticated requests, so the AI endpoints are

not an open proxy either.

PHASE 2: FIX KNOWN BUGS

1\. In lib/hooks.ts, replace every bare alert(...) call with the existing

useToast() system used elsewhere in the app. alert() is a browser

global and will crash on native.

2\. In lib/rda.ts, implement the empty diabetes branch in computeRDA:

lower the carbohydrate percentage of TDEE (for example drop from 45

percent to roughly 40 percent and redistribute to protein and fat)

and adjust fiber upward, following standard general dietary guidance.

Add a short comment that this is general guidance, not medical advice.

3\. Fix addXp and any other read-then-write counters (xp\_state,

weekly\_goals) to be atomic. Create Postgres functions

(SECURITY DEFINER, scoped to the authenticated caller's own row)

that do the increment inside the database in one statement, and call

those via supabase.rpc(...) instead of read-modify-write from the

client.

4\. Fix clearChecked in useShoppingList to delete all checked items in

a single .delete().in('id', \[...ids\]) call instead of one request

per item.

5\. Add zod (or a similarly lightweight schema validator) and validate

every parsed AI JSON response against a strict schema before it

touches app state. On validation failure, show a friendly toast and

fall back gracefully, never let a malformed AI response reach the UI

unchecked.

6\. Add a single top-level ErrorBoundary wrapping the app in \_layout.tsx

with a friendly recovery screen (a message plus a "reload" button),

so no uncaught render error ever produces a blank white screen.

PHASE 3: MAKE IT FEEL INSTANT, ZERO LAG

1\. Replace every ScrollView + .map() list of dynamic items (inventory,

shopping list, recipes, meal plan, impact log) with FlatList (or

FlashList from Shopify if you prefer, it is free and drops in

easily). Provide stable keyExtractor, extract each row into its own

memoized component with React.memo, and make sure inline arrow

functions are not recreated every render for onPress handlers, use

useCallback.

2\. Audit every screen for expensive work running on every render

(nutrition sums, optimizer scoring, sorting). Wrap these in useMemo

keyed on their actual dependencies so they only recompute when the

underlying data changes.

3\. The recipe optimizer (lib/optimizer.ts) runs synchronous scoring

across all templates on the JS thread. Wrap calls to optimizeRecipes

in InteractionManager.runAfterInteractions or defer them off the

initial render path so tab switches and taps never stutter while it

runs.

4\. Verify every tab transition, modal open/close, and checkbox toggle

feels immediate. Where a network round trip is required, the UI must

already reflect the optimistic result (the inventory add/remove hook

already does this correctly, apply the same optimistic pattern to

shopping list, meal plan, and favorites, which currently wait for

the network response before updating state).

5\. Profile app startup: fonts, session check, and push registration all

currently gate the splash screen sequentially. Where safe, parallelize

independent startup work so cold start time is minimized.

PHASE 4: SEAMLESS OTA UPDATES

1\. Confirm app.json's runtimeVersion policy and the EAS update channel

configuration are correctly set up for the intended release channel

(for example separate "preview" and "production" channels).

2\. Implement an update check using expo-updates: on app foreground (not

just cold start), silently check for an available update, download

it in the background, and either apply it automatically on the next

natural app restart or show a small, dismissible "Update available,

tap to refresh" banner rather than a blocking modal. Handle the

offline case and the check-failed case silently, never surface a

raw error to the user for this.

3\. Make sure this never interrupts an in-progress action (do not

prompt to update while someone is mid-form on the add-item or

add-recipe screens).

PHASE 5: NOTIFICATIONS THAT ACTUALLY WORK

1\. Fix registerForPushNotifications to call

Notifications.getExpoPushTokenAsync with the correct EAS projectId

and return the real token, not a placeholder string.

2\. Create a push\_tokens table (user\_id, token, updated\_at), RLS locked

to the owning user only, and save the token there after registration.

3\. For truly dynamic, server-triggered notifications (for example

"an item you added is expiring tomorrow", computed server side

rather than only locally scheduled), add a Supabase scheduled Edge

Function (cron, free on the free tier within its execution limits)

that runs once a day, queries items expiring soon per user, and

calls the free Expo Push API to notify each user with their token.

Keep the existing local daily reminders for meal planning and

shopping as they are, they are working correctly.

4\. Make sure notification permission is requested after the user has

completed login and reached the main app, not on cold start before

sign-in, and only if it hasn't already been asked.

PHASE 6: FREE VS PRO, DEMO MODE

There is currently no tier system in the app at all, you are building

this from scratch. This is a demo of the concept, not a real payment

integration, do not add Stripe, RevenueCat billing, or any App/Play

Store in-app purchase flow.

1\. Add a subscription\_tier column to user\_profile (values 'free' or

'pro', default 'free').

2\. Create a single source of truth, lib/entitlements.ts, exporting a

useEntitlement() hook that reads the current user's tier and exposes

simple booleans/limits (for example canUseAiChef, maxPantryItems,

maxSavedRecipes, hasAdvancedImpactAnalytics, hasUnlimitedMealPlanning).

3\. Gate real features behind it with a sensible, honest split, for

example: free tier gets manual recipe browsing, a capped pantry size,

basic weekly goals, and local reminders; pro tier unlocks the AI

Chef recipe generation, receipt scanning, unlimited pantry and

shopping list size, the deeper impact analytics view, and priority

(server-triggered) expiry notifications. Use judgment on the exact

split but make free tier genuinely useful on its own and pro tier

a clear, tangible step up, not an artificial paywall on something

trivial.

4\. On the Profile screen, add a clearly labeled "Nourish Pro" section

showing the current tier, what pro unlocks, and, since this is a

demo, a "Simulate Pro (Demo)" toggle that flips the user's own

subscription\_tier for demonstration purposes only. Label it visibly

as a demo toggle, not a real purchase flow.

5\. Anywhere a free-tier user hits a gated feature, show a clean,

on-brand upsell prompt explaining what pro unlocks, rather than

silently disabling the control.

PHASE 7: HAPTICS, AUDIT AND CENTRALIZE

Haptics are already used in several screens but are scattered inline

and not guarded for platform.

1\. Create lib/haptics.ts exporting a few named helpers (tap, success,

warning, error, selection) that wrap expo-haptics calls in a

try/catch and a Platform.OS !== 'web' guard, since haptics do not

exist on web and should never throw there.

2\. Replace all direct Haptics.\* calls across the app with these helpers.

3\. Audit where haptics fire and trim anything excessive (for example,

confirm it only fires on meaningful actions: completing a task,

deleting something, a successful save, a tab or selection change,

an error) rather than on every minor interaction. Add haptic

feedback anywhere meaningful it is currently missing (successful

AI recipe generation, marking an item consumed, hitting a weekly

goal, leveling up).

PHASE 8: UI/UX POLISH, MAKE IT FEEL LIKE A HABIT

1\. Add loading skeletons (simple shimmer placeholders are fine, no

paid library needed) for every screen's initial data fetch instead

of a blank view or spinner-only state.

2\. Add a proper empty state (illustration or icon, short friendly copy,

a clear call to action) for an empty pantry, empty shopping list,

empty meal plan, and no favorites yet, each guiding the user to the

next action.

3\. Do an accessibility pass: every touchable has a minimum 44x44 hit

area, meaningful accessibilityLabel on icon-only buttons, and text

contrast checked against the current theme in both light and dark

mode.

4\. Review lib/theme.ts usage for consistency, make sure spacing,

radius, and type styles are used everywhere rather than one-off

magic numbers scattered in screen files.

5\. Strengthen the existing streak and XP system's visibility on the

home tab (index.tsx) so daily engagement is front and center the

moment the app opens, this is the core "make it a habit" lever you

already have half-built with the levels and weekly goals system,

just needs to be more prominent and rewarding on open.

6\. Split components/ui.tsx and the larger screen files

(recipes.tsx, inventory.tsx, profile.tsx) into smaller, focused

files under components/ and per-screen subfolders where it

meaningfully improves readability, without changing behavior.

DEFINITION OF DONE

Before considering this complete, verify all of the following:

1\. Two separate test accounts, created fresh, share zero visible data

under any tab, and a direct anon-key query against any table

returns nothing for a user who is not the owner.

2\. No API key of any kind appears in the client bundle or any

EXPO\_PUBLIC\_\* variable.

3\. Every list screen scrolls smoothly with 50+ items with no visible

frame drops.

4\. A fresh app install successfully receives and applies an OTA update

without any user-visible error.

5\. Free and pro tier produce visibly different, working experiences

from the same login flow, switchable via the demo toggle.

6\. No alert() calls remain anywhere in the codebase.

7\. Work through this as a series of small, reviewable changes, and

summarize what changed and why at each phase boundary rather than

one giant unexplained diff at the end.