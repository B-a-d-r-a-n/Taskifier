import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/services/api";
import { useTasksStore } from "@/store/tasks";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { FilterBar } from "@/components/FilterBar";
import { useColors } from "@/hooks/useColors";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { Task } from "@taskifier/types";

export default function MyTasksScreen() {
    const router = useRouter();
    const { highlight } = useLocalSearchParams<{ highlight?: string }>();

    const myTasks = useTasksStore((s) => s.myTasks);
    const setMyTasks = useTasksStore((s) => s.setMyTasks);
    const updateTask = useTasksStore((s) => s.updateTask);
    const deleteTask = useTasksStore((s) => s.deleteTask);
    const setToastMessage = useTasksStore((s) => s.setToastMessage);
    const teams = useTasksStore((s) => s.teams);
    const { colors: c, isDark } = useColors();

    const [loading, setLoading] = useState(true);
    const [showCompleted, setShowCompleted] = useState(true);
    const [showPlaced, setShowPlaced] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const initialLoad = useRef(true);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            apiFetch<Task[]>("/api/tasks/my")
                .then((tasks) => {
                    if (!cancelled) setMyTasks(tasks);
                })
                .catch(() => { })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
            initialLoad.current = false;
            return () => {
                cancelled = true;
            };
        }, []),
    );

    async function toggleComplete(task: Task) {
        try {
            // Optimistic update: update the store immediately for snappy UI,
            // then PATCH the server. On error, re-fetch all my tasks as rollback.
            updateTask({ ...task, completed: !task.completed });
            const updated = await apiFetch<Task>(`/api/tasks/${task.id}`, {
                method: "PATCH",
                body: JSON.stringify({ completed: !task.completed }),
            });
            updateTask(updated);
            setToastMessage(updated.completed ? "Marked as complete" : "Reopened");
        } catch {
            // On error, revert optimistic change by re-fetching my tasks
            try {
                const tasks = await apiFetch<Task[]>('/api/tasks/my');
                setMyTasks(tasks);
            } catch { }
        }
    }

    const handleEditPress = useCallback((task: Task) => {
        setEditingTask(task);
        setModalVisible(true);
    }, []);

    const { confirmVisible, confirmConfig, showConfirm, hideConfirm } = useConfirmDialog();

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
        setEditingTask(null);
    }, []);

    // Editing is handled by the shared TaskModal; the store will be updated there.

    function getTeamName(task: Task): string {
        const team = teams.find((t) => t.id === task.teamId);
        return team?.name ?? "Unknown team";
    }

    const unplacedMyTasks = useMemo(
        () => myTasks.filter((t) => !t.calendarStart),
        [myTasks],
    );

    const filtered = myTasks.filter((t) => {
        if (!showCompleted && t.completed) return false;
        if (!showPlaced && t.calendarStart) return false;
        return true;
    });

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: c.background }]}>
                <ActivityIndicator size="large" color={c.primary} />
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

            {unplacedMyTasks.length > 0 && (
                <View style={[styles.unplacedBanner, { backgroundColor: c.subtleBg, borderColor: c.border }]}>
                    <Text style={[styles.unplacedBannerText, { color: c.icon }]}>
                        You have {unplacedMyTasks.length} unplaced task{unplacedMyTasks.length !== 1 ? "s" : ""}
                    </Text>
                </View>
            )}

            {filtered.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: c.icon }]}>No tasks assigned to you</Text>
                    <Pressable
                        style={[styles.ctaBtn, { backgroundColor: c.primary }]}
                        onPress={() => router.push("/(app)/(tabs)/home/my-teams" as any)}
                    >
                        <Text style={styles.ctaBtnText}>Go to My Teams</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item: task }) => (
                        <TaskCard
                            task={task}
                            highlight={highlight === task.id}
                            badgeLabel={getTeamName(task)}
                            isCompleted={task.completed}
                            isDark={isDark}
                            showDoneButton
                            showDeleteButton
                            onPress={() => handleEditPress(task)}
                            onToggleComplete={() => toggleComplete(task)}
                            onDelete={() => {
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
                            }}
                        />
                    )}
                />
            )}

            <TaskModal
                visible={modalVisible}
                teamId={editingTask?.teamId ?? teams[0]?.id ?? ""}
                onClose={handleCloseModal}
                editTask={editingTask}
                onTaskUpdated={() => { setToastMessage("Task updated"); }}
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
    header: {
        alignItems: "flex-start",
        marginBottom: 12,
    },
    emptyText: { fontSize: 15, textAlign: "center", marginBottom: 16 },
    unplacedBanner: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        alignItems: "center",
    },
    unplacedBannerText: { fontSize: 13, fontWeight: "600" },
    ctaBtn: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    ctaBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    list: { gap: 14, paddingHorizontal: 16 },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    cancel: { fontSize: 16 },
    modalField: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
    textarea: { minHeight: 80, paddingTop: 10 },
    modalActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    saveBtn: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        marginLeft: 8,
    },
    saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    deleteBtn: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        marginRight: 8,
    },
    deleteBtnText: { fontSize: 16, fontWeight: "700" },
});
