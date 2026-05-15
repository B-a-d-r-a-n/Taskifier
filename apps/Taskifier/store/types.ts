import type { Task, Team, TeamMember, User, Role, SSEEvent } from "@taskifier/types";

export interface TaskSlice {
    tasks: Record<string, Task[]>;
    myTasks: Task[];
    setTasks: (teamId: string, tasks: Task[]) => void;
    setMyTasks: (tasks: Task[]) => void;
    addTask: (task: Task) => void;
    updateTask: (task: Task) => void;
    deleteTask: (taskId: string) => void;
}

export interface TeamSlice {
    currentTeamId: string | null;
    teams: Team[];
    setCurrentTeam: (teamId: string) => void;
    setTeams: (teams: Team[]) => void;
}

export interface MemberSlice {
    members: Record<string, TeamMember[]>;
    setMembers: (teamId: string, members: TeamMember[]) => void;
    addMember: (userId: string, user: User, teamId?: string) => void;
    removeMember: (userId: string, teamId?: string) => void;
    clearTeamMembers: (teamId: string) => void;
    promoteMember: (userId: string, user: User, teamId: string) => void;
}

export interface UISlice {
    userId: string | null;
    isLoading: boolean;
    error: string | null;
    theme: "light" | "dark";
    kickedFromTeam: string | null;
    toastMessage: string | null;
    setUserId: (userId: string | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setTheme: (theme: "light" | "dark") => void;
    setKickedFromTeam: (teamId: string | null) => void;
    setToastMessage: (message: string | null) => void;
}

export interface SSESlice {
    handleSSEEvent: (event: SSEEvent) => void;
    reset: () => void;
}

export type StoreState = TaskSlice & TeamSlice & MemberSlice & UISlice & SSESlice;
