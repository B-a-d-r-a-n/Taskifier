export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const WEEKDAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"] as const;

export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
] as const;

export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
    `${i.toString().padStart(2, "0")}:00`,
);

export const HOURS = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
);

export const MINUTES = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
);

// Height in pixels for each one-hour row in the day/week calendar views.
// Used for positioning task chips at the correct vertical offset.
export const ROW_HEIGHT = 52;
