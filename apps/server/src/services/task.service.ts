import { serverEnv } from "@taskifier/env/server";
import type { Task } from "@taskifier/types";

const env = serverEnv.parse(process.env);

export async function callActionable(
    title: string,
    description: string | null | undefined,
): Promise<string> {
    try {
        const response = await fetch(`${env.AI_SERVICE_URL}/actionable`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
            signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
            throw new Error(`AI service returned ${response.status}`);
        }

        const data = (await response.json()) as { actionable: string };
        return data.actionable;
    } catch {
        // AI is a non-critical enhancement — gracefully degrade rather than fail the request
        return "not available right now";
    }
}

export function formatSSEEvent(event: Task): string {
    return `event: task:updated\ndata: ${JSON.stringify(event)}\n\n`;
}
