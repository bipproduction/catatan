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
