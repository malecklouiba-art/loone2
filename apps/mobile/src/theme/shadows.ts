// Ombres douces (iOS) + élévation (Android).
import { Platform, type ViewStyle } from "react-native";

function shadow(y: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: y },
      shadowRadius: blur,
      shadowOpacity: opacity,
    },
    default: { elevation },
  })!;
}

export const shadows = {
  card: shadow(1, 3, 0.08, 2),
  float: shadow(8, 24, 0.18, 12), // FAB micro, modales
};
