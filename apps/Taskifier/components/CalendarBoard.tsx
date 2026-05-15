import React, { useMemo, useState, useCallback } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { Task } from "@taskifier/types";
import type { CalendarView } from "../types";
import { Colors } from "../constants/theme";
import { WEEKDAYS, MONTHS, HOUR_LABELS, ROW_HEIGHT } from "../constants/dates";
import { DraggableChip } from "./calendar/DraggableChip";
import {
    toDateStr,
    startOfWeek,
    addDays,
    daysInMonth,
    getTaskHour,
    tasksByDateMap,
} from "./calendar/utils";

export type { CalendarView };

interface CalendarBoardProps {
    tasks: Task[];
    onTaskPress: (task: Task) => void;
    onSlotPress: (date: string) => void;
    isDark: boolean;
}

export function CalendarBoard({ tasks, onTaskPress, onSlotPress, isDark }: CalendarBoardProps) {
    const [view, setView] = useState<CalendarView>("week");
    const [cursor, setCursor] = useState(new Date());

    const c = isDark ? Colors.dark : Colors.light;

    const todayStr = useMemo(() => toDateStr(new Date()), []);
    const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
    const currentMonth = cursor.getMonth();
    const currentYear = cursor.getFullYear();


    const tasksByDate = useMemo(() => tasksByDateMap(tasks), [tasks]);

    const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

    const handleChipTap = useCallback((task: Task) => {
        if (selectedChipId === task.id) {
            onTaskPress(task);
        } else {
            setSelectedChipId(task.id);
        }
    }, [selectedChipId, onTaskPress]);

    const handleSlotPressWrapper = useCallback((date: string) => {
        setSelectedChipId(null);
        onSlotPress(date);
    }, [onSlotPress]);

    // Shift the cursor by one viewport in the given direction.
    // The step size depends on the current view (day=1d, week=7d, month=1m, year=1y).
    function navigate(direction: -1 | 1) {
        const newDate = new Date(cursor);
        switch (view) {
            case "day":
                newDate.setDate(newDate.getDate() + direction);
                break;
            case "week":
                newDate.setDate(newDate.getDate() + direction * 7);
                break;
            case "month":
                newDate.setMonth(newDate.getMonth() + direction);
                break;
            case "year":
                newDate.setFullYear(newDate.getFullYear() + direction);
                break;
        }
        setCursor(newDate);
    }

    // When zooming from week into day: if the cursor is still on this week's Monday,
    // jump to today instead so the user lands on the current day.
    const handleViewChange = useCallback((newView: CalendarView) => {
        if (view === "week" && newView === "day") {
            const today = new Date();
            const thisWeekStart = startOfWeek(today);
            if (toDateStr(cursor) === toDateStr(thisWeekStart)) {
                setCursor(today);
            }
        }
        setView(newView);
    }, [view, cursor]);

    const navigateToWeek = useCallback((weekStartDate: Date) => {
        setCursor(weekStartDate);
        setView("week");
        setSelectedChipId(null);
    }, []);

    const viewLabel = useMemo(() => {
        switch (view) {
            case "day":
                return cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
            case "week": {
                const end = addDays(weekStart, 6);
                return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
            }
            case "month":
                return `${MONTHS[currentMonth]} ${currentYear}`;
            case "year":
                return `${currentYear}`;
        }
    }, [view, cursor, weekStart, currentMonth, currentYear]);

    const viewSwitcher = (
        <View style={[styles.viewSwitcher, { backgroundColor: c.subtleBg }]}>
            {(["year", "month", "week", "day"] as CalendarView[]).map((v) => (
                <Pressable
                    key={v}
                    style={[styles.viewBtn, view === v && { backgroundColor: c.primary }]}
                    onPress={() => { setSelectedChipId(null); handleViewChange(v); }}
                >
                    <Text style={[styles.viewBtnText, { color: view === v ? "#fff" : c.text }]}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Text>
                </Pressable>
            ))}
        </View>
    );

    const navBar = (
        <View style={styles.navBar}>
            <Pressable onPress={() => navigate(-1)} style={[styles.navBtn, { backgroundColor: c.card }]}>
                <Text style={[styles.navBtnText, { color: c.text }]}>◀</Text>
            </Pressable>
            <Pressable onPress={() => setCursor(new Date())}>
                <Text style={[styles.navLabel, { color: c.text }]}>{viewLabel}</Text>
            </Pressable>
            <Pressable onPress={() => navigate(1)} style={[styles.navBtn, { backgroundColor: c.card }]}>
                <Text style={[styles.navBtnText, { color: c.text }]}>▶</Text>
            </Pressable>
        </View>
    );

    // ─── DAY VIEW (24-hour grid) ─────────────────────────
    // Buckets tasks by hour, sorts within each bucket:
    // - :00 tasks sorted newest-first
    // - Otherwise by minute, then newest-first
    function renderDayView() {
        const dateStr = toDateStr(cursor);
        const dayTasks = tasksByDate[dateStr] ?? [];

        const tasksByHour: Task[][] = Array.from({ length: 24 }, () => []);
        for (const t of dayTasks) {
            const h = getTaskHour(t);
            if (h !== null) tasksByHour[h].push(t);
        }
        for (const bucket of tasksByHour) {
            bucket.sort((a, b) => {
                // Tasks at :00 are sorted by newest first; otherwise by minute, then by newest
            const aMin = new Date(a.calendarStart!).getMinutes();
                const bMin = new Date(b.calendarStart!).getMinutes();
                if (aMin === 0 && bMin === 0) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                if (aMin !== bMin) return aMin - bMin;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }

        return (
            <ScrollView style={styles.viewContent}>
                <Pressable style={[styles.slotBtn, { borderColor: c.border }]} onPress={() => handleSlotPressWrapper(dateStr)}>
                    <Text style={[{ color: c.icon }]}>+ Add task for this day</Text>
                </Pressable>

                {HOUR_LABELS.map((label, hour) => {
                    const hourTasks = tasksByHour[hour];
                    return (
                        <View
                            key={hour}
                            style={[
                                styles.hourRow,
                                { borderTopColor: c.border },
                            ]}
                        >
                            <Text style={[styles.hourLabel, { color: c.icon }]}>{label}</Text>
                            <View style={styles.hourContent}>
                                {hourTasks.length > 0 ? (
                                    hourTasks.map((t) => (
                                        <DraggableChip
                                            key={t.id}
                                            task={t}
                                            c={c}
                                            onChipTap={handleChipTap}
                                            isSelected={selectedChipId === t.id}
                                        />
                                    ))
                                ) : (
                                    <Text style={[styles.hourEmpty, { color: c.icon }]}>—</Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        );
    }

    // ─── WEEK VIEW (7 columns, tasks positioned by hour offset) ───────────────────
    // Each column = 1 day with 24 hour-rows. Tasks are absolutely positioned
    // at the correct vertical offset. Multiple tasks at the same hour show a count badge.
    function renderWeekView() {
        const days = Array.from({ length: 7 }, (_, i) => {
            const dt = addDays(weekStart, i);
            const dateStr = toDateStr(dt);
            const dayTasks = tasksByDate[dateStr] ?? [];
            const sorted = [...dayTasks].sort((a, b) => {
                const ha = getTaskHour(a) ?? 24;
                const hb = getTaskHour(b) ?? 24;
                return ha - hb;
            });
            return { date: dateStr, label: WEEKDAYS[i], dayNum: dt.getDate(), tasks: sorted };
        });
        return (
            <ScrollView style={styles.viewContent}>
                <View style={[styles.weekGrid, { borderColor: c.border }]}>
                    {days.map((d) => (
                        <View key={d.date} style={[styles.weekCol, { borderColor: c.border }]}>
                            <View style={[styles.weekDayHeader, d.date === todayStr && { backgroundColor: c.primaryLight }]}>
                                <Text style={[styles.weekDayLabel, { color: c.icon }]}>{d.label}</Text>
                                <Text style={[styles.weekDayNum, { color: d.date === todayStr ? c.primary : c.text }]}>{d.dayNum}</Text>
                            </View>
                            <Pressable style={styles.weekSlot} onPress={() => handleSlotPressWrapper(d.date)}>
                                {HOUR_LABELS.map((_, hour) => (
                                    <View key={hour} style={[styles.weekHourRow, { borderColor: c.border }]} />
                                ))}
                                {(() => {
                                    const tasksByHour: Record<number, Task[]> = {};
                                    for (const task of d.tasks) {
                                        const h = getTaskHour(task) ?? 0;
                                        if (!tasksByHour[h]) tasksByHour[h] = [];
                                        tasksByHour[h].push(task);
                                    }
                                    return Object.entries(tasksByHour).map(([hourStr, hourTasks]) => {
                                        const hour = Number(hourStr);
                                        const topOffset = hour * ROW_HEIGHT;
                                        const chipOffset = topOffset + Math.round((ROW_HEIGHT - 28) / 2);
                                        if (hourTasks.length === 1) {
                                            const task = hourTasks[0];
                                            const taskDate = task.calendarStart ? new Date(task.calendarStart) : null;
                                            const mins = taskDate ? taskDate.getMinutes() : 0;
                                            return (
                                                <Pressable
                                                    key={task.id}
                                                    style={[
                                                        styles.weekTaskChip,
                                                        {
                                                            backgroundColor: task.completed ? c.successLight : c.primaryLight,
                                                            borderLeftColor: task.completed ? c.success : c.primary,
                                                            position: "absolute",
                                                            top: chipOffset,
                                                            left: 2,
                                                            right: 2,
                                                        },
                                                    ]}
                                                    onPress={() => onTaskPress(task)}
                                                >
                                                    {hour !== null && (
                                                        <Text style={[styles.weekTaskTime, { color: c.icon }]}>
                                                            {`${hour.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`}
                                                        </Text>
                                                    )}
                                                    <Text
                                                        style={[
                                                            styles.weekTaskText,
                                                            { color: c.text },
                                                            task.completed && { textDecorationLine: "line-through", color: c.icon },
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {task.title}
                                                    </Text>
                                                </Pressable>
                                            );
                                        }
                                        return (
                                            <View
                                                key={`h-${hour}`}
                                                style={[styles.weekMultiTaskIndicator, { position: "absolute", top: chipOffset, left: 2, right: 2 }]}
                                            >
                                                <View style={[styles.weekMultiDot, { backgroundColor: c.primary }]} />
                                                <Text style={[styles.weekMultiCount, { color: c.icon }]}>{hourTasks.length}</Text>
                                            </View>
                                        );
                                    });
                                })()}
                                <View style={styles.weekSlotHint}>
                                    <Text style={[{ color: c.icon, fontSize: 10 }]}>+</Text>
                                </View>
                            </Pressable>
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    }

    // ─── MONTH VIEW (day grid with task dots) ──────────────────────────
    // Shows up to 3 colored dots per day; overflow shows "+N".
    function renderMonthView() {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const totalDays = daysInMonth(currentYear, currentMonth);
        const weeks: { date: string; dayNum: number; tasks: Task[] }[][] = [];
        let week: { date: string; dayNum: number; tasks: Task[] }[] = [];
        for (let i = 0; i < startOffset; i++) week.push({ date: "", dayNum: 0, tasks: [] });
        for (let d = 1; d <= totalDays; d++) {
            const dt = new Date(currentYear, currentMonth, d);
            const dateStr = toDateStr(dt);
            week.push({ date: dateStr, dayNum: d, tasks: tasksByDate[dateStr] ?? [] });
            if (week.length === 7) { weeks.push(week); week = []; }
        }
        if (week.length > 0) {
            while (week.length < 7) week.push({ date: "", dayNum: 0, tasks: [] });
            weeks.push(week);
        }

        return (
            <ScrollView style={styles.viewContent}>
                <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((w) => (
                        <Text key={w} style={[styles.weekdayLabel, { color: c.icon }]}>{w}</Text>
                    ))}
                </View>
                {weeks.map((w, wi) => (
                    <View key={wi} style={styles.monthWeekRow}>
                        {w.map((day, di) => {
                            if (!day.date) return <View key={`empty-${di}`} style={styles.monthDayCell} />;
                            const isToday = day.date === todayStr;
                            return (
                                <Pressable
                                    key={day.date}
                                    style={[styles.monthDayCell, isToday && { backgroundColor: c.primaryLight }]}
                                    onPress={() => handleSlotPressWrapper(day.date)}
                                >
                                    <Text style={[styles.monthDayNum, { color: isToday ? c.primary : c.text }]}>
                                        {day.dayNum}
                                    </Text>
                                    {day.tasks.length > 0 && (
                                        <View style={styles.monthTaskIndicators}>
                                            {day.tasks.slice(0, 3).map((t) => (
                                                <View key={t.id} style={[styles.monthTaskDot, { backgroundColor: t.completed ? c.success : c.primary }]} />
                                            ))}
                                            {day.tasks.length > 3 && (
                                                <Text style={[styles.monthMoreDot, { color: c.icon }]}>+{day.tasks.length - 3}</Text>
                                            )}
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        );
    }

    // ─── YEAR VIEW (mini month grids, click a week row to jump to week view) ──────────
    // Each month is a card; week rows are tappable for drill-down.
    function renderYearView() {
        const months = Array.from({ length: 12 }, (_, m) => {
            const total = daysInMonth(currentYear, m);
            const firstDay = new Date(currentYear, m, 1);
            const startOffset = (firstDay.getDay() + 6) % 7;

            const weeks: { startDate: Date; days: { date: string; dayNum: number; taskCount: number }[] }[] = [];
            let currentDays: { date: string; dayNum: number; taskCount: number }[] = [];
            for (let i = 0; i < startOffset; i++) currentDays.push({ date: "", dayNum: 0, taskCount: 0 });
            for (let d = 1; d <= total; d++) {
                const dt = new Date(currentYear, m, d);
                const dateStr = toDateStr(dt);
                currentDays.push({ date: dateStr, dayNum: d, taskCount: (tasksByDate[dateStr] ?? []).length });
                if (currentDays.length === 7) {
                    weeks.push({ startDate: new Date(currentDays.find((c) => c.date)?.date || dt), days: currentDays });
                    currentDays = [];
                }
            }
            if (currentDays.length > 0) {
                while (currentDays.length < 7) currentDays.push({ date: "", dayNum: 0, taskCount: 0 });
                weeks.push({ startDate: new Date(currentDays.find((c) => c.date)?.date || firstDay), days: currentDays });
            }

            const monthTaskCount = weeks.reduce((sum, w) => sum + w.days.reduce((s, d) => s + d.taskCount, 0), 0);
            return { month: m, name: MONTHS[m].slice(0, 3), weeks, taskCount: monthTaskCount };
        });

        return (
            <ScrollView style={styles.viewContent}>
                <View style={styles.yearGrid}>
                    {months.map((m) => (
                        <View key={m.month} style={[styles.yearMonthCard, { backgroundColor: c.card }]}>
                            <View style={styles.yearMonthHeader}>
                                <Text style={[styles.yearMonthName, { color: c.text }]}>{m.name}</Text>
                                {m.taskCount > 0 && (
                                    <View style={[styles.yearMonthBadge, { backgroundColor: c.primaryLight }]}>
                                        <Text style={[styles.yearMonthBadgeText, { color: c.primary }]}>{m.taskCount}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={[styles.weeksHeader, { backgroundColor: c.subtleBg }]}>
                                {["M", "T", "W", "T", "F", "S", "S"].map((wd, i) => (
                                    <Text key={i} style={[styles.weeksHeaderText, { color: c.icon }]}>{wd}</Text>
                                ))}
                            </View>
                            {m.weeks.map((week, wi) => (
                                <Pressable
                                    key={wi}
                                    style={[styles.weekRow, wi % 2 !== 0 && { backgroundColor: c.subtleBg }]}
                                    onPress={() => navigateToWeek(week.startDate)}
                                >
                                    {week.days.map((day, di) => {
                                        if (!day.date) return <View key={`e-${di}`} style={styles.weekRowCell} />;
                                        return (
                                            <View key={day.date} style={styles.weekRowCell}>
                                                <Text style={[styles.weekRowDayNum, {
                                                    color: day.taskCount > 0 ? c.primary : c.text,
                                                    fontWeight: day.taskCount > 0 ? "700" : "400",
                                                }]}>
                                                    {day.dayNum}
                                                </Text>
                                                {day.taskCount > 0 && (
                                                    <View style={[styles.weekRowDot, { backgroundColor: c.primary }]} />
                                                )}
                                            </View>
                                        );
                                    })}
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={[styles.board, { backgroundColor: c.background }]}>
            {viewSwitcher}
            {navBar}
            {view === "day" && renderDayView()}
            {view === "week" && renderWeekView()}
            {view === "month" && renderMonthView()}
            {view === "year" && renderYearView()}
        </View>
    );
}

const styles = StyleSheet.create({
    board: { flex: 1 },
    viewContent: { padding: 12 },
    viewSwitcher: { flexDirection: "row", marginHorizontal: 12, marginTop: 8, borderRadius: 8, padding: 3 },
    viewBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: "center" },
    viewBtnText: { fontSize: 13, fontWeight: "600" },
    navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
    navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    navBtnText: { fontSize: 14 },
    navLabel: { fontSize: 16, fontWeight: "700" },

    // Day view — hour grid
    slotBtn: { borderWidth: 1, borderStyle: "dashed", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 10 },
    hourRow: {
        flexDirection: "row",
        minHeight: ROW_HEIGHT,
        borderTopWidth: 1,
    },
    hourLabel: { width: 48, fontSize: 11, fontWeight: "600", paddingTop: 4, paddingLeft: 4 },
    hourContent: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 3, paddingVertical: 3 },
    hourEmpty: { fontSize: 11, paddingLeft: 4 },


    // Week view
    weekGrid: { flexDirection: "row", borderWidth: 1, borderRadius: 8, overflow: "hidden" },
    weekCol: { flex: 1, borderRightWidth: 1 },
    weekDayHeader: { alignItems: "center", paddingVertical: 6, paddingHorizontal: 2, width: "100%" },
    weekDayLabel: { fontSize: 11, fontWeight: "600" },
    weekDayNum: { fontSize: 16, fontWeight: "700", marginTop: 2 },
    weekSlot: { width: "100%", minHeight: 24 * ROW_HEIGHT + 24, position: "relative" },
    weekHourRow: { height: ROW_HEIGHT, borderTopWidth: 0.5, borderStyle: "dashed" },
    weekTaskChip: {
        borderRadius: 6,
        padding: 6,
        paddingLeft: 8,
        zIndex: 10,
        alignItems: "center",
        justifyContent: "center",
        borderLeftWidth: 3,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    weekTaskTime: { fontSize: 9, fontWeight: "700", textAlign: "center", marginBottom: 1 },
    weekTaskText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
    weekMultiTaskIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, height: 20 },
    weekMultiDot: { width: 6, height: 6, borderRadius: 3 },
    weekMultiCount: { fontSize: 10, fontWeight: "700" },
    weekSlotHint: { position: "absolute", bottom: 4, left: 0, right: 0, alignItems: "center" },

    // Month view
    weekdayRow: { flexDirection: "row", marginBottom: 4, width: "100%" },
    weekdayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" },
    monthWeekRow: { flexDirection: "row", width: "100%" },
    monthDayCell: { flex: 1, alignItems: "center", paddingVertical: 4, minHeight: 48 },
    monthDayNum: { fontSize: 13, fontWeight: "500" },
    monthTaskIndicators: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2, flexWrap: "wrap", justifyContent: "center" },
    monthTaskDot: { width: 5, height: 5, borderRadius: 3 },
    monthMoreDot: { fontSize: 7, fontWeight: "600" },

    // Year view
    yearGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 2 },
    yearMonthCard: { width: "48%", borderRadius: 10, padding: 10, marginBottom: 10 },
    yearMonthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    yearMonthName: { fontSize: 14, fontWeight: "700" },
    yearMonthBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
    yearMonthBadgeText: { fontSize: 10, fontWeight: "700" },
    weeksHeader: { flexDirection: "row", borderRadius: 4, paddingVertical: 2, marginBottom: 2 },
    weeksHeaderText: { width: "14.28%", textAlign: "center", fontSize: 8, fontWeight: "600" },
    weekRow: { flexDirection: "row", borderRadius: 4, paddingVertical: 3, marginBottom: 1 },
    weekRowCell: { width: "14.28%", alignItems: "center", justifyContent: "center", paddingVertical: 1 },
    weekRowDayNum: { fontSize: 10 },
    weekRowDot: { width: 3, height: 3, borderRadius: 2, marginTop: 1 },
});
