import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch, setTokens } from "../../services/api";
import { useTasksStore } from "../../store/tasks";
import { useColors } from "../../hooks/useColors";
import type { Team } from "@taskifier/types";

export default function RegisterScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { colors: c, isDark } = useColors();

    async function handleRegister() {
        if (!email || !displayName || !password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<{ id: string; teams: Team[]; actToken: string; refreshToken: string }>("/api/register", {
                method: "POST",
                body: JSON.stringify({ email, password, displayName }),
            });
            await setTokens(data.actToken, data.refreshToken);
            useTasksStore.getState().setTeams(data.teams);
            useTasksStore.getState().setUserId(data.id);

            // Users with teams go to their tasks; new users go to team management to create/join a team
            if (data.teams.length > 0) {
                router.replace("/(app)/(tabs)/home/my-tasks" as any);
            } else {
                router.replace("/(app)/(tabs)/home/my-teams" as any);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create account");
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: c.background }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={[styles.logo, { color: c.tint }]}>Create Account</Text>

            <View style={styles.form}>
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.text }]}>Email</Text>
                    <TextInput
                        style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={c.icon}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.text }]}>Display Name</Text>
                    <TextInput
                        style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Your name"
                        placeholderTextColor={c.icon}
                        autoCapitalize="words"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.text }]}>Password</Text>
                    <TextInput
                        style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Min 8 characters"
                        placeholderTextColor={c.icon}
                        secureTextEntry
                    />
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.text }]}>Confirm Password</Text>
                    <TextInput
                        style={[styles.input, { color: c.text, backgroundColor: c.inputBg, borderColor: c.border }]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repeat password"
                        placeholderTextColor={c.icon}
                        secureTextEntry
                    />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Create Account</Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.link}
                    onPress={() => router.push("/(auth)/login" as any)}
                >
                    <Text style={[styles.linkText, { color: c.icon }]}>
                        Already have an account?{" "}
                        <Text style={[styles.linkBold, { color: c.tint }]}>Sign In</Text>
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: "center", padding: 24 },
    logo: {
        fontSize: 28,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 40,
    },
    form: { gap: 16 },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: "600" },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    error: { color: "#ef4444", fontSize: 13, textAlign: "center" },
    button: {
        backgroundColor: "#6366f1",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    link: { alignItems: "center", paddingVertical: 8 },
    linkText: { fontSize: 14 },
    linkBold: { fontWeight: "700" },
});
