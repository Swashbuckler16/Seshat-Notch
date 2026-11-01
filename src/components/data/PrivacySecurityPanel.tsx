import React, { useState, useEffect } from 'react';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import {
  Lock,
  Shield,
  CheckCircle2,
  Key,
  Bell,
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
      setPinInput('');
      setConfirmPinInput('');
      setShowPinSetup(false);
      onNotify('App Lock PIN successfully configured.');
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

  const handleRequestNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        if (res === 'granted') {
          onNotify('Notifications enabled for morning reminders and weekly reviews.');
          new Notification('Seshat Notch', {
            body: 'Reminders enabled. Every day, a notch. Every goal, measured.',
            icon: '/logo.svg',
          });
        } else {
          onNotify('Notification permission was not granted.');
        }
      } catch {
        onNotify('Could not request notification permission.');
      }
    }
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
      {/* 1. Zero Telemetry & Privacy Certification (PRD DT-7) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center gap-2.5 hairline-b pb-2.5">
          <Shield className="w-4 h-4 text-[var(--color-emerald)]" />
          <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
            Data Privacy & Offline Integrity
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>Zero Telemetry</span>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              No tracking pixels, third-party analytics, or external logging SDKs.
            </p>
          </div>

          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>100% Local-First</span>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              All plans, change history, and metrics reside on your device in local storage.
            </p>
          </div>

          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
              <span>Total Data Export</span>
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              One-click export to JSON, CSV, and Markdown anytime without lock-in.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Optional App Lock PIN (PRD DT-6) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[var(--color-accent)]" />
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Local App Lock
              </h3>
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                Protect your personal plans and reviews with an offline PIN.
              </span>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-mono border uppercase tracking-wider ${
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
            <div className="flex items-center justify-between p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-[11px] text-[var(--color-ink)] font-medium">
                  App lock PIN is configured and active.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDisableLock}
                className="px-2.5 py-1 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-colors min-h-8"
              >
                Disable PIN Lock
              </button>
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
              <span className="text-[11px] text-[var(--color-ink-muted)]">
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

      {/* 3. Daily & Weekly Notification Reminders */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[var(--color-accent)]" />
            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Reminders & Prompts
              </h3>
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                Receive local browser notifications for morning planning and Sunday weekly reviews.
              </span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-mono border uppercase tracking-wider ${
              notificationPermission === 'granted'
                ? 'bg-[var(--color-emerald)]/10 border-[var(--color-emerald)]/30 text-[var(--color-emerald)]'
                : 'bg-[var(--color-paper-3)] border-[var(--color-rule)] text-[var(--color-ink-muted)]'
            }`}
          >
            {notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Blocked' : 'Off'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <span className="text-xs text-[var(--color-ink-muted)]">
            Local browser notifications respect your privacy and never transmit notifications to external push servers.
          </span>
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 min-h-11 sm:min-h-8 whitespace-nowrap self-start sm:self-auto"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
