import React, { useEffect } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTasksStore } from "@/store/tasks";
import { useColors } from "@/hooks/useColors";

export default function LandingScreen() {
    const router = useRouter();
    const userId = useTasksStore((s) => s.userId);
    const { colors: c, isDark } = useColors();

    // If already authenticated (from root layout's /api/me check), skip the landing page entirely
    useEffect(() => {
        if (userId) {
            router.replace("/(app)/(tabs)/home/my-tasks" as any);
        }
    }, [userId, router]);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <View style={styles.hero}>
                <Text style={[styles.title, { color: c.text }]}>Taskifier</Text>
                <Text style={[styles.subtitle, { color: c.icon }]}>
                    The AI powered task management app
                </Text>
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => router.push("/(auth)/login" as any)}
                >
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                </Pressable>

                <Pressable
                    style={[styles.button, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}
                    onPress={() => router.push("/(auth)/register" as any)}
                >
                    <Text style={[styles.secondaryButtonText, { color: c.text }]}>Get Started</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    hero: {
        alignItems: "center",
        marginBottom: 64,
    },
    title: {
        fontSize: 42,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "500",
        marginTop: 12,
        textAlign: "center",
        lineHeight: 22,
    },
    actions: {
        width: "100%",
        gap: 14,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButton: {
        backgroundColor: "#6366f1",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    secondaryButtonText: {
        fontSize: 17,
        fontWeight: "700",
    },
});
