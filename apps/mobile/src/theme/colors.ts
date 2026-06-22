// Palette Apple — light & dark. Voir docs/03-design-system.md §2.

export interface ColorPalette {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  label: string;
  labelSecondary: string;
  labelTertiary: string;
  separator: string;
  fill: string;
  tint: string; // bleu Apple — action principale
  success: string;
  warning: string;
  danger: string;
  white: string;
  black: string;
}

export const lightColors: ColorPalette = {
  background: "#FFFFFF",
  backgroundSecondary: "#F2F2F7",
  backgroundTertiary: "#FFFFFF",
  label: "#000000",
  labelSecondary: "rgba(60,60,67,0.6)",
  labelTertiary: "rgba(60,60,67,0.3)",
  separator: "rgba(60,60,67,0.29)",
  fill: "rgba(120,120,128,0.2)",
  tint: "#007AFF",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  white: "#FFFFFF",
  black: "#000000",
};

export const darkColors: ColorPalette = {
  background: "#000000",
  backgroundSecondary: "#1C1C1E",
  backgroundTertiary: "#2C2C2E",
  label: "#FFFFFF",
  labelSecondary: "rgba(235,235,245,0.6)",
  labelTertiary: "rgba(235,235,245,0.3)",
  separator: "rgba(84,84,88,0.65)",
  fill: "rgba(120,120,128,0.36)",
  tint: "#0A84FF",
  success: "#30D158",
  warning: "#FF9F0A",
  danger: "#FF453B",
  white: "#FFFFFF",
  black: "#000000",
};
