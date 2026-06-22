// ThemeProvider + useTheme(). Suit le mode système, override possible.
import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ColorPalette } from "./colors";
import { typography } from "./typography";
import { spacing, radius, layout } from "./spacing";
import { shadows } from "./shadows";

export type ThemeMode = "light" | "dark" | "system";

export interface Theme {
  colors: ColorPalette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  shadows: typeof shadows;
  isDark: boolean;
}

interface ThemeContextValue extends Theme {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === "system" ? system === "dark" : mode === "dark";
    return {
      colors: isDark ? darkColors : lightColors,
      typography,
      spacing,
      radius,
      layout,
      shadows,
      isDark,
      mode,
      setMode,
    };
  }, [mode, system]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans <ThemeProvider>");
  return ctx;
}

export { lightColors, darkColors, typography, spacing, radius, layout, shadows };
export type { ColorPalette };
