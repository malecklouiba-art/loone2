// Point d'entrée : redirige immédiatement (la logique est dans _layout).
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(tabs)/dashboard" />;
}
