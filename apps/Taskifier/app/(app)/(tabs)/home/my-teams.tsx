import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/services/api";
import { useTasksStore } from "@/store/tasks";
import type { Team, TeamMember } from "@taskifier/types";
import { useColors } from "@/hooks/useColors";

export default function MyTeamsScreen() {
    const router = useRouter();
    const teams = useTasksStore((s) => s.teams);
    const setTeams = useTasksStore((s) => s.setTeams);
    const currentTeamId = useTasksStore((s) => s.currentTeamId);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);
    const { colors: c, isDark } = useColors();

    const [teamName, setTeamName] = useState("");
    const [creating, setCreating] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);

    async function createTeam() {
        if (!teamName.trim()) return;
        setCreating(true);
        try {
            const team = await apiFetch<Team>("/api/teams", {
                method: "POST",
                body: JSON.stringify({ name: teamName.trim() }),
            });
            setTeams([...teams, team]);
            setCurrentTeam(team.id);
            setTeamName("");
        } catch { } finally {
            setCreating(false);
        }
    }

    async function joinTeam() {
        if (!joinCode.trim()) return;
        setJoining(true);
        try {
            const { team } = await apiFetch<{ team: Team }>("/api/teams/join", {
                method: "POST",
                body: JSON.stringify({ inviteCode: joinCode.trim() }),
            });
            const currentTeams = useTasksStore.getState().teams;
            setTeams([...currentTeams, team]);
            setCurrentTeam(team.id);
            // Pre-fetch members to avoid stale state after rejoin
            try {
                const members = await apiFetch<TeamMember[]>(`/api/teams/${team.id}/members`);
                useTasksStore.getState().setMembers(team.id, members);
            } catch { }
            setJoinCode("");
        } catch { } finally {
            setJoining(false);
        }
    }

    function selectTeam(teamId: string) {
        setCurrentTeam(teamId);
        router.push(`/(app)/(tabs)/team?teamId=${teamId}` as any);
    }

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Create a Team</Text>
            <View style={styles.createRow}>
                <TextInput
                    style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.inputBg }]}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="Team name"
                    placeholderTextColor={c.icon}
                />
                <Pressable
                    style={[styles.primaryBtn, { backgroundColor: c.primary }, creating && { opacity: 0.7 }]}
                    onPress={createTeam}
                    disabled={creating || !teamName.trim()}
                >
                    {creating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.primaryBtnText}>Create</Text>
                    )}
                </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: c.text, marginTop: 20 }]}>Join a Team</Text>
            <View style={styles.joinRow}>
                <TextInput
                    style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.inputBg }]}
                    value={joinCode}
                    onChangeText={setJoinCode}
                    placeholder="Enter invite code"
                    placeholderTextColor={c.icon}
                    autoCapitalize="characters"
                />
                <Pressable
                    style={[styles.outlineBtn, { borderColor: c.primary }, joining && { opacity: 0.7 }]}
                    onPress={joinTeam}
                    disabled={joining || !joinCode.trim()}
                >
                    {joining ? (
                        <ActivityIndicator size="small" color={c.primary} />
                    ) : (
                        <Text style={[styles.outlineBtnText, { color: c.primary }]}>Join</Text>
                    )}
                </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: c.text, marginTop: 20 }]}>
                Your Teams ({teams.length})
            </Text>

            {teams.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: c.icon }]}>
                        No teams yet. Create or join one above.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={teams}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.teamList}
                    renderItem={({ item: team }) => {
                        const isActive = team.id === currentTeamId;
                        return (
                            <Pressable
                                style={[
                                    styles.teamCard,
                                    { backgroundColor: c.card, borderColor: isActive ? c.primary : c.border },
                                ]}
                                onPress={() => selectTeam(team.id)}
                            >
                                <View style={styles.teamInfo}>
                                    <Text style={[styles.teamName, { color: c.text }]}>{team.name}</Text>
                                    <Text style={[styles.teamMeta, { color: c.icon }]}>
                                        Code: {team.inviteCode} {isActive ? "• Active" : ""}
                                    </Text>
                                </View>
                                <Text style={[styles.chevron, { color: c.icon }]}>›</Text>
                            </Pressable>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10, letterSpacing: 0.3 },
    createRow: { flexDirection: "row", gap: 8 },
    joinRow: { flexDirection: "row", gap: 8 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    primaryBtn: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    outlineBtn: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        justifyContent: "center",
    },
    outlineBtnText: { fontWeight: "600", fontSize: 14 },
    emptyText: { fontSize: 15 },
    teamList: { gap: 10, paddingBottom: 20 },
    teamCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    teamInfo: { flex: 1, gap: 6 },
    teamName: { fontSize: 16, fontWeight: "600" },
    teamMeta: { fontSize: 12, marginTop: 2 },
    chevron: { fontSize: 22, fontWeight: "300" },
});
