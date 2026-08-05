# Nourish - Dietary System App

Nourish is a comprehensive Dietary System app designed to help users track their inventory, plan meals, monitor their impact, and gamify their healthy habits.

## Features
- **Pantry Tracking**: Keep a logged inventory of all your household items and food.
- **Smart Meal Planning**: Generate AI-powered meal suggestions based on what you currently have in your pantry using **Gemini 3.5 Flash**.
- **Impact Log & XP**: Earn experience points by hitting weekly goals and making sustainable dietary choices.
- **Recipe Favorites**: Save your favorite meals to your profile.
- **Secure Data**: Built with Supabase, enforcing strict Row Level Security (RLS) to ensure all data is 100% private and isolated per user.

## Recent Updates
- Upgraded AI Edge Function to **Gemini 3.5 Flash** for superior and faster AI-generated meal suggestions.
- Finalized Android Production APK generation via Expo/EAS.
- Set up OTA updates infrastructure.
- Hardened database security with 9 comprehensive Row Level Security (RLS) policies.

## How to Set up AI (For Developers)
The app relies on a Supabase Edge function. If you clone this repository, you must supply a Gemini API Key to your Supabase project:
```bash
npx supabase secrets set GEMINI_API_KEY="your-api-key-here"
```

## Download
Check the **Releases** tab on GitHub to download the latest Production APK (`v1.0.0`) for Android devices.
