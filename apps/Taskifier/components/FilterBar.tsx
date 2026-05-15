import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface FilterBarProps {
    showPlaced: boolean;
    setShowPlaced: (v: boolean) => void;
    showCompleted: boolean;
    setShowCompleted: (v: boolean) => void;
}

export function FilterBar({
    showPlaced,
    setShowPlaced,
    showCompleted,
    setShowCompleted,
}: FilterBarProps) {
    const { colors: c } = useColors();

    return (
        <View style={styles.headerActions}>
            <Pressable
                style={[styles.toggleBtn, { backgroundColor: c.subtleBg }]}
                onPress={() => setShowPlaced(!showPlaced)}
            >
                <Text style={[styles.toggleLabel, { color: c.icon }]}>
                    {showPlaced ? "Hide" : "Show"} placed
                </Text>
            </Pressable>
            <Pressable
                style={[styles.toggleBtn, { backgroundColor: c.subtleBg }]}
                onPress={() => setShowCompleted(!showCompleted)}
            >
                <Text style={[styles.toggleLabel, { color: c.icon }]}>
                    {showCompleted ? "Hide" : "Show"} done
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    headerActions: { flexDirection: "row", gap: 6 },
    toggleBtn: { borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
    toggleLabel: { fontSize: 11, fontWeight: "600" },
});
