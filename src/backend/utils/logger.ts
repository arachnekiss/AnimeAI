/**
 * Simple Logger Utility
 */

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, error?: any): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

class SimpleLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  }
}

export const logger = new SimpleLogger();
export default logger;
