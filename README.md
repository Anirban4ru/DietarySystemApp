<div align="center">

<img src="https://raw.githubusercontent.com/Anirban4ru/DietarySystemApp/main/assets/icon.png?v=3" width="128" height="128" alt="Nourish App Icon" style="border-radius: 28px; box-shadow: 0 8px 24px rgba(2, 51, 45, 0.25);" />

# Nourish: Precision Clinical Nutrition & Dietary Intelligence

**An enterprise-grade, offline-first mobile system designed to bridge clinical dietary guidance, automated kitchen inventory intelligence, and sustainability-driven food rescue.**

[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![EAS Build](https://img.shields.io/badge/EAS-CI%2FCD%20Pipelines-4630EB?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/eas)

<br />

> ⏱️ **Engineering Lifecycle**: Designed, architected, and engineered over **8 months of rigorous, hands-on full-stack mobile development**, spanning clinical dietetics research, cryptographic user data isolation, computer vision integration, and native Android performance tuning.

</div>

---

## 🌟 Executive Summary

Modern household food management suffers from a dual crisis: clinical dietary misalignment (diabetic, hypertensive, and allergen-sensitive consumers consuming contraindicated ingredients) and post-consumer food spoilage causing economic loss and carbon waste.

**Nourish** was engineered as an all-in-one dietary companion that operates at the intersection of **Evidence-Based Medical Nutrition Therapy (MNT)** and **Predictive Supply-Chain Logistics** for the domestic kitchen. Powered by an offline-resilient React Native architecture, dual-layer token caching, and serverless edge intelligence, it transforms raw pantry data into actionable health and sustainability outcomes.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT APPLICATION                               │
│                      (React Native 0.76 • Expo SDK 54)                         │
├──────────────────┬──────────────────┬───────────────────┬───────────────────────┤
│   Presentation   │   Domain Engine  │   State Machine   │     Native Bridge     │
│  - 4-Tab Layout  │  - TDEE / BMR    │  - Reactive Hooks │  - Expo Camera & CV   │
│  - Fluid 120 FPS │  - Clinical RDA  │  - Offline Cache  │  - Haptic Drivers     │
│  - Design Tokens │  - Ingredient DB │  - Optimistic UI  │  - Biometric Keychain │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┴───────────┬───────────┘
         │                  │                   │                     │
         ▼                  ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVERLESS DATA & EDGE LAYER                          │
│                   (Supabase PostgreSQL • Deno Edge Functions)                   │
├───────────────────────────────┬─────────────────────────────────────────────────┤
│      Zero-Trust Security      │             Multimodal AI Processing            │
│  - 100% Strict RLS Policies   │  - Computer Vision Food & Receipt Parser        │
│  - Isolated User Schemas      │  - Dynamic Ingredient Substitution Engine       │
│  - Automated Cron Triggers    │  - Spoilage Velocity Forecasting Models         │
└───────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 🚀 Key Technical Highlights & Engineering Feats

### 1. 🧮 Clinical Dietetics & Metabolic Nutrition Engine
* **TDEE / BMR Algorithms**: Formulated on the **Mifflin-St Jeor Equation** and **Harris-Benedict standards**, accounting for user biological sex, age, height, weight, and multi-tier physical activity levels.
* **Clinical Condition Interceptors**: Built-in rules engine for hypertension (sodium restrictions), Type-2 diabetes (glycemic-load monitoring), celiac disease, and lactose intolerance.
* **Pantry-Aware Ingredient Substitution**: Automated heuristic engine that detects missing or contraindicated recipe ingredients and maps them to available, safe pantry alternatives.

### 2. 🛡️ Zero-Trust Data Isolation & Database Security
* **Row-Level Security (RLS)**: Enforced strict foreign-key isolation across all 9 PostgreSQL tables (`inventory_items`, `user_profile`, `impact_log`, `disposal_events`, `recipe_favorites`, `meal_plan`, `shopping_list`, `weekly_goals`, `xp_state`).
* **Anti-Enumeration Auth Flow**: Unified failure messaging and dual-layer session validation (`AsyncStorage` + Supabase GoTrue Auth) preventing account discovery vulnerabilities.
* **Automated Expiry Edge Functions**: Scheduled serverless cron workers calculating regional timezone-aware expiration timestamps to trigger proactive notification alerts.

### 3. 📸 Multimodal Computer Vision Pipeline
* **High-Throughput Ingredient Recognition**: Integrated camera hardware drivers using `expo-camera` with multi-angle capture and receipt line-item OCR.
* **Auto-Categorization & Shelf-Life Mapping**: Automatically categorizes scanned items into produce, proteins, dairy, grains, and spices, populating safe storage guidelines and expiry projections.

### 4. 🌍 Sustainability & Financial Impact Modeling
* **Greenhouse Gas (CO₂e) Avoidance Calculation**: Dynamically measures environmental footprint reductions based on food mass saved from landfill diversion.
* **Real-Time Economic Tracking**: Accurately computes cumulative household savings in INR (₹) / local currency, correlating consumed inventory against retail replacement value.
* **Predictive Spoilage Heatmap**: 28-day historical disposal velocity grid pinpointing at-risk grocery purchase categories.

### 5. 🎨 Design Systems & Hardware-Accelerated UX
* **Luxury Color Palette**: Bespoke editorial palette featuring **Royal Forest Green** (`#02332D`), **Golden Days** (`#BF9861`), **White Cream** (`#F7F4EE`), and **Red Phoenix** accents.
* **Deterministic Layouts**: Custom flexbox architecture resilient against platform-specific Android height collapses, sub-pixel rendering bugs, and notch insets.
* **Tactile Spring Physics**: Standardized haptic feedback triggers (120–180ms spring profiles) providing feedback for swipes, selections, and completed achievements.

---

## 📱 Core Application Modules

| Module | Core Functionality | Technologies |
| :--- | :--- | :--- |
| **Today Dashboard** | Daily macro budgets, hydration telemetry, kitchen health gauge, personalized culinary schedule. | `ProgressRing`, `Bar`, SVG Charts |
| **Smart Pantry** | Real-time shelf-life countdown, category filters, quick-action scanner, item disposal audits. | `AsyncStorage`, Supabase Realtime |
| **AI Kitchen & Planner** | 7-day clinical meal planner, pantry-matched recipe generator, dynamic ingredient swaps. | Edge Functions, Heuristic Mapping |
| **Impact & Progress** | CO₂e emissions diverted, grocery funds rescued, XP level tiering, 7-day SVG trend graphs. | `react-native-svg`, Custom Math Models |
| **Biometric Profile** | Calibrated metabolic telemetry, horizontal activity selector, allergy & condition management. | Mifflin-St Jeor Engine, Form Validations |

---

## 🛠️ Complete Technology Stack

### Frontend & Mobile Architecture
* **Core Framework**: React Native 0.76 (New Architecture enabled)
* **Application Framework**: Expo SDK 54 (Managed Workflow)
* **Routing**: Expo Router v4 (Type-safe file-based navigation)
* **Language**: TypeScript 5.3 (Strict mode, zero `any` policy across core modules)
* **Animations**: React Native Reanimated 3, React Native Gesture Handler
* **Iconography & Typography**: Lucide React Native, JetBrains Mono, Inter

### Backend & Cloud Infrastructure
* **Database**: PostgreSQL 15 (Supabase Cloud)
* **Security & Auth**: Row Level Security (RLS), Supabase Auth, Secure Store
* **Serverless Compute**: Deno Edge Functions
* **DevOps & CI/CD**: Expo Application Services (EAS Build & EAS Update)

---

## 🔒 Intellectual Property & Proprietary Notice

> **Confidential & Proprietary**: This repository is a technical showcase and portfolio demonstration of full-stack mobile systems engineering and clinical nutrition informatics by **Anirban Chatterjee**. 
>
> All architecture, algorithmic implementations (clinical contraindication mapping, metabolic TDEE calculation, heuristic substitution engines), and custom UI components are proprietary. **Unlicensed cloning, commercial deployment, or redistribution of this codebase is strictly prohibited.**

---

## 👨‍💻 Engineering & Architecture

Designed, architected, and built by **Anirban Chatterjee**.

* **Focus Areas**: Mobile System Architecture, Full-Stack TypeScript, Healthcare/Nutrition Informatics, Zero-Trust Database Design.
* **GitHub**: [@Anirban4ru](https://github.com/Anirban4ru)

---

<div align="center">
  <sub>Built with clinical rigor, high visual fidelity, and clean software engineering principles.</sub>
</div>