import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";
import { WEEKDAYS_SHORT, MONTHS } from "../constants/dates";

interface SimpleDatePickerProps {
    visible: boolean;
    onSelectDate: (dateStr: string) => void;
    onClose: () => void;
    currentDate: string;
    isDark: boolean;
}

export function SimpleDatePicker({
    visible,
    onSelectDate,
    onClose,
    currentDate,
    isDark,
}: SimpleDatePickerProps) {
    const c = isDark ? Colors.dark : Colors.light;
    const now = currentDate ? new Date(currentDate + "T12:00:00") : new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());

    if (!visible) return null;

    const todayStr = new Date().getFullYear() + "-" +
        (new Date().getMonth() + 1).toString().padStart(2, "0") + "-" +
        new Date().getDate().toString().padStart(2, "0");

    function daysInMonth(y: number, m: number): number {
        return new Date(y, m + 1, 0).getDate();
    }

    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = daysInMonth(year, month);
    const weeks: { dayNum: number; dateStr: string }[][] = [];
    let week: { dayNum: number; dateStr: string }[] = [];
    for (let i = 0; i < startOffset; i++) week.push({ dayNum: 0, dateStr: "" });
    for (let d = 1; d <= totalDays; d++) {
        const ds = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
        week.push({ dayNum: d, dateStr: ds });
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push({ dayNum: 0, dateStr: "" });
        weeks.push(week);
    }

    return (
        <View style={[styles.container, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.nav}>
                <Pressable onPress={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); } }}>
                    <Text style={[{ color: c.primary, fontSize: 16 }]}>◀</Text>
                </Pressable>
                <Text style={[styles.title, { color: c.text }]}>
                    {MONTHS[month]} {year}
                </Text>
                <Pressable onPress={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); } }}>
                    <Text style={[{ color: c.primary, fontSize: 16 }]}>▶</Text>
                </Pressable>
            </View>
            <View style={styles.weekdays}>
                {WEEKDAYS_SHORT.map((w) => (
                    <Text key={w} style={[styles.weekday, { color: c.icon }]}>{w}</Text>
                ))}
            </View>
            {weeks.map((w, wi) => (
                <View key={wi} style={styles.weekRow}>
                    {w.map((day, di) => {
                        if (!day.dateStr) return <View key={`e-${di}`} style={styles.dayCell} />;
                        const isToday = day.dateStr === todayStr;
                        const isSelected = day.dateStr === currentDate;
                        return (
                            <Pressable
                                key={day.dateStr}
                                style={[
                                    styles.dayCell,
                                    isToday && { backgroundColor: c.subtleBg },
                                    isSelected && { backgroundColor: c.primary },
                                ]}
                                onPress={() => { onSelectDate(day.dateStr); onClose(); }}
                            >
                                <Text style={[styles.dayNum, {
                                    color: isSelected ? "#fff" : isToday ? c.primary : c.text,
                                    fontWeight: isSelected || isToday ? "700" : "400",
                                }]}>
                                    {day.dayNum}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
    },
    nav: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
    },
    weekdays: {
        flexDirection: "row",
        marginBottom: 4,
    },
    weekday: {
        flex: 1,
        textAlign: "center",
        fontSize: 11,
        fontWeight: "600",
    },
    weekRow: {
        flexDirection: "row",
    },
    dayCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 4,
        borderRadius: 4,
    },
    dayNum: {
        fontSize: 12,
    },
});
