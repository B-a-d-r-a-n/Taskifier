export interface ConfirmConfig {
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
}

export type CalendarView = "year" | "month" | "week" | "day";
