import { Platform } from "react-native";

const tintColorLight = "#6366f1";
const tintColorDark = "#818cf8";

// Semantic color tokens: every UI element references these keys rather than hardcoded colors.
// Components consume them via the useColors() hook which selects the active theme automatically.
export const Colors = {
    light: {
        text: "#11181C",
        background: "#fff",
        tint: tintColorLight,
        icon: "#687076",
        tabIconDefault: "#687076",
        tabIconSelected: tintColorLight,
        card: "#ffffff",
        border: "#e5e7eb",
        inputBg: "#f9fafb",
        subtleBg: "#f3f4f6",
        primary: "#6366f1",
        primaryLight: "#e0e7ff",
        success: "#22c55e",
        successLight: "#dcfce7",
        warning: "#f59e0b",
        danger: "#ef4444",
        dangerLight: "#fef2f2",
    },
    dark: {
        text: "#ECEDEE",
        background: "#0f172a",
        tint: tintColorDark,
        icon: "#9BA1A6",
        tabIconDefault: "#9BA1A6",
        tabIconSelected: tintColorDark,
        card: "#1e293b",
        border: "#334155",
        inputBg: "#1e293b",
        subtleBg: "#1e293b",
        primary: "#818cf8",
        primaryLight: "#312e81",
        success: "#4ade80",
        successLight: "#14532d",
        warning: "#fbbf24",
        danger: "#f87171",
        dangerLight: "#450a0a",
    },
};

export const Fonts = Platform.select({
    ios: {
        sans: "system-ui",
        serif: "ui-serif",
        rounded: "ui-rounded",
        mono: "ui-monospace",
    },
    default: {
        sans: "normal",
        serif: "serif",
        rounded: "normal",
        mono: "monospace",
    },
    web: {
        sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        rounded:
            "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
        mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
});
