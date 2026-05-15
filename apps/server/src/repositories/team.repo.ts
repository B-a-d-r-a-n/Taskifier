import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma.js";
import type { Team, TeamMember, Role } from "@taskifier/types";

export interface CreateTeamInput {
    name: string;
    userId: string;
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
    const team = await prisma.team.create({
        data: {
            name: input.name,
            // inv_ prefix makes invite codes human-recognizable; 64 hex chars = 256 bits of entropy
            inviteCode: `inv_${randomBytes(32).toString("hex")}`,
            members: {
                create: {
                    userId: input.userId,
                    role: "ADMIN" as Role,
                },
            },
        },
        include: { members: true },
    });

    return serializeTeam(team);
}

export async function findTeamById(id: string): Promise<Team | null> {
    const team = await prisma.team.findUnique({ where: { id } });
    return team ? serializeTeam(team) : null;
}

export async function findTeamByInviteCode(
    inviteCode: string,
): Promise<Team | null> {
    const team = await prisma.team.findUnique({ where: { inviteCode } });
    return team ? serializeTeam(team) : null;
}

export async function regenerateInviteCode(teamId: string): Promise<string> {
    const team = await prisma.team.update({
        where: { id: teamId },
        data: {
            inviteCode: `inv_${randomBytes(32).toString("hex")}`,
        },
        select: { inviteCode: true },
    });
    return team.inviteCode;
}

export async function addMember(
    userId: string,
    teamId: string,
    role: Role,
): Promise<TeamMember> {
    const member = await prisma.teamMember.create({
        data: { userId, teamId, role },
        include: { user: true },
    });
    return serializeTeamMember(member);
}

export async function removeMember(
    userId: string,
    teamId: string,
): Promise<void> {
    await prisma.teamMember.deleteMany({
        where: { userId, teamId },
    });
}

export async function unassignTeamTasks(
    userId: string,
    teamId: string,
): Promise<void> {
    await prisma.task.updateMany({
        where: { assignedToId: userId, teamId },
        data: { assignedToId: null },
    });
}

// Fairness: the member who joined earliest gets promoted to admin when the current admin leaves
export async function promoteOldestMember(
    teamId: string,
    excludeUserId?: string,
): Promise<string | null> {
    const oldest = await prisma.teamMember.findFirst({
        where: {
            teamId,
            ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        orderBy: { joinedAt: "asc" },
    });
    if (!oldest) return null;
    await prisma.teamMember.update({
        where: { id: oldest.id },
        data: { role: "ADMIN" },
    });
    return oldest.userId;
}

export async function countTeamMembers(teamId: string): Promise<number> {
    return prisma.teamMember.count({ where: { teamId } });
}

export async function deleteTeam(teamId: string): Promise<void> {
    await prisma.team.delete({ where: { id: teamId } });
}

export async function findMember(
    userId: string,
    teamId: string,
): Promise<TeamMember | null> {
    const member = await prisma.teamMember.findFirst({
        where: { AND: [{ userId }, { teamId }] },
        include: { user: true, team: true },
    });
    return member ? serializeTeamMember(member) : null;
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
    const members = await prisma.teamMember.findMany({
        where: { teamId },
        include: { user: true },
        orderBy: { joinedAt: "asc" },
    });
    return members.map(serializeTeamMember);
}

export async function listUserTeams(userId: string): Promise<Team[]> {
    const memberships = await prisma.teamMember.findMany({
        where: { userId },
        include: { team: true },
    });
    return memberships.map((m) => {
        if (!m.team) throw new Error("Unexpected: team not loaded");
        return serializeTeam(m.team);
    });
}

function serializeTeam(team: {
    id: string;
    name: string;
    inviteCode: string;
    createdAt: Date;
    updatedAt: Date;
}): Team {
    return {
        id: team.id,
        name: team.name,
        inviteCode: team.inviteCode,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
    };
}

function serializeTeamMember(member: {
     id: string;
     userId: string;
     teamId: string;
     role: Role;
     joinedAt: Date;
     user?: {
         id: string;
         emailHash: string;
         displayName: string;
         createdAt: Date;
         updatedAt: Date;
     };
     team?: {
         id: string;
         name: string;
         inviteCode: string;
         createdAt: Date;
         updatedAt: Date;
     };
 }): TeamMember {
     return {
         id: member.id,
         userId: member.userId,
         teamId: member.teamId,
         role: member.role,
         joinedAt: member.joinedAt.toISOString(),
             user: member.user
                 ? {
                       id: member.user.id,
                       emailHash: member.user.emailHash,
                       displayName: member.user.displayName,
                       createdAt: member.user.createdAt.toISOString(),
                       updatedAt: member.user.updatedAt.toISOString(),
                   }
                 : undefined,
         team: member.team
             ? {
                   id: member.team.id,
                   name: member.team.name,
                   inviteCode: member.team.inviteCode,
                   createdAt: member.team.createdAt.toISOString(),
                   updatedAt: member.team.updatedAt.toISOString(),
               }
             : undefined,
     };
 }
