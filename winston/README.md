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
