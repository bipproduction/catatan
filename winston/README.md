# winston

```
/Users/bip/Documents/projects/bip/wibu-storage/logs
├── backend
|  ├── combined-2024-12-11.log
|  └── error-2024-12-11.log
└── frontend
   ├── combined-2024-12-11.log
   └── error-2024-12-11.log

directory: 2 file: 4
```

### INSTALL

`bun add winston winston-daily-rotate-file`

src/util/backend-logger.ts

```ts
// src/utils/backendLogger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const backendLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join('logs/backend/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // Combined logs
    new DailyRotateFile({
      filename: path.join('logs/backend/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // Console output in development
    ...(process.env.NODE_ENV !== 'production' 
      ? [new winston.transports.Console()] 
      : [])
  ]
});

export default backendLogger;
```

src/util/client-logger.ts

```ts
// src/utils/clientLogger.ts
interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  data?: any;
  timestamp?: string;
}

class ClientLogger {
  private queue: LogEntry[] = [];
  private readonly maxQueueSize: number = 10;
  private readonly apiEndpoint: string = "/api/logs";
  private isSending: boolean = false;

  private async sendLogs(): Promise<void> {
    if (this.isSending || this.queue.length === 0) return;

    this.isSending = true;
    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(logsToSend)
      });

      if (!response.ok) {
        console.error("Failed to send logs:", response.statusText);
        // Restore logs to queue if send failed
        this.queue = [...logsToSend, ...this.queue];
      }
    } catch (error) {
      console.error("Error sending logs:", error);
      // Restore logs to queue if send failed
      this.queue = [...logsToSend, ...this.queue];
    } finally {
      this.isSending = false;
    }
  }

  private addToQueue(entry: LogEntry): void {
    this.queue.push({
      ...entry,
      timestamp: new Date().toISOString()
    });

    if (this.queue.length >= this.maxQueueSize) {
      this.sendLogs();
    }
  }

  public info(message: string, data?: any): void {
    this.addToQueue({ level: "info", message, data });
  }

  public warn(message: string, data?: any): void {
    this.addToQueue({ level: "warn", message, data });
    // Send immediately for warnings
    this.sendLogs();
  }

  public error(message: string, error?: Error | any): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : error;

    this.addToQueue({ level: "error", message, data: errorData });
    // Send immediately for errors
    this.sendLogs();
  }

  // Flush remaining logs (useful when page is about to unload)
  public flush(): void {
    this.sendLogs();
  }
}

export const clientLogger = new ClientLogger();

```

src/util/frontend-logger.ts

```ts
// utils/frontend-logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels and their priorities
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define interface for log entries
export interface LogEntry {
  level: keyof typeof levels;
  message: string;
  data?: any;
  timestamp?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
}

// Custom format for log entries
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

// Create the logger instance
const frontendLogger: winston.Logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Daily Rotate File for errors
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs/frontend/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: logFormat,
    }),

    // Daily Rotate File for all logs
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs/frontend/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
  ],
  // Handle errors from the logger itself
  exitOnError: false,
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  frontendLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Helper functions for type-safe logging
export function logError(message: string, data?: any) {
  frontendLogger.error(message, { data });
}

export function logWarn(message: string, data?: any) {
  frontendLogger.warn(message, { data });
}

export function logInfo(message: string, data?: any) {
  frontendLogger.info(message, { data });
}

export function logDebug(message: string, data?: any) {
  frontendLogger.debug(message, { data });
}

// Helper function for dynamic logging
export function log(entry: LogEntry) {
  const { level, message, ...metadata } = entry;
  frontendLogger[level](message, metadata);
}

// Export the logger instance as default
export default frontendLogger;

```

### Penggunaan

### Client

```ts
function ApikeyCreate({ loadApikey }: { loadApikey: () => void }) {
  const [form, setForm] = useState({ name: "" } as ApiKey);
  const [loading, setLoading] = useState(false);
  async function onCreate() {
    if (form.name === "") {
      alert("Please fill all the fields");
      clientLogger.error("Please fill all the fields");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(apies["/api/apikey/create"], {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Token.value}`
        },
        body: JSON.stringify({ name: form.name } as ApiKey)
      });

      if (res.ok) {
        setForm({ name: "" } as ApiKey);
        loadApikey();
        return;
      }
    } catch (error) {
      clientLogger.error("Error apikey create:", error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Group>
      <Stack p={"md"}>
        <Title order={3}>create apikey</Title>
        <TextInput
          label="name"
          placeholder="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Button loading={loading} onClick={onCreate}>
          create
        </Button>
      </Stack>
    </Group>
  );
}
```

### Server / Backend

```ts
export const POST = (req: Request, { params }: { params: { id: string } }) =>
  verifyUserToken(req, async (user) => {
    const id = params.id === "root" ? null : params.id;
    let { name } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400
      });
    }

    // Check if a directory with the same name already exists for this user
    const existingDirs = await prisma.dir.findMany({
      where: {
        userId: user.id,
        parentId: id,
        name: {
          startsWith: name
        }
      }
    });

    // If a directory with the same name exists, generate a unique name
    if (existingDirs.length > 0) {
      const baseName = name;
      let newName = baseName;
      let copyCount = 1;

      // Check if the new name exists; if it does, increment the copy count and try again
      while (existingDirs.some((dir) => dir.name === newName)) {
        newName = `${baseName} (copy ${copyCount})`;
        copyCount++;
      }

      name = newName;
    }

    // Create the new directory with the (possibly modified) name
    const create = await prisma.dir.create({
      data: { name, parentId: id, userId: user.id } as any
    });

    backendLogger.info(`Created directory: ${create.name}`);

    return new Response(JSON.stringify({ data: create }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  });
```

## Menampilkan

### Api route

```ts
// app/api/logs/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

async function readLogFiles(directory: string): Promise<LogEntry[]> {
  try {
    const logPath = path.join(process.cwd(), directory);
    const files = await fs.readdir(logPath);
    const logFiles = files.filter(file => file.endsWith('.log'));

    const allLogs: LogEntry[] = [];

    for (const file of logFiles) {
      const filePath = path.join(logPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Parse setiap baris log
      const logs = content
        .split('\n')
        .filter(Boolean)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      allLogs.push(...logs);
    }

    // Sort berdasarkan timestamp, terbaru di atas
    return allLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  } catch (error) {
    console.error('Error reading log files:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Baca logs dari frontend dan backend
    const frontendLogs = await readLogFiles('logs/frontend');
    const backendLogs = await readLogFiles('logs/backend');

    // Gabungkan dan sort semua logs
    const allLogs = [...frontendLogs, ...backendLogs]
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    return NextResponse.json({ logs: allLogs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
```

### page route

```css
/* app/admin/logs/logs.module.css */
.container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 16px;
  }
  
  .filterContainer {
    margin-bottom: 16px;
  }
  
  .select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-width: 200px;
  }
  
  .logsContainer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .logItem {
    padding: 16px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .errorLog {
    background-color: #fef2f2;
  }
  
  .warnLog {
    background-color: #fefce8;
  }
  
  .infoLog {
    background-color: #ffffff;
  }
  
  .logHeader {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .timestamp {
    font-size: 14px;
    color: #666;
  }
  
  .level {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .errorLevel {
    background-color: #fee2e2;
    color: #991b1b;
  }
  
  .warnLevel {
    background-color: #fef3c7;
    color: #92400e;
  }
  
  .infoLevel {
    background-color: #dbeafe;
    color: #1e40af;
  }
  
  .message {
    margin-top: 8px;
  }
  
  .metadata {
    margin-top: 8px;
    padding: 8px;
    background-color: #f9fafb;
    border-radius: 4px;
    font-size: 14px;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  
  .loading {
    text-align: center;
    padding: 24px;
    color: #666;
  }
  
  .error {
    color: #dc2626;
    text-align: center;
    padding: 24px;
  }
  
  /* Hover effects */
  .logItem:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .select:hover {
    border-color: #999;
  }
  
  /* Focus states */
  .select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .container {
      padding: 16px;
    }
  
    .logHeader {
      flex-direction: column;
      align-items: flex-start;
    }
  
    .metadata {
      font-size: 12px;
    }
  }
```

```ts
// app/admin/logs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import styles from './logs.module.css';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'info' | 'warn'>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const response = await fetch('/api/logs/view');
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching logs');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => 
    filter === 'all' ? true : log.level === filter
  );

  if (loading) return <div className={styles.loading}>Loading logs...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>System Logs</h1>
      
      <div className={styles.filterContainer}>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className={styles.select}
        >
          <option value="all">All Logs</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="info">Info</option>
        </select>
      </div>

      <div className={styles.logsContainer}>
        {filteredLogs.map((log, index) => (
          <div 
            key={index}
            className={`${styles.logItem} ${
              log.level === 'error' ? styles.errorLog :
              log.level === 'warn' ? styles.warnLog :
              styles.infoLog
            }`}
          >
            <div className={styles.logHeader}>
              <span className={styles.timestamp}>
                {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
              </span>
              <span className={`${styles.level} ${
                log.level === 'error' ? styles.errorLevel :
                log.level === 'warn' ? styles.warnLevel :
                styles.infoLevel
              }`}>
                {log.level.toUpperCase()}
              </span>
            </div>
            
            <div className={styles.message}>{log.message}</div>
            
            {log.metadata && (
              <pre className={styles.metadata}>
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```


