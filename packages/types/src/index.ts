export type Role = "ADMIN" | "MEMBER";

export interface User {
    id: string;
    emailHash: string;
    displayName: string;
    createdAt: string;
    updatedAt: string;
}

export interface Team {
    id: string;
    name: string;
    inviteCode: string;
    createdAt: string;
    updatedAt: string;
}

export interface TeamMember {
    id: string;
    userId: string;
    teamId: string;
    role: Role;
    joinedAt: string;
    user?: User;
    team?: Team;
}

export interface Task {
    id: string;
    teamId: string;
    title: string;
    description: string | null;
    completed: boolean;
    assignedToId: string | null;
    createdById: string;
    calendarStart: string | null;
    calendarEnd: string | null;
    createdAt: string;
    updatedAt: string;
    assignedTo?: User | null;
    createdBy?: User;
}

export interface ApiError {
    code: string;
    message: string;
}

export type SSEEvent =
    | { type: "task:created"; payload: Task }
    | { type: "task:updated"; payload: Task }
    | { type: "task:deleted"; payload: { id: string } }
    | { type: "member:joined"; payload: { userId: string; user: User; teamId: string } }
    | { type: "member:left"; payload: { userId: string; teamId: string } }
    | { type: "member:kicked"; payload: { userId: string; teamId: string } }
    | { type: "member:promoted"; payload: { userId: string; user: User; teamId: string } }
    | { type: "team:invite-updated"; payload: { teamId: string; inviteCode: string } }
    | { type: "team:deleted"; payload: { teamId: string } };

export interface JWTPayload {
    userId: string;
    emailHash: string;
    iat?: number;
    exp?: number;
}
