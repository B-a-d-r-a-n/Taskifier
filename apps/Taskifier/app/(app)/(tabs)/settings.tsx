import React, { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { apiFetch, saveTheme } from "@/services/api";
import { useTasksStore } from "@/store/tasks";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
    const router = useRouter();
    const teams = useTasksStore((s) => s.teams);
    const { colors: c, isDark } = useColors();
    const setTheme = useTasksStore((s) => s.setTheme);
    const reset = useTasksStore((s) => s.reset);

    async function handleLogout() {
        reset();
        await apiFetch("/api/logout", { method: "POST", retryOn401: false }).catch(() => { });
        router.replace("/(auth)/login" as any);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.icon }]}>Appearance</Text>
                <View style={[styles.card, { backgroundColor: c.card }]}>
                    <View style={styles.row}>
                        <Text style={[styles.cardText, { color: c.text }]}>Dark Mode</Text>
                        <Switch
                            value={isDark}
                            onValueChange={(v) => {
                                const newTheme = v ? "dark" : "light";
                                setTheme(newTheme);
                                saveTheme(newTheme);
                            }}
                            trackColor={{ false: c.border, true: c.primary }}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.icon }]}>Account</Text>
                <View style={[styles.card, { backgroundColor: c.card }]}>
                    <Text style={[styles.cardText, { color: c.text }]}>
                        Signed in to {teams.length} team{teams.length !== 1 ? "s" : ""}
                    </Text>
                    <Pressable style={[styles.dangerBtn, { borderColor: c.danger }]} onPress={handleLogout}>
                        <Text style={[styles.dangerBtnText, { color: c.danger }]}>Sign Out</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.icon }]}>About</Text>
                <View style={[styles.card, { backgroundColor: c.card }]}>
                    <View style={styles.aboutRow}>
                        <Text style={[styles.aboutLabel, { color: c.icon }]}>Version</Text>
                        <Text style={[styles.aboutValue, { color: c.text }]}>1.0.0</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={[styles.aboutLabel, { color: c.icon }]}>Built with</Text>
                        <Text style={[styles.aboutValue, { color: c.text }]}>Expo + React Native</Text>
                    </View>
                    <Text style={[styles.aboutDesc, { color: c.icon }]}>
                        Taskifier is a collaborative task management app with real-time team sync, AI-powered task suggestions, and interactive calendar views.
                    </Text>
                </View>
            </View>
        </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardText: { fontSize: 15 },
    cardDesc: { fontSize: 13 },
    dangerBtn: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    dangerBtnText: { fontWeight: "600", fontSize: 15 },
    aboutRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    aboutLabel: { fontSize: 14 },
    aboutValue: { fontSize: 14, fontWeight: "600" },
    aboutDesc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
