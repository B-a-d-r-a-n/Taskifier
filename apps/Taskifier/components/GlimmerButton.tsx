import React, { useRef, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";

interface GlimmerButtonProps {
    onPress: () => Promise<void>;
    onSuccess: (text: string) => void;
    onError?: (message: string) => void;
    title?: string;
    disabled?: boolean;
}

export function GlimmerButton({
    onPress,
    onSuccess,
    onError,
    title = "Make Actionable",
    disabled = false,
}: GlimmerButtonProps) {
    const [status, setStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // Shimmer sweep animation: a white translucent bar slides left-to-right across the button
    // while the AI request is in-flight, giving a "processing" visual cue
    useEffect(() => {
        let anim: Animated.CompositeAnimation;
        if (status === "loading") {
            anim = Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            );
            anim.start();
        } else {
            shimmerAnim.setValue(0);
            anim = Animated.timing(shimmerAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            });
            anim.start();
        }
        return () => anim?.stop();
    }, [status]);

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-120, 120],
    });

    async function handlePress() {
        if (disabled || status === "loading") return;
        setStatus("loading");
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await onPress();
            setStatus("success");
            setTimeout(() => setStatus("idle"), 2000);
        } catch (err) {
            setStatus("error");
            onError?.(err instanceof Error ? err.message : "AI unavailable");
            setTimeout(() => setStatus("idle"), 3000);
        }
    }

    const isLoading = status === "loading";
    const isError = status === "error";

    return (
        <View style={styles.wrapper}>
            <Pressable
                onPress={handlePress}
                disabled={disabled || isLoading}
                style={[
                    styles.button,
                    isLoading && styles.buttonLoading,
                    isError && styles.buttonError,
                    disabled && styles.buttonDisabled,
                ]}
            >
                {isLoading && (
                    <Animated.View
                        style={[
                            styles.shimmer,
                            { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                    />
                )}
                <View style={styles.content}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.text}>
                            {status === "success"
                                ? "✓ Done"
                                : status === "error"
                                    ? "✗ Error"
                                    : title}
                        </Text>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { position: "relative", overflow: "hidden", borderRadius: 8 },
    button: {
        backgroundColor: "#6366f1",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
    },
    buttonLoading: { backgroundColor: "#818cf8" },
    buttonError: { backgroundColor: "#ef4444" },
    buttonDisabled: { backgroundColor: "#9ca3af", opacity: 0.6 },
    shimmer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 60,
        backgroundColor: "rgba(255,255,255,0.3)",
        transform: [{ skewX: "-20deg" }],
    },
    content: { flexDirection: "row", alignItems: "center", gap: 6 },
    text: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
