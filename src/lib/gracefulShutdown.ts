export type ShutdownHook = () => Promise<void> | void;

export interface ShutdownManager {
  register(hook: ShutdownHook): void;
  shutdown(): Promise<void>;
  attachSignals(): void;
}

export function createShutdownManager(): ShutdownManager {
  const hooks: ShutdownHook[] = [];
  let running = false;

  const shutdown = async (): Promise<void> => {
    if (running) return;
    running = true;
    for (const hook of [...hooks].reverse()) {
      try {
        await hook();
      } catch (err) {
        console.error('[shutdown] hook failed:', err);
      }
    }
  };

  return {
    register: (hook) => void hooks.push(hook),
    shutdown,
    attachSignals: () => {
      const handle = (signal: string) => {
        console.log(`[shutdown] received ${signal}`);
        void shutdown().then(() => process.exit(0));
      };
      process.on('SIGTERM', () => handle('SIGTERM'));
      process.on('SIGINT', () => handle('SIGINT'));
    },
  };
}
