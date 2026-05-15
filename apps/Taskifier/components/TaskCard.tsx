import React, { useRef, useCallback } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "@taskifier/types";
import { Colors } from "../constants/theme";

interface TaskCardProps {
    task: Task;
    highlight?: boolean;
    badgeLabel: string;
    showDoneButton?: boolean;
    showDeleteButton?: boolean;
    isCompleted: boolean;
    isDark: boolean;
    onPress: () => void;
    onToggleComplete: () => void;
    onDelete?: () => void;
}

export function TaskCard({
    task,
    highlight = false,
    badgeLabel,
    showDoneButton = false,
    showDeleteButton = false,
    isCompleted,
    isDark,
    onPress,
    onToggleComplete,
    onDelete,
}: TaskCardProps) {
    const c = isDark ? Colors.dark : Colors.light;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            damping: 20,
            stiffness: 300,
            useNativeDriver: true,
        }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            damping: 15,
            stiffness: 250,
            useNativeDriver: true,
        }).start();
    }, [scaleAnim]);

    // Return a single date+time string. Prefer calendarStart (and calendarEnd when set), otherwise fall back to createdAt.
    function formatPrimaryDateTime(
        calendarStart: string | null | undefined,
        calendarEnd: string | null | undefined,
        createdAt?: string,
    ): string {
        if (calendarStart) {
            const s = new Date(calendarStart);
            const startDate = s.toLocaleDateString();
            const startTime = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            if (calendarEnd) {
                const e = new Date(calendarEnd);
                const endDate = e.toLocaleDateString();
                const endTime = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                // If start and end are on same date, show: date start - end
                if (startDate === endDate) {
                    return `${startDate} ${startTime} - ${endTime}`;
                }
                return `${startDate} ${startTime} - ${endDate} ${endTime}`;
            }
            return `${startDate} ${startTime}`;
        }
        if (createdAt) {
            const d = new Date(createdAt);
            return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }
        return "";
    }

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                style={[
                    styles.taskCard,
                    { backgroundColor: c.card, borderLeftColor: isCompleted ? c.success : c.primary },
                    highlight && { backgroundColor: c.primaryLight },
                ]}
            >
                <View style={styles.taskContent}>
                    <Text
                        style={[
                            styles.taskTitle,
                            { color: c.text },
                            isCompleted && { textDecorationLine: "line-through", color: c.icon },
                        ]}
                        numberOfLines={2}
                    >
                        {task.title}
                    </Text>
                    {task.description && (
                        <Text style={[styles.taskDesc, { color: c.icon }]} numberOfLines={2}>
                            {task.description}
                        </Text>
                    )}
                    <View style={styles.taskMeta}>
                        <Text style={[styles.dateText, { color: c.icon }]}>{formatPrimaryDateTime(task.calendarStart, task.calendarEnd, task.createdAt)}</Text>
                        <View style={[styles.assigneeBadge, { backgroundColor: c.subtleBg }]}>
                            <Text style={[styles.assigneeText, { color: c.icon }]}>{badgeLabel}</Text>
                        </View>
                        {isCompleted && (
                            <View style={[styles.statusBadge, { backgroundColor: c.successLight }]}>
                                <Text style={[styles.statusText, { color: c.success }]}>Done</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.taskActions}>
                    {showDoneButton ? (
                        <Pressable
                            style={[
                                styles.actionChip,
                                { backgroundColor: isCompleted ? c.successLight : c.primaryLight },
                            ]}
                            onPress={onToggleComplete}
                        >
                            <Text style={[styles.actionChipText, { color: isCompleted ? c.success : c.primary }]}>
                                {isCompleted ? "✓" : "Done"}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={[styles.actionChip, { backgroundColor: "transparent", opacity: 0 }]} />
                    )}
                    {showDeleteButton && (
                        <Pressable
                            style={[styles.actionChip, { backgroundColor: c.dangerLight }]}
                            onPress={onDelete}
                        >
                            <Text style={[styles.actionChipText, { color: c.danger }]}>✕</Text>
                        </Pressable>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    taskCard: {
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    taskContent: { flex: 1, gap: 6 },
    taskTitle: { fontSize: 15, fontWeight: "600" },
    taskDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
    taskMeta: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" },
    assigneeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    assigneeText: { fontSize: 11, fontWeight: "500" },
    dateText: { fontSize: 11, fontStyle: "italic" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: "600" },
    timeText: { fontSize: 11 },
    taskActions: { gap: 6 },
    actionChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: "center",
        minWidth: 36,
    },
    actionChipText: { fontSize: 12, fontWeight: "700" },
});
