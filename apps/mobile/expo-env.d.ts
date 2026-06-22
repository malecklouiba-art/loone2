/// <reference types="expo/types" />

// Variables d'environnement publiques (Expo expose EXPO_PUBLIC_*).
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  }
}
