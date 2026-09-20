# Nourish: Intelligent Dietary System

**Nourish** is a production-grade, AI-driven mobile application I developed to bridge the gap between personalized nutrition and waste-conscious food consumption. Built at the intersection of Computer Science and Dietetics, this project represents the culmination of **4.5 months of hands-on engineering, research, and iterative development**. 

This repository houses the complete mobile architecture and backend configuration for Nourish, demonstrating advanced mobile development paradigms, modern UI/UX principles, and robust cloud infrastructure.

## 🚀 Key Highlights & Architecture

- **Hardware-Accelerated UI**: Integrated `react-native-reanimated` and Expo's latest features to deliver a seamless, zero-block, 120fps experience. Includes a custom-built dynamic dashboard and a parallax onboarding carousel.
- **Cross-Domain AI Integration**: Leverages **Google Gemini 3.5 Flash** via serverless Supabase Edge Functions to process inventory data and generate dynamic, context-aware meal suggestions ("Rescue Meals").
- **State Management & Freemium Gating**: Features a custom React Context provider architecture (`usePro`) to seamlessly manage global state and gate premium features (like the AI Scanner) behind a dynamic paywall modal.
- **Robust Security & RLS**: Built on a Supabase backend with 9 comprehensive Row Level Security (RLS) policies, ensuring strict data isolation, privacy, and protection for every user.
- **Production CI/CD**: Engineered a continuous deployment pipeline using Expo Application Services (EAS) to facilitate seamless Over-The-Air (OTA) updates and reliable APK generation.

## 📈 Real-World Problem Solving

Throughout the 4.5-month development lifecycle, Nourish evolved from an initial prototype into a stable, production-ready application. After sharing the early iterations of the app, I received valuable feedback from senior developers, early users, and mentors who encountered edge-case bugs and performance bottlenecks in real-world scenarios. 

Relying heavily on the deep, hands-on experience I had gathered, I methodically addressed these challenges by:
- Resolving complex authentication redirect loops and hardening the routing architecture.
- Patching persistent rollback issues in the OTA update pipeline.
- Completely overhauling the bottom-tab navigation and dashboard to provide a highly intuitive, premium user experience based on direct user feedback.

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo Router, TypeScript, React Native Reanimated, Lucide Icons.
- **Backend**: Supabase (PostgreSQL), Supabase Auth, Edge Functions (Deno).
- **AI/ML**: Google Gemini 3.5 Flash API.
- **DevOps**: Expo Application Services (EAS).

---
*Note: This repository serves as a showcase of my software engineering capabilities, architectural decision-making, and ability to deliver polished, full-stack mobile applications. It does not contain public download links or binary distributions.*
