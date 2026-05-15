import { useEffect, useRef, useCallback } from "react";
import { getSSEUrl, getAccessToken } from "../services/api";
import { useTasksStore } from "../store/tasks";
import type { SSEEvent } from "@taskifier/types";

const INITIAL_BACKOFF = 1_000;
const MAX_BACKOFF = 30_000;

type SSEListener = (event: string, data: string) => void;

interface SSESource {
    close: () => void;
}

/**
 * Creates a cross-platform SSE source.
 * - On web: uses native EventSource
 * - On native (React Native): uses fetch with ReadableStream + Authorization header
 */
const KNOWN_EVENT_TYPES: SSEEvent["type"][] = [
    "task:created",
    "task:updated",
    "task:deleted",
    "member:joined",
    "member:left",
    "member:promoted",
    "member:kicked",
    "team:invite-updated",
    "team:deleted",
];

function createSSE(
    url: string,
    token: string | null,
    options: { withCredentials?: boolean; headers?: Record<string, string> },
    onEvent: SSEListener,
    onError: () => void,
): SSESource {
    // Web EventSource can't set custom headers, so token is passed via ?token= query param.
    // Native (React Native) uses the Authorization header below instead.
    if (typeof EventSource !== "undefined") {
        const esUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
        const init: EventSourceInit = {};
        if (options.withCredentials) {
            init.withCredentials = true;
        }
        const es = new EventSource(esUrl, init);

        for (const type of KNOWN_EVENT_TYPES) {
            es.addEventListener(type, (e: MessageEvent) => {
                onEvent(type, e.data);
            });
        }

        es.addEventListener("error", () => {
            onError();
        });

        return { close: () => es.close() };
    }

    // React Native lacks EventSource — parse text/event-stream protocol manually from a ReadableStream
    let aborted = false;

    const connect = async () => {
        if (aborted) return;

        const headers: Record<string, string> = {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
            ...options.headers,
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const fetchOptions: RequestInit = {
            method: "GET",
            headers,
        };

        try {
            const res = await fetch(url, fetchOptions);

            if (aborted) return;
            if (!res.ok || !res.body) {
                onError();
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (!aborted) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse complete SSE events from buffer (per the SSE spec: event\n, data\n, then blank line)
                const lines = buffer.split("\n");
                // Keep the last incomplete line in the buffer for the next chunk
                buffer = lines.pop() ?? "";

                let eventType = "message";
                let data = "";

                for (const line of lines) {
                    if (line === "") {
                        // End of event
                        if (data) {
                            onEvent(eventType, data);
                        }
                        eventType = "message";
                        data = "";
                    } else if (line.startsWith("event:")) {
                        eventType = line.substring(6).trim();
                    } else if (line.startsWith("data:")) {
                        data += (data ? "\n" : "") + line.substring(5).trim();
                    }
                    // ignore other directives (retry, id, etc.)
                }
            }

            reader.releaseLock();
        } catch {}

        if (!aborted) {
            onError();
        }
    };

    connect();

    return {
        close: () => {
            aborted = true;
        },
    };
}

export function useTeamStream(teamId: string) {
    const sourceRef = useRef<SSESource | null>(null);
    const backoffRef = useRef(INITIAL_BACKOFF);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSSEEvent = useTasksStore((s) => s.handleSSEEvent);
    const setCurrentTeam = useTasksStore((s) => s.setCurrentTeam);

    const connect = useCallback(() => {
        if (!teamId) return;

        // Cancel any pending reconnection timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        setCurrentTeam(teamId);

        if (sourceRef.current) {
            sourceRef.current.close();
        }

        const url = getSSEUrl(teamId);
        const token = getAccessToken();

        const onEvent: SSEListener = (event, data) => {
            const type = event as SSEEvent["type"];
            if (!KNOWN_EVENT_TYPES.includes(type)) return;

            try {
                const payload = JSON.parse(data);
                const ev: SSEEvent = { type, payload } as SSEEvent;
                handleSSEEvent(ev);
            } catch {}
        };

        const onError = () => {
            sourceRef.current = null;
            const delay = backoffRef.current;
            backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);
            timerRef.current = setTimeout(connect, delay);
        };

        sourceRef.current = createSSE(url, token, { withCredentials: true }, onEvent, onError);
    }, [teamId, handleSSEEvent]);

    useEffect(() => {
        connect();
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            sourceRef.current?.close();
            sourceRef.current = null;
        };
    }, [connect]);
}