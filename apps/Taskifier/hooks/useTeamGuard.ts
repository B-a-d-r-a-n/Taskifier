import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useTasksStore } from "@/store/tasks";

export function useTeamGuard(activeTeamId: string) {
    const router = useRouter();
    const kickedFromTeam = useTasksStore((s) => s.kickedFromTeam);

    useEffect(() => {
        if (kickedFromTeam && kickedFromTeam === activeTeamId) {
            router.replace("/(app)/(tabs)/home/my-teams" as any);
        }
    }, [kickedFromTeam, activeTeamId]);
}
