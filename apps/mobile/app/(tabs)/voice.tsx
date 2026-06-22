// Ancre de l'onglet central (href:null). Le Micro IA s'ouvre via le VoiceOverlay
// déclenché depuis la TabBar ; cet écran n'est jamais affiché directement.
import { Redirect } from "expo-router";

export default function VoiceAnchor() {
  return <Redirect href="/(tabs)/dashboard" />;
}
