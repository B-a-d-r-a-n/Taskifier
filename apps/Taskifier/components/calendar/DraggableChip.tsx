import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import { StyleSheet, Text } from "react-native";
import type { Task } from "@taskifier/types";
import type { Colors } from "@/constants/theme";

interface DraggableChipProps {
    task: Task;
    c: typeof Colors.light;
    onChipTap?: (task: Task) => void;
    isSelected?: boolean;
}

export function DraggableChip({ task, c, onChipTap, isSelected }: DraggableChipProps) {
    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            runOnJS(onChipTap ?? (() => { }))(task);
        });

    return (
        <GestureDetector gesture={tapGesture}>
            <Animated.View
                style={[
                    styles.draggableChip,
                    {
                        backgroundColor: isSelected ? c.primaryLight : c.card,
                        borderLeftColor: task.completed ? c.success : c.primary,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.draggableChipText,
                        { color: c.text },
                        task.completed && { textDecorationLine: "line-through", color: c.icon },
                    ]}
                    numberOfLines={1}
                >
                    {task.title}
                </Text>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    draggableChip: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
        marginBottom: 2,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    draggableChipText: { fontSize: 12, fontWeight: "600" },
});
