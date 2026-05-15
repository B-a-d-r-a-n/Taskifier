import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface FieldErrorProps {
    message?: string | null;
}

export function FieldError({ message }: FieldErrorProps) {
    const { colors: c } = useColors();
    const slideAnim = useRef(new Animated.Value(-20)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (message) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 14,
                    stiffness: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(-20);
            opacityAnim.setValue(0);
        }
    }, [message]);

    if (!message) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: c.dangerLight,
                    opacity: opacityAnim,
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            <View style={[styles.accent, { backgroundColor: c.danger }]} />
            <Text style={[styles.icon]}>✕</Text>
            <Text style={[styles.text, { color: c.danger }]}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 6,
        marginTop: 6,
        overflow: "hidden",
    },
    accent: {
        width: 3,
        alignSelf: "stretch",
    },
    icon: {
        fontSize: 11,
        color: "#ef4444",
        fontWeight: "700",
        marginLeft: 8,
    },
    text: {
        fontSize: 12,
        fontWeight: "500",
        paddingVertical: 6,
        paddingRight: 10,
        paddingLeft: 4,
        flex: 1,
    },
});
