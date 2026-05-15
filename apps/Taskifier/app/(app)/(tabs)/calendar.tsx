import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { apiFetch } from "@/services/api";
import { useTasksStore } from "@/store/tasks";
import { useTeamStream } from "@/hooks/useTeamStream";
import { useTeamGuard } from "@/hooks/useTeamGuard";
import { CalendarBoard } from "@/components/CalendarBoard";
import { TaskModal } from "@/components/TaskModal";
import type { Task } from "@taskifier/types";
import { useColors } from "@/hooks/useColors";

export default function CalendarTabScreen() {
    const params = useLocalSearchParams<{ teamId?: string; highlight?: string }>();

    const teams = useTasksStore((s) => s.teams);
    const currentTeamId = useTasksStore((s) => s.currentTeamId);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);
    const tasksMap = useTasksStore((s) => s.tasks);
    const setTasks = useTasksStore((s) => s.setTasks);

    const { colors: c, isDark } = useColors();

    const tasks = useMemo(
        () => tasksMap[currentTeamId ?? ""] ?? [],
        [tasksMap, currentTeamId],
    );

    const [modalVisible, setModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const fabScale = useRef(new Animated.Value(1)).current;

    const activeTeamId =
        params.teamId ?? currentTeamId ?? teams[0]?.id ?? "";

    useTeamStream(activeTeamId);
    useTeamGuard(activeTeamId);

    useEffect(() => {
        if (activeTeamId) {
            setCurrentTeam(activeTeamId);
            loadTasks();
        }
    }, [activeTeamId]);

    async function loadTasks() {
        if (!activeTeamId) return;
        setTasksLoading(true);
        try {
            const data = await apiFetch<Task[]>(`/api/tasks/team/${activeTeamId}`);
            setTasks(activeTeamId, data);
        } catch { } finally {
            setTasksLoading(false);
        }
    }



    const handleTaskPress = useCallback((task: Task) => {
        setEditingTask(task);
        setSelectedDate(null);
        setModalVisible(true);
    }, []);

    const handleSlotPress = useCallback((date: string) => {
        setEditingTask(null);
        setSelectedDate(date);
        setModalVisible(true);
    }, []);

    const handleCreatePress = useCallback(() => {
        Animated.sequence([
            Animated.timing(fabScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
            Animated.timing(fabScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setEditingTask(null);
        setSelectedDate(null);
        setModalVisible(true);
    }, [fabScale]);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
        setEditingTask(null);
        setSelectedDate(null);
    }, []);

    const handleTaskCreated = useCallback(() => {
        useTasksStore.getState().setToastMessage("Task created");
    }, []);

    if (!activeTeamId) {
        return (
            <View style={[styles.centered, { backgroundColor: c.background }]}>
                <Text style={[{ color: c.icon }]}>Select a team from Home → My Teams</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
            {tasksLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : (
                <CalendarBoard
                    tasks={tasks}
                    onTaskPress={handleTaskPress}
                    onSlotPress={handleSlotPress}
                    isDark={isDark}
                />
            )}

            <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
                <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={handleCreatePress}>
                    <Text style={styles.fabText}>+</Text>
                </Pressable>
            </Animated.View>

            <TaskModal
                visible={modalVisible}
                teamId={activeTeamId}
                onClose={handleCloseModal}
                editTask={editingTask}
                initialDate={selectedDate}
                onTaskCreated={handleTaskCreated}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    fabContainer: {
        position: "absolute",
        bottom: 24,
        right: 24,
    },
    fab: {
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
