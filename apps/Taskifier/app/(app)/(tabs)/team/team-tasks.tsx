import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiFetch } from "@/services/api";
import { useTasksStore } from "@/store/tasks";
import { useTeamStream } from "@/hooks/useTeamStream";
import { useTeamGuard } from "@/hooks/useTeamGuard";
import { TaskModal } from "@/components/TaskModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { FilterBar } from "@/components/FilterBar";
import { useColors } from "@/hooks/useColors";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { TaskCard } from "@/components/TaskCard";
import type { Task } from "@taskifier/types";

export default function TeamTasksScreen() {
    const params = useLocalSearchParams<{ teamId?: string }>();
    const teams = useTasksStore((s) => s.teams);
    const currentTeamId = useTasksStore((s) => s.currentTeamId);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);
    const tasksMap = useTasksStore((s) => s.tasks);
    const setTasks = useTasksStore((s) => s.setTasks);
    const updateTask = useTasksStore((s) => s.updateTask);
    const deleteTask = useTasksStore((s) => s.deleteTask);
    const membersMap = useTasksStore((s) => s.members);
    const userId = useTasksStore((s) => s.userId);
    const { colors: c, isDark } = useColors();
    const setToastMessage = useTasksStore((s) => s.setToastMessage);

    const activeTeamId = params.teamId ?? currentTeamId ?? teams[0]?.id ?? "";

    useTeamStream(activeTeamId);
    useTeamGuard(activeTeamId);

    const tasks = useMemo(
        () => tasksMap[activeTeamId] ?? [],
        [tasksMap, activeTeamId],
    );

    const members = useMemo(
        () => membersMap[activeTeamId] ?? [],
        [membersMap, activeTeamId],
    );

    const currentUserMember = members.find((m) => m.userId === userId);
    const isAdmin = currentUserMember?.role === "ADMIN";

    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showCompleted, setShowCompleted] = useState(true);
    const [showPlaced, setShowPlaced] = useState(true);

    const { confirmVisible, confirmConfig, showConfirm, hideConfirm } = useConfirmDialog();

    useEffect(() => {
        if (activeTeamId) {
            setCurrentTeam(activeTeamId);
            loadTasks();
        }
    }, [activeTeamId]);

    async function loadTasks() {
        if (!activeTeamId) return;
        try {
            const data = await apiFetch<Task[]>(`/api/tasks/team/${activeTeamId}`);
            setTasks(activeTeamId, data);
        } catch { } finally {
            setLoading(false);
        }
    }

    const handleCreatePress = useCallback(() => {
        setEditingTask(null);
        setModalVisible(true);
    }, []);

    const handleTaskPress = useCallback((task: Task) => {
        setEditingTask(task);
        setModalVisible(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
        setEditingTask(null);
    }, []);

    const handleTaskCreated = useCallback(() => {
        loadTasks();
        setToastMessage("Task created");
    }, [activeTeamId]);

    const handleTaskUpdated = useCallback(() => {
        loadTasks();
        setToastMessage("Task updated");
    }, [activeTeamId]);

    async function toggleComplete(task: Task) {
        try {
            const updated = await apiFetch<Task>(`/api/tasks/${task.id}`, {
                method: "PATCH",
                body: JSON.stringify({ completed: !task.completed }),
            });
            updateTask(updated);
            setToastMessage(updated.completed ? "Marked as complete" : "Reopened");
        } catch { }
    }

    function handleDeleteTask(task: Task) {
        showConfirm({
            title: "Delete Task",
            message: `Are you sure you want to delete "${task.title}"?`,
            confirmLabel: "Delete",
            destructive: true,
            onConfirm: async () => {
                try {
                    await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
                    deleteTask(task.id);
                    setToastMessage("Task deleted");
                } catch { }
            },
        });
    }

    function getAssigneeName(assignedToId: string | null | undefined): string {
        if (!assignedToId) return "Unassigned";
        if (assignedToId === userId) return "You";
        const member = members.find((m) => m.userId === assignedToId);
        return member?.user?.displayName ?? assignedToId.slice(0, 8);
    }

    const unplacedTasks = useMemo(
        () => tasks.filter((t) => !t.calendarStart),
        [tasks],
    );

    const filtered = tasks.filter((t) => {
        if (!showCompleted && t.completed) return false;
        if (!showPlaced && t.calendarStart) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        const aDate = a.calendarStart ?? a.createdAt;
        const bDate = b.calendarStart ?? b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    if (!activeTeamId && teams.length > 0) {
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
            <View style={styles.header}>
                <FilterBar
                    showPlaced={showPlaced}
                    setShowPlaced={setShowPlaced}
                    showCompleted={showCompleted}
                    setShowCompleted={setShowCompleted}
                />
            </View>

            {unplacedTasks.length > 0 && (
                <View style={[styles.unplacedBanner, { backgroundColor: c.subtleBg, borderColor: c.border }]}>
                    <Text style={[styles.unplacedBannerText, { color: c.icon }]}>
                        You have {unplacedTasks.length} unplaced task{unplacedTasks.length !== 1 ? "s" : ""}
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : sorted.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: c.icon }]}>
                        {showCompleted || !showPlaced ? "No tasks match filters" : "No tasks in this team"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={sorted}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item: task }) => {
                        const isAssignedToMe = task.assignedToId === userId;
                        return (
                            <TaskCard
                                task={task}
                                isCompleted={task.completed}
                                isDark={isDark}
                                badgeLabel={getAssigneeName(task.assignedToId)}
                                showDoneButton={isAssignedToMe}
                                showDeleteButton={isAdmin}
                                onPress={() => handleTaskPress(task)}
                                onToggleComplete={() => toggleComplete(task)}
                                onDelete={() => handleDeleteTask(task)}
                            />
                        );
                    }}
                />
            )}

            <Pressable
                style={[styles.fab, { backgroundColor: c.primary }]}
                onPress={handleCreatePress}
            >
                <Text style={styles.fabText}>+</Text>
            </Pressable>

            <TaskModal
                visible={modalVisible}
                teamId={activeTeamId}
                onClose={handleCloseModal}
                editTask={editingTask}
                onTaskCreated={handleTaskCreated}
                onTaskUpdated={handleTaskUpdated}
            />

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
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyText: { fontSize: 15, textAlign: "center" },
    header: {
        alignItems: "flex-start",
        marginBottom: 12,
    },
    unplacedBanner: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        alignItems: "center",
    },
    unplacedBannerText: { fontSize: 13, fontWeight: "600" },
    list: { gap: 14, paddingHorizontal: 16 },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    fabText: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 32 },
});
