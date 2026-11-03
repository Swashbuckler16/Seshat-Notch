import React, { useState, useEffect } from 'react';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import { reminderService, ReminderSettings } from '../../services/reminderService';
import { desktopShellService } from '../../services/desktopShellService';
import { getDayBoundaryHour, setDayBoundaryHour } from '../../utils/dateUtils';
import {
  Lock,
  Shield,
  CheckCircle2,
  Key,
  Bell,
  Clock,
  Monitor,
} from 'lucide-react';

interface PrivacySecurityPanelProps {
  onNotify: (msg: string) => void;
}

export const PrivacySecurityPanel: React.FC<PrivacySecurityPanelProps> = ({ onNotify }) => {
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [reminderConfig, setReminderConfig] = useState<ReminderSettings>(() =>
    reminderService.getSettings()
  );
  const [boundaryHour, setBoundaryHourState] = useState<number>(() => getDayBoundaryHour());
  const [autostartEnabled, setAutostartEnabled] = useState<boolean>(false);
  const shellStatus = desktopShellService.getStatus();

  useEffect(() => {
    if (shellStatus.isDesktopApp) {
      void desktopShellService.getAutostartEnabled().then(setAutostartEnabled);
    }
  }, [shellStatus.isDesktopApp]);

  const handleToggleAutostart = async (checked: boolean) => {
    const updated = await desktopShellService.setAutostartEnabled(checked);
    setAutostartEnabled(updated);
    onNotify(
      updated
        ? 'Start with Windows enabled — background reminders will resume after reboot.'
        : 'Start with Windows disabled.'
    );
  };

  const loadSettings = async () => {
    try {
      const settings = await dataOwnershipService.getPrivacySettings();
      setAppLockEnabled(settings.appLockEnabled);
    } catch (err: unknown) {
      onNotify(`Failed to load security settings: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSetPin = async () => {
    if (pinInput.length < 4) {
      onNotify('PIN must be at least 4 digits.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      onNotify('PINs do not match.');
      return;
    }

    try {
      setIsVerifying(true);
      await dataOwnershipService.setAppLockPin(pinInput);
      window.dispatchEvent(new CustomEvent('seshat-app-lock-unlocked'));
      setPinInput('');
      setConfirmPinInput('');
      setShowPinSetup(false);
      onNotify('App Lock PIN configured. Reload or click Lock Now to lock the screen.');
      await loadSettings();
    } catch (err: unknown) {
      onNotify(`Error setting PIN: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const handleUpdateReminders = async (updates: Partial<ReminderSettings>) => {
    const next = { ...reminderConfig, ...updates };
    if (updates.enabled && notificationPermission !== 'granted') {
      const perm = await reminderService.requestPermission();
      setNotificationPermission(perm);
    }
    setReminderConfig(next);
    reminderService.saveSettings(next);
    onNotify('Reminder schedule updated.');
  };

  const handleBoundaryChange = (hour: number) => {
    setBoundaryHourState(hour);
    setDayBoundaryHour(hour);
    onNotify(`Day rollover boundary set to ${hour === 0 ? 'Midnight (00:00)' : `0${hour}:00 AM`}.`);
  };

  const handleDisableLock = async () => {
    const input = prompt('Enter your current PIN to disable App Lock:');
    if (!input) return;

    try {
      const ok = await dataOwnershipService.disableAppLock(input);
      if (ok) {
        onNotify('App Lock disabled.');
        await loadSettings();
      } else {
        onNotify('Incorrect PIN. App Lock remains active.');
      }
    } catch (err: unknown) {
      onNotify(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Zero Telemetry & Privacy Certification */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center gap-2.5 hairline-b pb-2.5">
          <Shield className="w-4 h-4 text-[var(--color-emerald)]" />
          <h3 className="text-xs font-bold text-[var(--color-ink)] ">
            Privacy and your data
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>No tracking</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Your plans are not sent to analytics or advertising services.
            </p>
          </div>

          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>Saved on this device</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Your plans and activity stay in this app on your device.
            </p>
          </div>

          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>Take your data with you</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Save a backup file or download a readable copy whenever you need one.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Late-Night Day Boundary Configuration */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[var(--color-accent)]" />
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-[var(--color-ink)] ">
                When your day begins
              </h3>
              <span className="text-xs text-[var(--color-ink-muted)]">
                If you work late, choose when Seshat should start counting a new day.
              </span>
            </div>
          </div>

          <select
            aria-label="Day rollover boundary hour"
            value={boundaryHour}
            onChange={(e) => handleBoundaryChange(Number(e.target.value))}
            className="h-8 px-2.5 text-xs font-mono bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
          >
            <option value={0}>00:00 (Midnight)</option>
            <option value={1}>01:00 AM</option>
            <option value={2}>02:00 AM</option>
            <option value={3}>03:00 AM</option>
            <option value={4}>04:00 AM</option>
            <option value={5}>05:00 AM</option>
          </select>
        </div>
      </div>

      {/* 3. Daily & Weekly Notification Reminders */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[var(--color-accent)]" />
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-[var(--color-ink)] ">
                Reminders
              </h3>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {shellStatus.isDesktopApp
                  ? 'The Windows app can remind you while it is minimized.'
                  : 'Reminders appear while this browser tab is open.'}
              </span>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={reminderConfig.enabled}
              onChange={(e) => handleUpdateReminders({ enabled: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            <span>{reminderConfig.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-xs">
          <div className="flex flex-col gap-1">
            <label htmlFor="morning-reminder-time" className="font-medium text-[var(--color-ink)]">
              Morning reminder
            </label>
            <input
              id="morning-reminder-time"
              type="time"
              value={reminderConfig.morningTime}
              onChange={(e) => handleUpdateReminders({ morningTime: e.target.value })}
              className="h-8 px-2 font-mono text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-ink)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="evening-reminder-time" className="font-medium text-[var(--color-ink)]">
              Evening reminder
            </label>
            <input
              id="evening-reminder-time"
              type="time"
              value={reminderConfig.eveningTime}
              onChange={(e) => handleUpdateReminders({ eveningTime: e.target.value })}
              className="h-8 px-2 font-mono text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-ink)]"
            />
          </div>

          <div className="flex flex-col justify-center gap-1">
            <label className="inline-flex items-center gap-2 font-medium text-[var(--color-ink)] cursor-pointer mt-2 sm:mt-4">
              <input
                type="checkbox"
                checked={reminderConfig.sundayReviewReminder}
                onChange={(e) => handleUpdateReminders({ sundayReviewReminder: e.target.checked })}
                className="accent-[var(--color-accent)]"
              />
              <span>Sunday weekly review reminder</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Windows Desktop Shell Integration Status (Phase 14) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-4 h-4 text-[var(--color-accent)]" />
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-[var(--color-ink)] ">
                Desktop app options
              </h3>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {shellStatus.isDesktopApp ? 'You are using the Windows app.' : 'You are using the browser version.'}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-[var(--radius-xs)] text-[11px] font-mono border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink)]">
            {shellStatus.isDesktopApp ? 'Windows app' : 'Browser'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <span className="font-semibold text-[var(--color-ink)]">Run in the background</span>
            <span className="text-[var(--color-ink-muted)]">
              {shellStatus.traySupported
                ? 'Closing the window keeps reminders running in the background.'
                : 'Available in the Windows app.'}
            </span>
          </div>
          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <span className="font-semibold text-[var(--color-ink)]">Keyboard shortcut</span>
            <span className="text-[var(--color-ink-muted)] font-mono">
              {shellStatus.globalHotkey}
            </span>
          </div>
          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <span className="font-semibold text-[var(--color-ink)]">Backup copies</span>
            <span className="text-[var(--color-ink-muted)]">
              {shellStatus.silentDiskBackupSupported
                ? 'Saved in Documents > SeshatNotch > Backups.'
                : 'Save a backup file from the Today page.'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 hairline-t text-xs">
          <span className="text-[var(--color-ink-muted)]">
            The browser version and the Windows app keep separate copies of your plans. Use <strong>Save backup file</strong> and <strong>Restore a copy</strong> to move plans between them.
          </span>
          {shellStatus.isDesktopApp && (
            <label className="inline-flex items-center gap-2 font-medium text-[var(--color-ink)] cursor-pointer">
              <input
                type="checkbox"
                checked={autostartEnabled}
                onChange={(e) => handleToggleAutostart(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              <span>Start with Windows</span>
            </label>
          )}
        </div>
      </div>

      {/* 5. Optional App Lock PIN */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[var(--color-accent)]" />
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-[var(--color-ink)] ">
                Local App Lock
              </h3>
              <span className="text-xs text-[var(--color-ink-muted)]">
                Protect your personal plans and reviews with an offline PIN.
              </span>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-[var(--radius-xs)] text-[11px] font-mono border  ${
              appLockEnabled
                ? 'bg-[var(--color-emerald)]/10 border-[var(--color-emerald)]/30 text-[var(--color-emerald)]'
                : 'bg-[var(--color-paper-3)] border-[var(--color-rule)] text-[var(--color-ink-muted)]'
            }`}
          >
            {appLockEnabled ? 'Active' : 'Disabled'}
          </span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {appLockEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="text-xs text-[var(--color-ink)] font-medium">
                    App lock PIN is configured and active.
                  </span>
                </div>
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  Acts as a local privacy screen gate when opening or reloading the app.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('seshat-app-lock-now'))}
                  className="px-2.5 py-1 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-colors min-h-8"
                >
                  Lock Now
                </button>
                <button
                  type="button"
                  onClick={handleDisableLock}
                  className="px-2.5 py-1 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-colors min-h-8"
                >
                  Disable PIN Lock
                </button>
              </div>
            </div>
          ) : showPinSetup ? (
            <div className="surface-well p-3.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-3 max-w-sm">
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                Configure New App Lock PIN
              </span>

              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-8 digit PIN"
                  className="p-2 text-xs font-mono rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <input
                  type="password"
                  maxLength={8}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm PIN"
                  className="p-2 text-xs font-mono rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isVerifying || !pinInput}
                  onClick={handleSetPin}
                  className="px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium text-xs hover:opacity-90 transition-opacity min-h-8"
                >
                  Save PIN
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinSetup(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-xs min-h-8"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
              <span className="text-xs text-[var(--color-ink-muted)]">
                Require a PIN before opening personal daily reviews and sensitive project goals.
              </span>
              <button
                type="button"
                onClick={() => setShowPinSetup(true)}
                className="px-2.5 py-1 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-colors min-h-8"
              >
                Set Up PIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
