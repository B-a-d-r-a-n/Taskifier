import { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { apiFetch, initTokens, loadTheme } from "../services/api";
import { useTasksStore } from "../store/tasks";
import type { Team } from "@taskifier/types";

export default function RootLayout() {
    const router = useRouter();
    const checked = useRef(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const setTeams = useTasksStore((s) => s.setTeams);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);
    const setUserId = useTasksStore((s) => s.setUserId);
    const setTheme = useTasksStore((s) => s.setTheme);
    const theme = useTasksStore((s) => s.theme);
    const toastMessage = useTasksStore((s) => s.toastMessage);
    const setToastMessage = useTasksStore((s) => s.setToastMessage);

    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animated toast: fades in, auto-dismisses after 3s, tap to dismiss early
    const showToast = useCallback((message: string) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastMessage(message);
        toastOpacity.setValue(1);
        toastTimer.current = setTimeout(() => {
            Animated.timing(toastOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setToastMessage(null));
        }, 3000);
    }, [toastOpacity, setToastMessage]);

    useEffect(() => {
        if (toastMessage) {
            showToast(toastMessage);
        }
    }, [toastMessage]);

    useEffect(() => {
        // useRef guard prevents double-execution in React StrictMode (dev only)
        if (checked.current) return;
        checked.current = true;

        loadTheme().then((savedTheme) => {
            if (savedTheme !== theme) setTheme(savedTheme);
        });
        initTokens().then(() => {
            return apiFetch<{ id: string; teams: Team[] }>("/api/me");
        }).then((data) => {
            setUserId(data.id);
            setTeams(data.teams);
            if (data.teams.length > 0) {
                setCurrentTeam(data.teams[0].id);
                router.replace("/(app)/(tabs)/home/my-tasks" as any);
            } else {
                router.replace("/(app)/(tabs)/home/my-teams" as any);
            }
        })
            .catch(() => { })
            .finally(() => setCheckingAuth(false));
    }, []);

    const isDark = theme === "dark";
    const toastBg = isDark ? "#333" : "#323232";

    if (checkingAuth) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar style={theme === "dark" ? "light" : "dark"} />
                <Stack screenOptions={{ headerShown: false }} />
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false }} />

            {toastMessage && (
                <Animated.View
                    pointerEvents="box-none"
                    style={[styles.toastContainer, { opacity: toastOpacity }]}
                >
                    <Pressable
                        style={[styles.toast, { backgroundColor: toastBg }]}
                        onPress={() => {
                            if (toastTimer.current) clearTimeout(toastTimer.current);
                            Animated.timing(toastOpacity, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                            }).start(() => setToastMessage(null));
                        }}
                    >
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </Pressable>
                </Animated.View>
            )}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        position: "absolute",
        bottom: 80,
        left: 24,
        right: 24,
        alignItems: "center",
        zIndex: 9999,
    },
    toast: {
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    toastText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
});
