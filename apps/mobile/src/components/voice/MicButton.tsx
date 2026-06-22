// Bouton micro central — l'élément le plus visible de l'app (docs/03 §7).
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import type { VoiceStatus } from "@/store/voiceStore";

interface MicButtonProps {
  status?: VoiceStatus;
  onPress: () => void;
  size?: number;
}

export function MicButton({ status = "idle", onPress, size }: MicButtonProps) {
  const { colors, layout, shadows } = useTheme();
  const dim = size ?? layout.micSize;
  const scale = useSharedValue(1);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (status === "listening") {
      halo.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }), -1, false);
    } else if (status === "idle") {
      // respiration douce
      scale.value = withRepeat(withSequence(withTiming(1.04, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, true);
    } else {
      halo.value = withTiming(0);
      scale.value = withTiming(1);
    }
  }, [status]);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - halo.value),
    transform: [{ scale: 1 + halo.value * 0.8 }],
  }));

  const bg =
    status === "error" ? colors.danger : status === "success" ? colors.success : colors.tint;

  return (
    <View style={{ width: dim, height: dim, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          { position: "absolute", width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.tint },
          haloStyle,
        ]}
      />
      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={onPress}
          style={[
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: bg,
              alignItems: "center",
              justifyContent: "center",
            },
            shadows.float,
          ]}
        >
          <Text style={{ fontSize: dim * 0.42 }}>🎙️</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
