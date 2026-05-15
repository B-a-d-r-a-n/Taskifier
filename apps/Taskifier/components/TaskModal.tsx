import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { GlimmerButton } from "./GlimmerButton";
import { apiFetch } from "../services/api";
import { useTasksStore } from "../store/tasks";
import type { Task, TeamMember } from "@taskifier/types";
import { useColors } from "../hooks/useColors";
import { HOURS, MINUTES } from "../constants/dates";
import { SimpleDatePicker } from "./SimpleDatePicker";
import { FieldError } from "./FieldError";
import { taskFormSchema, type TaskFormData, type FormErrors, parseErrors } from "../validations/taskForm";

interface TaskModalProps {
    visible: boolean;
    teamId: string;
    onClose: () => void;
    editTask?: Task | null;
    initialDate?: string | null;
    onTaskCreated?: () => void;
    onTaskUpdated?: () => void;
}

const emptyForm: TaskFormData = {
    title: "",
    description: "",
    calendarStart: "",
    calendarStartHour: "08",
    calendarStartMinute: "00",
    calendarEnd: "",
    calendarEndHour: "17",
    calendarEndMinute: "00",
    assignedToId: "",
};

function formatDateForInput(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${day}`;
    } catch { return ""; }
}

function formatTimeForInput(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.getHours().toString().padStart(2, "0");
    } catch { return ""; }
}

// Clamp hour to [0,23] and minute to [0,59] — users can type arbitrary values in the time inputs
function buildISO(dateStr: string, hourStr: string, minuteStr: string): string {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const h = Math.max(0, Math.min(23, parseInt(hourStr, 10) || 0));
    const min = Math.max(0, Math.min(59, parseInt(minuteStr, 10) || 0));
    return new Date(y, m - 1, d, h, min, 0).toISOString();
}

export function TaskModal({
    visible,
    teamId,
    onClose,
    editTask,
    initialDate,
    onTaskCreated,
    onTaskUpdated,
}: TaskModalProps) {
    const { colors: c, isDark } = useColors();
    const userId = useTasksStore((s) => s.userId);
    const updateTask = useTasksStore((s) => s.updateTask);
    const addTask = useTasksStore((s) => s.addTask);

    const [form, setForm] = useState<TaskFormData>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [members, setMembers] = useState<TeamMember[]>([]);

    const teamTasks = useTasksStore((s) => s.tasks[teamId]);
    // Client-side calendar conflict detection: checks if the proposed time slot overlaps
    // with any existing task on the same date by comparing hour-minute ranges.
    // This is a UX courtesy — there is no server-side enforcement.
    const conflicts = useMemo(() => {
        if (!form.calendarStart || !form.calendarEnd) return [];
        const startMinutes = parseInt(form.calendarStartHour, 10) * 60 + parseInt(form.calendarStartMinute, 10);
        const endMinutes = parseInt(form.calendarEndHour, 10) * 60 + parseInt(form.calendarEndMinute, 10);
        return (teamTasks ?? []).filter((t) => {
            if (!t.calendarStart) return false;
            if (editTask && t.id === editTask.id) return false;
            const taskDate = t.calendarStart.split("T")[0];
            if (taskDate !== form.calendarStart) return false;
            const d = new Date(t.calendarStart);
            const taskMinutes = d.getHours() * 60 + d.getMinutes();
            return taskMinutes >= startMinutes && taskMinutes < endMinutes;
        });
    }, [form.calendarStart, form.calendarStartHour, form.calendarStartMinute, form.calendarEnd, form.calendarEndHour, form.calendarEndMinute, teamTasks, editTask]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    // Fade the overlay before the sheet slides up — prevents a jarring "curtain" effect
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    function getMemberName(memberId: string | null | undefined): string {
        if (!memberId) return "Not assigned";
        if (memberId === userId) return "Myself";
        const m = members.find((mem) => mem.userId === memberId);
        return m?.user?.displayName ?? memberId.slice(0, 8);
    }

    const getInitialForm = useCallback((): TaskFormData => {
        if (editTask) {
            const h = editTask.calendarStart ? formatTimeForInput(editTask.calendarStart) : "08";
            return {
                title: editTask.title,
                description: editTask.description ?? "",
                calendarStart: formatDateForInput(editTask.calendarStart),
                calendarStartHour: h,
                calendarStartMinute: "00",
                calendarEnd: formatDateForInput(editTask.calendarEnd),
                calendarEndHour: "17",
                calendarEndMinute: "00",
                assignedToId: editTask.assignedToId ?? "",
            };
        }
        const now = new Date();
        const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
        const isToday = initialDate === today;
        return {
            ...emptyForm,
            calendarStart: initialDate ?? "",
            calendarStartHour: isToday ? now.getHours().toString().padStart(2, "0") : "00",
            calendarStartMinute: isToday ? now.getMinutes().toString().padStart(2, "0") : "00",
            assignedToId: userId ?? "",
        };
    }, [editTask, initialDate, userId]);

    useEffect(() => {
        if (visible) {
            setForm(getInitialForm());
            setErrors({});
            setSubmitting(false);
            setShowMemberPicker(false);
            // animate overlay fade-in to avoid curtain effect when sheet slides up
            overlayOpacity.setValue(0);
            Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
        }
    }, [visible, getInitialForm]);

    useEffect(() => {
        if (!visible || !teamId) return;
        setMembersLoading(true);
        apiFetch<TeamMember[]>(`/api/teams/${teamId}/members`)
            .then(setMembers)
            .catch(() => { })
            .finally(() => setMembersLoading(false));
    }, [visible, teamId]);

    const handleChange = useCallback((field: keyof TaskFormData, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    const handleAIMakeActionable = useCallback(async () => {
        if (!form.title.trim()) return;
        try {
            const { actionable } = await apiFetch<{ actionable: string }>(
                "/api/tasks/actionable",
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: form.title,
                        description: form.description || undefined,
                    }),
                },
            );
            setForm((f) => ({ ...f, description: actionable }));
        } catch {
            setErrors({ _general: "AI service unavailable" });
        }
    }, [form.title, form.description]);

    async function handleSubmit() {
        const result = taskFormSchema.safeParse(form);
        if (!result.success) {
            setErrors(parseErrors(result.error));
            return;
        }
        setSubmitting(true);
        setErrors({});
        try {
            const assignedTo = form.assignedToId === "" ? null : form.assignedToId;
            const startDate = form.calendarStart
                ? buildISO(form.calendarStart, form.calendarStartHour, form.calendarStartMinute)
                : undefined;
            const endDate = form.calendarEnd
                ? buildISO(form.calendarEnd, form.calendarEndHour, form.calendarEndMinute)
                : undefined;
            const payload: Record<string, unknown> = {
                title: form.title,
                description: form.description || null,
                assignedToId: assignedTo,
            };
            if (!editTask) {
                payload.teamId = teamId;
            }
            if (startDate) payload.calendarStart = startDate;
            if (endDate) payload.calendarEnd = endDate;

            if (editTask) {
                const updated = await apiFetch<Task>(`/api/tasks/${editTask.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
                updateTask(updated);
                onTaskUpdated?.();
            } else {
                const created = await apiFetch<Task>("/api/tasks", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                addTask(created);
                onTaskCreated?.();
            }
            setForm(emptyForm);
            onClose();
        } catch (err) {
            setErrors({ _general: err instanceof Error ? err.message : "Failed to save task" });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal
            visible={visible}
            onRequestClose={onClose}
            animationType="slide"
            transparent
        >
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                <View style={[styles.sheet, { backgroundColor: c.card }]}>
                    <ScrollView
                        style={styles.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: c.text }]}>
                                {editTask ? "Edit Task" : "New Task"}
                            </Text>
                            <Pressable onPress={onClose}>
                                <Text style={[styles.cancel, { color: c.icon }]}>Cancel</Text>
                            </Pressable>
                        </View>

                        {/* Title */}
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: c.text }]}>Title *</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { color: c.text, borderColor: errors.title ? c.danger : c.border, backgroundColor: c.inputBg },
                                ]}
                                value={form.title}
                                onChangeText={(v) => handleChange("title", v)}
                                placeholder="Task title"
                                placeholderTextColor={c.icon}
                                autoFocus
                            />
                            <FieldError message={errors.title} />
                        </View>

                        {/* Description + AI */}
                        <View style={styles.field}>
                            <View style={styles.labelRow}>
                                <Text style={[styles.label, { color: c.text }]}>Description</Text>
                                <GlimmerButton
                                    onPress={handleAIMakeActionable}
                                    onSuccess={(text) => setForm((f) => ({ ...f, description: text }))}
                                    onError={() => setErrors({ _general: "AI service unavailable" })}
                                    disabled={!form.title.trim()}
                                />
                            </View>
                            <TextInput
                                style={[styles.input, styles.textarea, { color: c.text, borderColor: c.border, backgroundColor: c.inputBg }]}
                                value={form.description}
                                onChangeText={(v) => handleChange("description", v)}
                                placeholder="Describe the task..."
                                placeholderTextColor={c.icon}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Start date + time */}
                        <Text style={[styles.label, { color: c.text }]}>Start date</Text>
                        <View style={styles.row}>
                            <View style={[styles.dateInputWrapper, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                                <Pressable style={styles.datePickerPrefix} onPress={() => setShowStartPicker((p) => !p)}>
                                    <Text style={[{ color: c.primary, fontSize: 16 }]}>📅</Text>
                                </Pressable>
                                <TextInput
                                    style={[styles.dateInputInner, { color: c.text }]}
                                    value={form.calendarStart}
                                    onChangeText={(v) => handleChange("calendarStart", v)}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={c.icon}
                                />
                            </View>
                            {form.calendarStart !== "" && (
                                <>
                                    <View style={[styles.timePickerColumn, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePickerContent}>
                                            {HOURS.map((h) => (
                                                <Pressable
                                                    key={h}
                                                    style={[styles.timeOption, form.calendarStartHour === h && { backgroundColor: c.primaryLight }]}
                                                    onPress={() => handleChange("calendarStartHour", h)}
                                                >
                                                    <Text style={[styles.timeOptionText, { color: form.calendarStartHour === h ? c.primary : c.text }]}>{h}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    <Text style={[styles.timeSeparator, { color: c.text }]}>:</Text>
                                    <View style={[styles.timePickerColumn, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePickerContent}>
                                            {MINUTES.map((m) => (
                                                <Pressable
                                                    key={m}
                                                    style={[styles.timeOption, form.calendarStartMinute === m && { backgroundColor: c.primaryLight }]}
                                                    onPress={() => handleChange("calendarStartMinute", m)}
                                                >
                                                    <Text style={[styles.timeOptionText, { color: form.calendarStartMinute === m ? c.primary : c.text }]}>{m}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </>
                            )}
                        </View>
                        <SimpleDatePicker
                            visible={showStartPicker}
                            currentDate={form.calendarStart ?? ""}
                            isDark={isDark}
                            onSelectDate={(ds) => handleChange("calendarStart", ds)}
                            onClose={() => setShowStartPicker(false)}
                        />
                        <SimpleDatePicker
                            visible={showEndPicker}
                            currentDate={form.calendarEnd ?? ""}
                            isDark={isDark}
                            onSelectDate={(ds) => handleChange("calendarEnd", ds)}
                            onClose={() => setShowEndPicker(false)}
                        />

                        {/* End date + time (hidden when no end date) */}
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: c.text }]}>End date (optional)</Text>
                            <View style={styles.row}>
                                <View style={[styles.dateInputWrapper, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                                    <Pressable style={styles.datePickerPrefix} onPress={() => setShowEndPicker((p) => !p)}>
                                        <Text style={[{ color: c.primary, fontSize: 16 }]}>📅</Text>
                                    </Pressable>
                                    <TextInput
                                        style={[styles.dateInputInner, { color: c.text }]}
                                        value={form.calendarEnd}
                                        onChangeText={(v) => handleChange("calendarEnd", v)}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={c.icon}
                                    />
                                </View>
                                {form.calendarEnd !== "" && (
                                    <>
                                        <View style={[styles.timePickerColumn, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePickerContent}>
                                                {HOURS.map((h) => (
                                                    <Pressable
                                                        key={h}
                                                        style={[styles.timeOption, form.calendarEndHour === h && { backgroundColor: c.primaryLight }]}
                                                        onPress={() => handleChange("calendarEndHour", h)}
                                                    >
                                                        <Text style={[styles.timeOptionText, { color: form.calendarEndHour === h ? c.primary : c.text }]}>{h}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                        <Text style={[styles.timeSeparator, { color: c.text }]}>:</Text>
                                        <View style={[styles.timePickerColumn, { borderColor: c.border, backgroundColor: c.inputBg }]}>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePickerContent}>
                                                {MINUTES.map((m) => (
                                                    <Pressable
                                                        key={m}
                                                        style={[styles.timeOption, form.calendarEndMinute === m && { backgroundColor: c.primaryLight }]}
                                                        onPress={() => handleChange("calendarEndMinute", m)}
                                                    >
                                                        <Text style={[styles.timeOptionText, { color: form.calendarEndMinute === m ? c.primary : c.text }]}>{m}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                        <SimpleDatePicker
                            visible={showEndPicker}
                            currentDate={form.calendarEnd ?? ""}
                            isDark={isDark}
                            onSelectDate={(ds) => handleChange("calendarEnd", ds)}
                            onClose={() => setShowEndPicker(false)}
                        />

                        <FieldError message={errors.calendarEnd} />

                        {/* Conflict warning */}
                        {conflicts.length > 0 && (
                            <View style={[styles.conflictBanner, { backgroundColor: c.subtleBg, borderColor: c.warning }]}>
                                <Text style={[styles.conflictText, { color: c.warning }]}>
                                    ⚠ Overlaps with {conflicts.length > 1 ? `${conflicts.length} tasks` : `"${conflicts[0].title}"`}
                                </Text>
                            </View>
                        )}

                        {/* Assigned to */}
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: c.text }]}>Assigned to</Text>
                            <Pressable
                                style={[styles.memberSelector, { backgroundColor: c.inputBg, borderColor: c.border }]}
                                onPress={() => setShowMemberPicker(true)}
                            >
                                <Text style={[{ color: c.text }]}>
                                    {getMemberName(form.assignedToId)}
                                </Text>
                            </Pressable>
                        </View>

                        {errors._general && <Text style={styles.error}>{errors._general}</Text>}

                        <Pressable
                            style={[
                                styles.submit,
                                { backgroundColor: c.primary },
                                (submitting || !form.title.trim()) && { opacity: 0.6 },
                            ]}
                            onPress={handleSubmit}
                            disabled={submitting || !form.title.trim()}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>
                                    {editTask ? "Save Changes" : "Create Task"}
                                </Text>
                            )}
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>

            <Modal
                visible={showMemberPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMemberPicker(false)}
            >
                <Pressable style={styles.memberOverlay} onPress={() => setShowMemberPicker(false)}>
                    <Pressable style={[styles.memberPopup, { backgroundColor: c.card }]} onPress={() => {}}>
                        <Text style={[styles.memberPopupTitle, { color: c.text }]}>Assign to</Text>
                        <Pressable
                            style={[styles.memberOption, form.assignedToId === "" && { backgroundColor: c.primaryLight }]}
                            onPress={() => {
                                handleChange("assignedToId", "");
                                setShowMemberPicker(false);
                            }}
                        >
                            <Text style={[{ color: c.icon }]}>Not assigned</Text>
                        </Pressable>
                        {membersLoading ? (
                            <ActivityIndicator size="small" color={c.primary} style={{ padding: 12 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 240 }}>
                                {members.map((item) => {
                                    const isMe = item.userId === userId;
                                    const isSelected = form.assignedToId === item.userId;
                                    return (
                                        <Pressable
                                            key={item.userId}
                                            style={[styles.memberOption, isSelected && { backgroundColor: c.primaryLight }]}
                                            onPress={() => {
                                                handleChange("assignedToId", item.userId);
                                                setShowMemberPicker(false);
                                            }}
                                        >
                                            <Text style={[{ color: c.text }]}>
                                                {isMe ? "Myself" : (item.user?.displayName ?? item.userId.slice(0, 8))}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
    },
    content: { padding: 20 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    title: { fontSize: 18, fontWeight: "700" },
    cancel: { fontSize: 16 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
    textarea: { minHeight: 80, paddingTop: 10 },
    row: { flexDirection: "row", gap: 10 },
    error: { color: "#ef4444", fontSize: 13, marginBottom: 12 },
    submit: {
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
    },
    submitText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    memberSelector: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
    },
    memberOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: 32,
    },
    memberPopup: {
        borderRadius: 14,
        padding: 16,
        width: "100%",
        maxWidth: 320,
        maxHeight: "70%",
    },
    memberPopupTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
    },
    memberOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginBottom: 2,
    },
    timePickerColumn: {
        borderWidth: 1,
        borderRadius: 8,
        height: 42,
        width: 88,
        overflow: "hidden",
    },
    timePickerContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    timeOption: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 4,
    },
    timeOptionText: {
        fontSize: 13,
        fontWeight: "600",
    },
    timeSeparator: {
        fontSize: 16,
        fontWeight: "700",
        paddingVertical: 10,
        paddingHorizontal: 2,
    },
    conflictBanner: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    conflictText: {
        fontSize: 12,
        fontWeight: "600",
    },
    dateInputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 8,
        paddingLeft: 8,
    },
    datePickerPrefix: {
        paddingRight: 6,
        paddingVertical: 10,
    },
    dateInputInner: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 10,
        paddingRight: 12,
    },
});
