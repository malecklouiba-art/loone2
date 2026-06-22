// Layout des onglets : barre custom + micro central qui ouvre le VoiceOverlay.
// useVoiceCommand est instancié UNE SEULE FOIS ici pour partager le recorder audio.
import React, { useState } from "react";
import { Tabs } from "expo-router";
import { TabBar } from "@/components/ui/TabBar";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import { useVoiceCommand } from "@/features/voice/useVoiceCommand";

export default function TabsLayout() {
  const [overlay, setOverlay] = useState(false);
  const vc = useVoiceCommand();

  const openMic = () => {
    setOverlay(true);
    vc.start();
  };

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} onMicPress={openMic} />}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="clients" />
        {/* écran fantôme : sert d'ancre au bouton central, jamais affiché */}
        <Tabs.Screen name="voice" options={{ href: null }} />
        <Tabs.Screen name="projects" />
        <Tabs.Screen name="settings" />
      </Tabs>

      <VoiceOverlay
        visible={overlay}
        vc={vc}
        onClose={() => {
          setOverlay(false);
          vc.reset();
        }}
      />
    </>
  );
}
