import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useTasksStore } from "@/store/tasks";

export default function AuthLayout() {
    const router = useRouter();
    const userId = useTasksStore((s) => s.userId);

    useEffect(() => {
        if (userId) {
            Promise.resolve().then(() => {
                router.replace("/(app)/(tabs)/home/my-tasks" as any);
            });
        }
    }, [userId, router]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
        </Stack>
    );
}
