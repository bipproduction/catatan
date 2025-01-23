```tsx
// SSEView.tsx

"use client";

import SSEClient, { ConnectionStatus, SSEViewProps } from "@/utils/sse-client";
import { SSEEvent } from "@/utils/sse-manager";
import { Stack, Text, Badge } from "@mantine/core";
import { useEffect, useState } from "react";

// Main Component
export default function SSEView({ projectId, onEvent }: SSEViewProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  useEffect(() => {
    const client = new SSEClient(projectId, setStatus, (event) => {
      if (event.message !== "heartbeat") {
        setLastEvent(event);
        onEvent?.(event);
      }
    });

    client.connect();

    window.addEventListener("online", () => client.connect());
    window.addEventListener("offline", () => setStatus("offline"));

    return () => {
      client.cleanup();
      window.removeEventListener("online", () => client.connect());
      window.removeEventListener("offline", () => setStatus("offline"));
    };
  }, [projectId, onEvent]);

  return (
    <Stack gap={16}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Text>Real-time Updates</Text>
        <Badge
          color={
            status === "connected"
              ? "green"
              : status === "connecting"
              ? "yellow"
              : status === "offline"
              ? "gray"
              : "red"
          }
        >
          {status}
        </Badge>
      </div>

      {lastEvent && lastEvent.message !== "heartbeat" && (
        <Text size="sm">{lastEvent.message}</Text>
      )}
    </Stack>
  );
}

```

```ts
// sse/index.ts

import sseManager, { SSEEvent } from "@/utils/sse-manager";
import Elysia, { t } from "elysia";

// SSE Routes
const SSE = new Elysia({ prefix: '/sse' })
    .post('/pub/:projectId', ({ params, body }) => {
        const event: SSEEvent = {
            type: body?.type as SSEEvent['type'] || 'info',
            projectId: params.projectId,
            message: body?.message as string || 'Update received',
            timestamp: Date.now(),
            data: body?.data ? JSON.parse(body.data as string) : undefined
        };

        sseManager.broadcast(event);
        return { success: true };
    }, {
        body: t.Object({
            type: t.String(),
            message: t.String(),
            data: t.Optional(t.String())
        })
    })
    .get('/sub/:projectId', ({ params }) => {
        return new Response(
            new ReadableStream({
                start(controller) {
                    const cleanup = sseManager.subscribe(params.projectId, controller);
                    return cleanup;
                }
            }),
            {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            }
        );
    })
    .get('/status', () => {
        return sseManager.getStatus();
    });

// Cleanup on process exit
process.on('SIGTERM', () => {
    console.log('[SSE] Cleaning up before exit');
    sseManager.cleanup();
});

process.on('SIGINT', () => {
    console.log('[SSE] Cleaning up before exit');
    sseManager.cleanup();
});

export default SSE;

```

```ts
// sse-client.ts

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Types
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'offline';

interface SSEEvent {
    type: 'deploy' | 'error' | 'info';
    projectId?: string;
    message: string;
    timestamp: number;
    data?: any;
}

interface SSEViewProps {
    projectId: string;
    onEvent?: (event: SSEEvent) => void;
}

// Simple SSE Client
class SSEClient {
    private eventSource: EventSource | null = null;
    private projectId: string;
    private onStatusChange: (status: ConnectionStatus) => void;
    private onMessage: (event: SSEEvent) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(
        projectId: string, 
        onStatusChange: (status: ConnectionStatus) => void,
        onMessage: (event: SSEEvent) => void
    ) {
        this.projectId = projectId;
        this.onStatusChange = onStatusChange;
        this.onMessage = onMessage;
    }

    connect() {
        if (!navigator.onLine) {
            this.onStatusChange('offline');
            return;
        }

        this.cleanup();
        this.onStatusChange('connecting');

        try {
            this.eventSource = new EventSource(`/api/v2/sse/sub/${this.projectId}`);

            this.eventSource.onopen = () => {
                this.onStatusChange('connected');
                this.reconnectAttempts = 0;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const parsedEvent: SSEEvent = JSON.parse(event.data);
                    this.onMessage(parsedEvent);
                } catch (err) {
                    console.error('Failed to parse SSE message:', err);
                }
            };

            this.eventSource.onerror = () => {
                this.handleError();
            };
        } catch (err) {
            this.handleError();
        }
    }

    private handleError() {
        this.cleanup();
        
        if (!navigator.onLine) {
            this.onStatusChange('offline');
            return;
        }

        this.onStatusChange('disconnected');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 3000);
        }
    }

    cleanup() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}

export default SSEClient;
export type { SSEEvent };
export type { SSEViewProps };
export type { ConnectionStatus };
```

```ts
sse-manager.ts

import { EventEmitter } from "events";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Types
type SSEEvent = {
    type: 'deploy' | 'error' | 'info';
    projectId?: string;
    message: string;
    timestamp: number;
    data?: any;
}

// SSE Manager Class
class SSEManager {
    private static instance: SSEManager;
    private emitter: EventEmitter;
    private connections: Map<string, Set<string>> = new Map();
    private connectionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private intervals: Set<ReturnType<typeof setInterval>> = new Set();
    private messageQueue: Array<{ event: SSEEvent, timestamp: number }> = [];
    private lastBroadcast = 0;

    // Constants
    private readonly MAX_LISTENERS = 1000;
    private readonly HEARTBEAT_INTERVAL = 30000;
    private readonly MAX_CONNECTIONS_PER_PROJECT = 100;
    private readonly CONNECTION_TIMEOUT = 1800000; // 30 minutes
    private readonly BROADCAST_RATE_LIMIT = 100; // ms
    private readonly QUEUE_PROCESS_INTERVAL = 100;
    private readonly MAX_QUEUE_SIZE = 1000;
    private readonly MESSAGE_TIMEOUT = 5000; // 5 seconds

    private metrics = {
        totalBroadcasts: 0,
        failedBroadcasts: 0,
        messageQueueSize: 0,
        activeConnections: 0,
        lastGC: Date.now()
    };

    private constructor() {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(this.MAX_LISTENERS);
        this.setupHeartbeat();
        this.setupMessageProcessor();
        this.setupGarbageCollector();
    }

    static getInstance(): SSEManager {
        if (!this.instance) {
            this.instance = new SSEManager();
        }
        return this.instance;
    }

    private setupHeartbeat() {
        const interval = setInterval(() => {
            this.broadcast({
                type: 'info',
                message: 'heartbeat',
                timestamp: Date.now()
            });
        }, this.HEARTBEAT_INTERVAL);
        this.intervals.add(interval);
    }

    private setupMessageProcessor() {
        const interval = setInterval(() => {
            const now = Date.now();
            while (this.messageQueue.length > 0) {
                const item = this.messageQueue[0];
                if (now - item.timestamp > this.MESSAGE_TIMEOUT) {
                    this.messageQueue.shift();
                    this.metrics.failedBroadcasts++;
                    continue;
                }
                this.actuallyBroadcast(item.event);
                this.messageQueue.shift();
            }
            this.metrics.messageQueueSize = this.messageQueue.length;
        }, this.QUEUE_PROCESS_INTERVAL);
        this.intervals.add(interval);
    }

    private setupGarbageCollector() {
        const interval = setInterval(() => {
            this.garbageCollect();
        }, 300000); // 5 minutes
        this.intervals.add(interval);
    }

    private createSSEMessage(event: SSEEvent): string {
        return `data: ${JSON.stringify(event)}\n\n`;
    }

    private actuallyBroadcast(event: SSEEvent) {
        try {
            const message = this.createSSEMessage(event);

            if (event.projectId) {
                const projectConnections = this.connections.get(event.projectId);
                if (projectConnections && projectConnections.size > 0) {
                    this.emitter.emit(`message:${event.projectId}`, message);
                    console.log(`[SSE] Broadcast to project ${event.projectId}: ${event.type}`);
                }
            } else {
                const hasActiveConnections = Array.from(this.connections.values())
                    .some(connections => connections.size > 0);

                if (hasActiveConnections) {
                    this.emitter.emit('message', message);
                    console.log(`[SSE] Broadcast to all: ${event.type}`);
                }
            }
            this.metrics.totalBroadcasts++;
        } catch (error) {
            console.error('[SSE] Broadcast error:', error);
            this.metrics.failedBroadcasts++;
        }
    }

    private garbageCollect() {
        const now = Date.now();
        this.metrics.lastGC = now;

        // Cleanup stale connections
        this.connections.forEach((connections, projectId) => {
            if (connections.size === 0) {
                this.connections.delete(projectId);
            }
        });

        // Update metrics
        this.metrics.activeConnections = Array.from(this.connections.values())
            .reduce((acc, set) => acc + set.size, 0);
    }

    addConnection(projectId: string, connectionId: string) {
        const projectConnections = this.connections.get(projectId);
        if (projectConnections && projectConnections.size >= this.MAX_CONNECTIONS_PER_PROJECT) {
            throw new Error(`Max connections reached for project ${projectId}`);
        }

        if (!this.connections.has(projectId)) {
            this.connections.set(projectId, new Set());
        }
        this.connections.get(projectId)?.add(connectionId);

        // Auto cleanup stale connections
        const timer = setTimeout(() => {
            this.removeConnection(projectId, connectionId);
        }, this.CONNECTION_TIMEOUT);

        this.connectionTimers.set(connectionId, timer);
        this.metrics.activeConnections++;
        console.log(`[SSE] New connection: ${connectionId} for project: ${projectId}`);
    }

    removeConnection(projectId: string, connectionId: string) {
        const timer = this.connectionTimers.get(connectionId);
        if (timer) {
            clearTimeout(timer);
            this.connectionTimers.delete(connectionId);
        }

        this.connections.get(projectId)?.delete(connectionId);
        if (this.connections.get(projectId)?.size === 0) {
            this.connections.delete(projectId);
        }
        this.metrics.activeConnections--;
        console.log(`[SSE] Connection closed: ${connectionId} for project: ${projectId}`);
    }

    broadcast(event: SSEEvent) {
        const now = Date.now();
        if (now - this.lastBroadcast < this.BROADCAST_RATE_LIMIT) {
            if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
                console.warn('[SSE] Message queue full, dropping message');
                this.metrics.failedBroadcasts++;
                return;
            }
            this.messageQueue.push({ event, timestamp: now });
            return;
        }

        this.lastBroadcast = now;
        this.actuallyBroadcast(event);
    }

    subscribe(projectId: string, controller: ReadableStreamDefaultController) {
        const connectionId = `${projectId}-${Date.now()}`;
        let isActive = true;

        try {
            this.addConnection(projectId, connectionId);
        } catch (error) {
            console.error(`[SSE] Failed to add connection: ${error}`);
            controller.error(error);
            return () => { };
        }

        // Send initial connection event
        const initialEvent: SSEEvent = {
            type: 'info',
            projectId,
            message: 'Connected successfully',
            timestamp: Date.now()
        };
        controller.enqueue(this.createSSEMessage(initialEvent));

        // Setup message handlers with error boundaries
        const projectHandler = (message: string) => {
            if (!isActive) return;
            try {
                controller.enqueue(message);
            } catch (error) {
                console.error(`[SSE] Failed to send message to ${connectionId}:`, error);
                this.handleConnectionError(projectId, connectionId, isActive, projectHandler, globalHandler);
                isActive = false;
            }
        };

        const globalHandler = (message: string) => {
            if (!isActive) return;
            try {
                controller.enqueue(message);
            } catch (error) {
                console.error(`[SSE] Failed to send global message to ${connectionId}:`, error);
                this.handleConnectionError(projectId, connectionId, isActive, projectHandler, globalHandler);
                isActive = false;
            }
        };

        // Subscribe to messages
        this.emitter.on(`message:${projectId}`, projectHandler);
        this.emitter.on('message', globalHandler);

        // Return cleanup function
        return () => {
            this.handleConnectionError(projectId, connectionId, isActive, projectHandler, globalHandler);
        };
    }

    private handleConnectionError(
        projectId: string,
        connectionId: string,
        isActive: boolean,
        projectHandler: (message: string) => void,
        globalHandler: (message: string) => void
    ) {
        if (!isActive) return;
        this.emitter.off(`message:${projectId}`, projectHandler);
        this.emitter.off('message', globalHandler);
        this.removeConnection(projectId, connectionId);
    }

    getStatus() {
        return {
            ...this.metrics,
            totalConnections: Array.from(this.connections.values()).reduce((acc, set) => acc + set.size, 0),
            projectConnections: Object.fromEntries(
                Array.from(this.connections.entries()).map(([projectId, connections]) => [
                    projectId,
                    connections.size
                ])
            ),
            queueSize: this.messageQueue.length,
            memoryUsage: process.memoryUsage()
        };
    }

    cleanup() {
        // Clear all intervals
        this.intervals.forEach(clearInterval);
        this.intervals.clear();

        // Clear all connection timers
        this.connectionTimers.forEach(clearTimeout);
        this.connectionTimers.clear();

        // Clear all connections
        this.connections.clear();

        // Clear message queue
        this.messageQueue.length = 0;

        // Remove all listeners
        this.emitter.removeAllListeners();

        // Reset metrics
        this.metrics = {
            totalBroadcasts: 0,
            failedBroadcasts: 0,
            messageQueueSize: 0,
            activeConnections: 0,
            lastGC: Date.now()
        };
    }
}

// Initialize SSE Manager
const sseManager = SSEManager.getInstance();

export default sseManager;
export type { SSEEvent };
```
