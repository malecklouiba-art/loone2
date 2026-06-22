// Échelle typographique alignée iOS (SF Pro). Voir docs/03-design-system.md §3.
import { Platform, type TextStyle } from "react-native";

// Sur iOS : police système (San Francisco) via "System".
// Sur Android : fallback Inter (à charger) ou police système.
const display = Platform.select({ ios: "System", default: "Inter" });
const text = Platform.select({ ios: "System", default: "Inter" });

type TypoScale = Record<
  | "largeTitle"
  | "title1"
  | "title2"
  | "title3"
  | "headline"
  | "body"
  | "callout"
  | "subhead"
  | "footnote"
  | "caption1"
  | "caption2",
  TextStyle
>;

export const typography: TypoScale = {
  largeTitle: { fontFamily: display, fontSize: 34, lineHeight: 41, fontWeight: "700" },
  title1: { fontFamily: display, fontSize: 28, lineHeight: 34, fontWeight: "700" },
  title2: { fontFamily: display, fontSize: 22, lineHeight: 28, fontWeight: "700" },
  title3: { fontFamily: display, fontSize: 20, lineHeight: 25, fontWeight: "600" },
  headline: { fontFamily: text, fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontFamily: text, fontSize: 17, lineHeight: 22, fontWeight: "400" },
  callout: { fontFamily: text, fontSize: 16, lineHeight: 21, fontWeight: "400" },
  subhead: { fontFamily: text, fontSize: 15, lineHeight: 20, fontWeight: "400" },
  footnote: { fontFamily: text, fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption1: { fontFamily: text, fontSize: 12, lineHeight: 16, fontWeight: "400" },
  caption2: { fontFamily: text, fontSize: 11, lineHeight: 13, fontWeight: "400" },
};
