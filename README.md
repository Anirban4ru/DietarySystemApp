# Nourish - Intelligent Dietary Systems

Nourish is a modern, AI-powered pantry and dietary management application built with **React Native (Expo)**, **Supabase**, and **Google Gemini 1.5 Flash**. It utilizes cutting-edge UI/UX patterns with **Reanimated** for 120fps hardware-accelerated animations, providing a seamless, premium mobile experience.

## ✨ Features

- **AI-Powered Recipe Generation:** Leverage Google Gemini to instantly generate customized recipes based on your available ingredients.
- **Advanced State Management & Routing:** Built using Expo Router for deeply integrated, file-based stack navigation, including complex authorization guards.
- **Hardware-Accelerated Animations:** Features a highly optimized, fully custom `react-native-reanimated` onboarding carousel with parallax scrolling and dynamic color interpolation that responds at 120fps with zero JS-thread blocking.
- **Over-The-Air (OTA) Updates:** Fully integrated with Expo Application Services (EAS) for seamless background OTA updates, ensuring users always have the latest production code without downloading new APKs.
- **Modern UI/UX Architecture:** Clean, Brutalist-inspired aesthetic using a strict, custom design system, dynamic theming, and gesture-driven modal drawers.

## 🚀 Tech Stack

- **Frontend:** React Native, Expo, React Native Reanimated, Expo Router
- **Backend & Auth:** Supabase (PostgreSQL, Auth)
- **AI Integration:** Google Gemini (Generative AI)
- **CI/CD & DevOps:** Expo Application Services (EAS) for Build and OTA Updates

## 🛠️ Architecture Highlights

- **Custom Toast Provider:** A globally available, theme-aware Toast notification system that supports dynamic actions (e.g., OTA update prompts, account deletion confirmations).
- **Strict Authentication Flow:** A robust `_layout.tsx` auth guard that securely routes users between Onboarding, Login, and the main App based on persistent asynchronous storage and Supabase session state.
- **Optimized Asset Delivery:** All custom fonts and local assets are pre-loaded at the root layout level, ensuring zero layout shift.

## 📱 Architecture & Performance

This application was engineered with a strict adherence to performance and scalability:
- **Zero JS-Thread Blocking:** All complex gestures and animations are offloaded to the native UI thread via React Native Reanimated.
- **Offline-First Capabilities:** Employs robust asynchronous storage mechanisms to persist user state securely.
- **Atomic Design Principles:** The UI is constructed using isolated, reusable components (Buttons, Skeleton Loaders, Bottom Sheets) driven by a centralized, brutalist-inspired design token system.

---
*Developed with a focus on writing clean, scalable, and highly performant mobile architectures.*
