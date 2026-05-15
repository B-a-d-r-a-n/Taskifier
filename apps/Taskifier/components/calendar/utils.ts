import type { Task } from "@taskifier/types";

export function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// Monday-based week: getDay() returns 0 for Sunday, so the offset is day - 1,
// except when day === 0 (Sunday) where we need to go 6 days back.
export function startOfWeek(d: Date): Date {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    dt.setHours(0, 0, 0, 0);
    return dt;
}

export function addDays(d: Date, n: number): Date {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt;
}

export function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

export function isoToLocalDateStr(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function getTasksForDate(tasks: Task[], dateStr: string): Task[] {
    return tasks.filter((t) => {
        if (!t.calendarStart) return false;
        return isoToLocalDateStr(t.calendarStart) === dateStr;
    });
}

export function getTaskHour(task: Task): number | null {
    if (!task.calendarStart) return null;
    return new Date(task.calendarStart).getHours();
}

export function tasksByDateMap(tasks: Task[]): Record<string, Task[]> {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
        if (!task.calendarStart) continue;
        const dateStr = isoToLocalDateStr(task.calendarStart);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(task);
    }
    return map;
}
