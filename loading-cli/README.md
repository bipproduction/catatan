# LOADING CLI



Loading.ts


```ts
interface SpinnerOptions {
    text?: string;
    spinnerChars?: string[];
    interval?: number;
    successText?: string;
    failureText?: string;
    persist?: boolean;
  }
  
  class Loading {
    private readonly DEFAULT_SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private readonly DEFAULT_INTERVAL = 80;
    private readonly DEFAULT_TEXT = 'Loading...';
    private readonly DEFAULT_SUCCESS = '✓';  // Menggunakan simbol centang untuk sukses
    private readonly DEFAULT_FAILURE = '✗';  // Menggunakan simbol X untuk gagal
    private readonly SPINNER_PADDING = ' ';  // Spasi antara spinner dan teks
  
    private text: string;
    private spinner: string[];
    private interval: number;
    private intervalId: NodeJS.Timeout | null;
    private index: number;
    private isSpinning: boolean;
    private successText: string;
    private failureText: string;
    private lastLineCount: number;
    private persist: boolean;
    private logBuffer: string[];
  
    constructor(options: SpinnerOptions = {}) {
      this.text = options.text || this.DEFAULT_TEXT;
      this.spinner = options.spinnerChars || this.DEFAULT_SPINNER;
      this.interval = options.interval || this.DEFAULT_INTERVAL;
      this.successText = options.successText || this.DEFAULT_SUCCESS;
      this.failureText = options.failureText || this.DEFAULT_FAILURE;
      this.persist = options.persist ?? true;
      
      this.intervalId = null;
      this.index = 0;
      this.isSpinning = false;
      this.lastLineCount = 0;
      this.logBuffer = [];
  
      // Override console.log
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        this.log(...args);
      };
  
      // Cleanup on exit
      process.on('SIGINT', () => this.cleanup());
      process.on('SIGTERM', () => this.cleanup());
    }
  
    private cleanup(): void {
      if (this.isSpinning) {
        this.stop();
        process.exit(0);
      }
    }
  
    private clearLines(count: number): void {
      for (let i = 0; i < count; i++) {
        process.stdout.write('\r\x1b[K'); // Clear current line
        if (i < count - 1) {
          process.stdout.write('\x1b[1A'); // Move up one line
        }
      }
    }
  
    log(...args: any[]): void {
      if (this.isSpinning) {
        // Clear spinner
        this.clearLines(1);
        
        // Print the log
        console.info(...args);
        
        // Re-render spinner
        this.render();
      } else {
        console.info(...args);
      }
    }
  
    start(): this {
      if (this.isSpinning) return this;
  
      this.isSpinning = true;
      this.logBuffer = [];
      this.render();
  
      this.intervalId = setInterval(() => {
        this.index = (this.index + 1) % this.spinner.length;
        this.render();
      }, this.interval);
  
      return this;
    }
  
    private render(): void {
      if (!this.isSpinning) return;
  
      // Clear previous spinner
      this.clearLines(1);
      
      // Write new spinner (spinner di kiri, teks di kanan)
      process.stdout.write(`${this.spinner[this.index]}${this.SPINNER_PADDING}${this.text}`);
    }
  
    stop(): this {
      if (!this.isSpinning) return this;
  
      this.isSpinning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
  
      // Clear spinner
      this.clearLines(1);
  
      // Show final message if persist is true
      if (this.persist) {
        // Tampilkan simbol sukses di kiri
        process.stdout.write(`${this.successText}${this.SPINNER_PADDING}${this.text}\n`);
      }
  
      return this;
    }
  
    fail(errorText?: string): this {
      if (!this.isSpinning) return this;
  
      this.isSpinning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
  
      // Clear spinner
      this.clearLines(1);
  
      // Show error message if persist is true
      if (this.persist) {
        // Tampilkan simbol error di kiri
        const errorMessage = errorText || this.failureText;
        process.stdout.write(`${this.failureText}${this.SPINNER_PADDING}${this.text}\n`);
      }
  
      return this;
    }
  
    updateText(newText: string): this {
      this.text = newText;
      if (this.isSpinning) {
        this.render();
      }
      return this;
    }
  
    promise<T>(action: Promise<T>): Promise<T> {
      this.start();
      return action
        .then((result) => {
          this.stop();
          return result;
        })
        .catch((error) => {
          this.fail(error.message);
          throw error;
        });
    }
  }
  
  export default Loading;
```

usage

```ts
const loading  = new Loading()
loading.start()

// update text
loading.updateText("text update")

// stop loading
loading.stop()
```
