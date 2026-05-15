import { useTasksStore } from "@/store/tasks";
import { Colors } from "@/constants/theme";

export function useColors() {
    const theme = useTasksStore((s) => s.theme);
    const isDark = theme === "dark";
    const colors = isDark ? Colors.dark : Colors.light;
    return { colors, isDark };
}
