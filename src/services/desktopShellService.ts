/**
 * Seshat Notch — Phase 14: Windows Desktop Shell Integration Service
 *
 * Bridges the React application with the Tauri v2 Windows Desktop Shell (`src-tauri/`)
 * when running as a packaged Windows `.exe` / `.msi` app, while providing clean
 * browser/PWA fallbacks when running in Microsoft Edge or Google Chrome.
 *
 * Capabilities in Tauri Windows Desktop Mode:
 * 1. System Tray icon & close-to-tray background persistence
 * 2. Global OS-wide Quick-Add shortcut (`Ctrl+Shift+K`)
 * 3. Native Windows Toast Notifications (fires even when window is hidden in tray)
 * 4. Silent automatic daily JSON backups to `Documents/SeshatNotch/Backups/`
 */

export interface DesktopShellStatus {
  isDesktopApp: boolean;
  modeLabel: string;
  traySupported: boolean;
  globalHotkey: string;
  backgroundNotificationsSupported: boolean;
  silentDiskBackupSupported: boolean;
}

interface TauriInvokeWindow {
  __TAURI_INTERNALS__?: {
    invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
  __TAURI__?: {
    core?: {
      invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
    event?: {
      listen?: (
        event: string,
        handler: (payload: { payload: unknown }) => void
      ) => Promise<() => void>;
    };
  };
}

export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as TauriInvokeWindow;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

async function invokeTauri<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  if (!isTauriDesktop()) return null;
  const w = window as unknown as TauriInvokeWindow;
  const invokeFn = w.__TAURI__?.core?.invoke || w.__TAURI_INTERNALS__?.invoke;
  if (typeof invokeFn !== 'function') return null;
  return (await invokeFn(cmd, args)) as T;
}

export const desktopShellService = {
  getStatus(): DesktopShellStatus {
    const desktop = isTauriDesktop();
    return {
      isDesktopApp: desktop,
      modeLabel: desktop
        ? 'Windows Native Desktop Shell (Tauri)'
        : 'Browser / Installed Web App (PWA)',
      traySupported: desktop,
      globalHotkey: desktop ? 'Ctrl+Shift+K (global) · Ctrl+K (in-app)' : 'Ctrl+K or N (in-app)',
      backgroundNotificationsSupported: desktop,
      silentDiskBackupSupported: desktop,
    };
  },

  /**
   * Sends a native Windows notification via Tauri if running in the desktop shell,
   * or falls back to the Web Notification API when running in a browser tab.
   */
  async dispatchNotification(title: string, body: string): Promise<boolean> {
    if (isTauriDesktop()) {
      try {
        await invokeTauri('send_native_notification', { title, body });
        return true;
      } catch {
        // Fallback to Web Notification API below
      }
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body,
          icon: './favicon.svg',
          tag: `seshat-${title}`,
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  },

  /**
   * Writes a backup file silently to `Documents/SeshatNotch/Backups/<filename>`
   * when running inside the Tauri Windows Desktop shell.
   */
  async writeSilentDesktopBackup(
    filename: string,
    jsonContent: string
  ): Promise<{ saved: boolean; path?: string }> {
    if (!isTauriDesktop()) {
      return { saved: false };
    }
    try {
      const savedPath = await invokeTauri<string>('save_backup_to_disk', {
        filename,
        contents: jsonContent,
      });
      if (savedPath) {
        return { saved: true, path: savedPath };
      }
    } catch {
      // Fall through
    }
    return { saved: false };
  },

  /**
   * Subscribes to global shortcut and system tray menu events emitted by the
   * Windows Tauri shell (`seshat://quick-add`, `seshat://trigger-backup`, `seshat://navigate`).
   */
  subscribeToShellEvents(handlers: {
    onQuickAdd: () => void;
    onTriggerBackup?: () => void;
    onNavigateTab?: (tab: string) => void;
  }): () => void {
    const cleanups: Array<() => void> = [];

    if (typeof window !== 'undefined') {
      const onDomQuickAdd = () => handlers.onQuickAdd();
      const onDomBackup = () => handlers.onTriggerBackup?.();
      window.addEventListener('seshat:quick-add', onDomQuickAdd);
      window.addEventListener('seshat:trigger-backup', onDomBackup);
      cleanups.push(() => {
        window.removeEventListener('seshat:quick-add', onDomQuickAdd);
        window.removeEventListener('seshat:trigger-backup', onDomBackup);
      });

      const w = window as unknown as TauriInvokeWindow;
      const listenFn = w.__TAURI__?.event?.listen;
      if (typeof listenFn === 'function') {
        listenFn('seshat://quick-add', () => {
          handlers.onQuickAdd();
        }).then((unlisten) => cleanups.push(unlisten)).catch(() => {});

        listenFn('seshat://trigger-backup', () => {
          handlers.onTriggerBackup?.();
        }).then((unlisten) => cleanups.push(unlisten)).catch(() => {});

        listenFn('seshat://navigate', (event) => {
          if (typeof event.payload === 'string') {
            handlers.onNavigateTab?.(event.payload);
          }
        }).then((unlisten) => cleanups.push(unlisten)).catch(() => {});
      }
    }

    return () => {
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  },
};
