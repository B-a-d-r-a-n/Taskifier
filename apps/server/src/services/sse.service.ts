import type { Response } from "express";
import type { SSEEvent } from "@taskifier/types";

const clients = new Map<string, Set<Response>>();

export function subscribe(teamId: string, res: Response): void {
    const existing = clients.get(teamId) ?? new Set<Response>();
    existing.add(res);
    clients.set(teamId, existing);
}

export function unsubscribe(teamId: string, res: Response): void {
    const existing = clients.get(teamId);
    if (existing) {
        existing.delete(res);
        if (existing.size === 0) {
            clients.delete(teamId);
        }
    }
}

export function broadcast(teamId: string, event: SSEEvent): void {
    const existing = clients.get(teamId);
    if (!existing || existing.size === 0) return;

    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;

    for (const res of existing) {
        res.write(payload);
    }
}

export function getConnectionCount(teamId: string): number {
    return clients.get(teamId)?.size ?? 0;
}

export function resetForTest(): void {
    clients.clear();
}
