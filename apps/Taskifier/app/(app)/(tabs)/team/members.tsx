import React, { useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { apiFetch } from "@/services/api";
import { useTasksStore } from "@/store/tasks";
import { useTeamStream } from "@/hooks/useTeamStream";
import { useTeamGuard } from "@/hooks/useTeamGuard";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useColors } from "@/hooks/useColors";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { Team, TeamMember, Role } from "@taskifier/types";

const ROLE_COLORS: Record<Role, string> = {
    ADMIN: "#f59e0b",
    MEMBER: "#818cf8",
};

export default function TeamMembersScreen() {
    const params = useLocalSearchParams<{ teamId?: string }>();
    const teams = useTasksStore((s) => s.teams);
    const setTeams = useTasksStore((s) => s.setTeams);
    const currentTeamId = useTasksStore((s) => s.currentTeamId);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);
    const membersMap = useTasksStore((s) => s.members);
    const setMembers = useTasksStore((s) => s.setMembers);
    const clearTeamMembers = useTasksStore((s) => s.clearTeamMembers);
    const userId = useTasksStore((s) => s.userId);
    const { colors: c, isDark } = useColors();

    const activeTeamId = params.teamId ?? currentTeamId ?? teams[0]?.id ?? "";

    const members = useMemo(
        () => membersMap[activeTeamId] ?? [],
        [membersMap, activeTeamId],
    );

    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const { confirmVisible, confirmConfig, showConfirm, hideConfirm } = useConfirmDialog();

    useTeamStream(activeTeamId);
    useTeamGuard(activeTeamId);

    useEffect(() => {
        if (activeTeamId) {
            setCurrentTeam(activeTeamId);
            loadMembers();
        }
    }, [activeTeamId, userId]);

    async function loadMembers() {
        if (!activeTeamId) return;
        try {
            const data = await apiFetch<TeamMember[]>(`/api/teams/${activeTeamId}/members`);
            setMembers(activeTeamId, data);
        } catch { } finally {
            setLoading(false);
        }
    }

    const activeTeam = teams.find((t: Team) => t.id === activeTeamId);
    const currentUserMember = members.find((m) => m.userId === userId);
    const isAdmin = currentUserMember?.role === "ADMIN";

    async function handleRegenerateInvite() {
        if (!activeTeamId) return;
        try {
            const { inviteCode } = await apiFetch<{ inviteCode: string }>(
                `/api/teams/${activeTeamId}/regenerate-invite`,
                { method: "POST" },
            );
            const allTeams = useTasksStore.getState().teams;
            const updated = allTeams.map((t) =>
                t.id === activeTeamId ? { ...t, inviteCode } : t,
            );
            setTeams(updated);
        } catch { }
    }

    async function handleCopyInvite() {
        if (!activeTeam?.inviteCode) return;
        await Clipboard.setStringAsync(activeTeam.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleKickMember(member: TeamMember) {
        if (!activeTeamId || member.userId === userId) return;
        showConfirm({
            title: "Kick Member",
            message: "Remove this member from the team?",
            confirmLabel: "Kick",
            destructive: true,
            onConfirm: async () => {
                try {
                    await apiFetch(
                        `/api/teams/${activeTeamId}/members/${member.userId}`,
                        { method: "DELETE" },
                    );
                    loadMembers();
                } catch { }
            },
        });
    }

    function handleLeaveTeam() {
        if (!activeTeamId || !userId) return;
        showConfirm({
            title: "Leave Team",
            message: `Are you sure you want to leave "${activeTeam?.name}"?`,
            confirmLabel: "Leave",
            destructive: true,
            onConfirm: async () => {
                try {
                    await apiFetch(
                        `/api/teams/${activeTeamId}/members/${userId}`,
                        { method: "DELETE" },
                    );
                    clearTeamMembers(activeTeamId);
                    const allTeams = useTasksStore.getState().teams;
                    const updated = allTeams.filter((t) => t.id !== activeTeamId);
                    setTeams(updated);
                    if (updated.length > 0) {
                        setCurrentTeam(updated[0].id);
                    } else {
                        setCurrentTeam("");
                    }
                } catch { }
            },
        });
    }

    if (!activeTeam && teams.length > 0) {
        return (
            <View style={[styles.centered, { backgroundColor: c.background }]}>
                <Text style={[{ color: c.icon }]}>Select a team from Home → My Teams</Text>
            </View>
        );
    }

    if (teams.length === 0) {
        return (
            <View style={[styles.centered, { backgroundColor: c.background }]}>
                <Text style={[styles.emptyText, { color: c.icon }]}>
                    No teams yet. Create one from Home → My Teams.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.teamName, { color: c.text }]}>{activeTeam?.name ?? "Team"}</Text>
                <Text style={[styles.memberCount, { color: c.icon }]}>
                    {members.length} member{members.length !== 1 ? "s" : ""}
                </Text>
            </View>

            <View style={[styles.inviteSection, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.inviteInfo}>
                    <Text style={[styles.inviteLabel, { color: c.icon }]}>Invite Code</Text>
                    <Text
                        style={[styles.inviteCode, { color: c.primary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {activeTeam?.inviteCode ?? "—"}
                    </Text>
                </View>
                <View style={styles.inviteActions}>
                    <Pressable style={[styles.smallBtn, { borderColor: c.border }]} onPress={handleCopyInvite}>
                        <Text style={[styles.smallBtnText, { color: c.primary }]}>
                            {copied ? "Copied!" : "Copy"}
                        </Text>
                    </Pressable>
                    {isAdmin && (
                        <Pressable style={[styles.smallBtn, { borderColor: c.border }]} onPress={handleRegenerateInvite}>
                            <Text style={[styles.smallBtnText, { color: c.primary }]}>New Code</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <View style={styles.actionsRow}>
                <Pressable
                    style={[styles.actionBtn, { backgroundColor: c.dangerLight }]}
                    onPress={handleLeaveTeam}
                >
                    <Text style={[styles.actionBtnText, { color: c.danger }]}>Leave Team</Text>
                </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: c.text }]}>Members</Text>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} />
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.memberList}
                    renderItem={({ item: member }) => {
                        const isSelf = member.userId === userId;
                        return (
                            <View style={[styles.memberRow, { backgroundColor: c.card }]}>
                                <View style={[styles.memberAvatar, { backgroundColor: c.primary }]}>
                                    <Text style={styles.memberAvatarText}>
                                        {(member.user?.displayName?.slice(0, 2) ?? "?").toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: c.text }]}>
                                        {isSelf ? "You" : (member.user?.displayName ?? member.userId.slice(0, 8))}
                                    </Text>
                                    <View
                                        style={[
                                            styles.roleBadge,
                                            { backgroundColor: ROLE_COLORS[member.role] },
                                        ]}
                                    >
                                        <Text style={styles.roleBadgeText}>{member.role}</Text>
                                    </View>
                                </View>
                                {isAdmin && !isSelf && (
                                    <Pressable
                                        style={[styles.kickBtn, { borderColor: c.danger }]}
                                        onPress={() => handleKickMember(member)}
                                    >
                                        <Text style={[styles.kickBtnText, { color: c.danger }]}>Kick</Text>
                                    </Pressable>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            <ConfirmModal
                visible={confirmVisible}
                title={confirmConfig?.title ?? ""}
                message={confirmConfig?.message ?? ""}
                confirmLabel={confirmConfig?.confirmLabel ?? "Confirm"}
                destructive={confirmConfig?.destructive ?? false}
                onConfirm={() => {
                    hideConfirm();
                    confirmConfig?.onConfirm();
                }}
                onCancel={hideConfirm}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    emptyText: { fontSize: 15, textAlign: "center" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 12,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    teamName: { fontSize: 20, fontWeight: "700" },
    memberCount: { fontSize: 13 },
    inviteSection: {
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    inviteInfo: { gap: 4, flexShrink: 1 },
    inviteLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
    inviteCode: { fontSize: 18, fontWeight: "700", letterSpacing: 2 },
    inviteActions: { flexDirection: "row", gap: 8 },
    smallBtn: {
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    smallBtnText: { fontSize: 12, fontWeight: "600" },
    actionsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
    actionBtn: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    actionBtnText: { fontWeight: "600", fontSize: 13 },
    sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12, letterSpacing: 0.3 },
    memberList: { gap: 8 },
    memberRow: {
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    memberAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    memberAvatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    memberInfo: { flex: 1, gap: 4 },
    memberName: { fontSize: 14, fontWeight: "600" },
    roleBadge: {
        alignSelf: "flex-start",
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    roleBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    kickBtn: {
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    kickBtnText: { fontSize: 12, fontWeight: "600" },
});