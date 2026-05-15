import { prisma } from "../lib/prisma.js";
import type { Role } from "@taskifier/types";

export async function assertMember(
    userId: string,
    teamId: string,
): Promise<void> {
    const member = await prisma.teamMember.findFirst({
        where: { AND: [{ userId }, { teamId }] },
    });
    if (!member) {
        throw new TeamAccessDeniedError();
    }
}

export async function assertAdmin(
    userId: string,
    teamId: string,
): Promise<void> {
    const member = await prisma.teamMember.findFirst({
        where: { AND: [{ userId }, { teamId }] },
    });
    if (!member || member.role !== "ADMIN") {
        throw new TeamAccessDeniedError();
    }
}

export async function assertTeamExists(teamId: string): Promise<void> {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
        throw new TeamNotFoundError();
    }
}

export async function assertMemberWithRole(
    userId: string,
    teamId: string,
    requiredRole: Role,
): Promise<void> {
    const member = await prisma.teamMember.findFirst({
        where: { AND: [{ userId }, { teamId }] },
    });
    if (!member || member.role !== requiredRole) {
        throw new TeamAccessDeniedError();
    }
}

export class TeamAccessDeniedError extends Error {
    constructor() {
        super("Team access denied");
        this.name = "TeamAccessDeniedError";
    }
}

export class TeamNotFoundError extends Error {
    constructor() {
        super("Team not found");
        this.name = "TeamNotFoundError";
    }
}
