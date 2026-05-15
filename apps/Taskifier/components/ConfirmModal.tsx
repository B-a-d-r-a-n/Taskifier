import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "../hooks/useColors";
import { useTasksStore } from "../store/tasks";

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const { colors: c, isDark } = useColors();

    return (
        <Modal
            visible={visible}
            onRequestClose={onCancel}
            animationType="fade"
            transparent
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <Pressable
                    style={[styles.dialog, { backgroundColor: c.card }]}
                    onPress={() => {}}
                >
                    <Text style={[styles.title, { color: c.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: c.icon }]}>{message}</Text>
                    <View style={styles.actions}>
                        <Pressable
                            style={[styles.btn, { borderColor: c.border }]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.btnText, { color: c.text }]}>{cancelLabel}</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.btn,
                                { backgroundColor: destructive ? "#ef4444" : c.primary, borderColor: "transparent" },
                            ]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.btnText, { color: "#fff", fontWeight: "700" }]}>
                                {confirmLabel}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    dialog: {
        borderRadius: 14,
        padding: 20,
        width: "100%",
        maxWidth: 320,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
    },
    btn: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
        borderWidth: 1,
    },
    btnText: {
        fontSize: 14,
        fontWeight: "600",
    },
});
