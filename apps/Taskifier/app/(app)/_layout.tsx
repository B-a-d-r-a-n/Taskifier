import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useTasksStore } from "@/store/tasks";
import { apiFetch } from "@/services/api";
import type { Team } from "@taskifier/types";

export default function AppLayout() {
    const router = useRouter();
    const userId = useTasksStore((s) => s.userId);
    const setTeams = useTasksStore((s) => s.setTeams);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);

    useEffect(() => {
        // Auth guard: double-check beyond the root layout — redirect unauthenticated users to login
        if (!userId) {
            Promise.resolve().then(() => {
                router.replace("/(auth)/login" as any);
            });
            return;
        }
        apiFetch<{ id: string; teams: Team[] }>("/api/me")
            .then((data) => {
                setTeams(data.teams);
                if (data.teams.length > 0) {
                    setCurrentTeam(data.teams[0].id);
                }
            })
            .catch(() => { });
    }, [userId, router]);

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}
