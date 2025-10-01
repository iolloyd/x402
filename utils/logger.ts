type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEvent {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

function formatLog(event: LogEvent): string {
  return JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export function log(level: LogLevel, message: string, metadata?: Record<string, any>) {
  const event: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata,
  };

  console.log(formatLog(event));
}

export function info(message: string, metadata?: Record<string, any>) {
  log('info', message, metadata);
}

export function warn(message: string, metadata?: Record<string, any>) {
  log('warn', message, metadata);
}

export function error(message: string, metadata?: Record<string, any>) {
  log('error', message, metadata);
}

export function debug(message: string, metadata?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    log('debug', message, metadata);
  }
}

export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  log('info', 'metric', {
    metric_name: name,
    metric_value: value,
    tags,
  });
}
