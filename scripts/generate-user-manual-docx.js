/**
 * Generates the 10-Page Seshat Notch User Manual in Microsoft Word (.docx) format.
 * Pure Node.js implementation using standard OpenXML (ECMA-376) + ZIP (zlib/CRC32).
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ============================================================================
// 1. Minimal Standard ZIP Builder (Deflate + CRC32) for .docx OpenXML Packaging
// ============================================================================

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(files) {
  const localFileParts = [];
  const centralDirParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const uncompressedBuf = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data, 'utf8');
    const crc = crc32(uncompressedBuf);
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf, { level: 9 });

    // Local file header (30 bytes + file name)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); // signature
    lfh.writeUInt16LE(20, 4); // version needed (2.0)
    lfh.writeUInt16LE(0, 6); // general purpose bit flag
    lfh.writeUInt16LE(8, 8); // compression method: 8 (deflate)
    lfh.writeUInt16LE(0, 10); // mod time
    lfh.writeUInt16LE(0, 12); // mod date
    lfh.writeUInt32LE(crc, 14); // crc32
    lfh.writeUInt32LE(compressedBuf.length, 18); // compressed size
    lfh.writeUInt32LE(uncompressedBuf.length, 22); // uncompressed size
    lfh.writeUInt16LE(nameBuf.length, 26); // file name length
    lfh.writeUInt16LE(0, 28); // extra field length

    localFileParts.push(lfh, nameBuf, compressedBuf);

    // Central directory header (46 bytes + file name)
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0); // signature
    cdh.writeUInt16LE(20, 4); // version made by
    cdh.writeUInt16LE(20, 6); // version needed
    cdh.writeUInt16LE(0, 8); // flags
    cdh.writeUInt16LE(8, 10); // compression method: deflate
    cdh.writeUInt16LE(0, 12); // mod time
    cdh.writeUInt16LE(0, 14); // mod date
    cdh.writeUInt32LE(crc, 16); // crc32
    cdh.writeUInt32LE(compressedBuf.length, 20); // compressed size
    cdh.writeUInt32LE(uncompressedBuf.length, 24); // uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28); // file name length
    cdh.writeUInt16LE(0, 30); // extra field length
    cdh.writeUInt16LE(0, 32); // comment length
    cdh.writeUInt16LE(0, 34); // disk number
    cdh.writeUInt16LE(0, 36); // internal attrs
    cdh.writeUInt32LE(0, 38); // external attrs
    cdh.writeUInt32LE(offset, 42); // relative offset of local header

    centralDirParts.push(cdh, nameBuf);
    offset += lfh.length + nameBuf.length + compressedBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralDirParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(files.length, 8); // entries on this disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirBuf.length, 12); // size of central dir
  eocd.writeUInt32LE(offset, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localFileParts, centralDirBuf, eocd]);
}

// ============================================================================
// 2. OpenXML Helpers (Paragraphs, Headings, Tables, Callouts, Page Breaks)
// ============================================================================

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function h1(text) {
  return `<w:p>
    <w:pPr>
      <w:pStyle w:val="Heading1"/>
      <w:spacing w:before="180" w:after="100"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="4" w:color="0D9488"/>
      </w:pBdr>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="1F2937"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
      <w:t>${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function h2(text) {
  return `<w:p>
    <w:pPr>
      <w:pStyle w:val="Heading2"/>
      <w:spacing w:before="150" w:after="70"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
      <w:t>${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function h3(text) {
  return `<w:p>
    <w:pPr>
      <w:pStyle w:val="Heading3"/>
      <w:spacing w:before="110" w:after="50"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="374151"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>
      <w:t>${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function p(text) {
  return `<w:p>
    <w:pPr><w:spacing w:before="40" w:after="90" w:line="260" w:lineRule="auto"/></w:pPr>
    <w:r>
      <w:rPr><w:color w:val="2C2219"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function bullet(leadBold, text) {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="30" w:after="55" w:line="250" w:lineRule="auto"/>
      <w:ind w:left="360" w:hanging="200"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="20"/></w:rPr>
      <w:t xml:space="preserve">• </w:t>
    </w:r>
    ${
      leadBold
        ? `<w:r><w:rPr><w:b/><w:color w:val="1F2937"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(leadBold)} </w:t></w:r>`
        : ''
    }
    <w:r>
      <w:rPr><w:color w:val="2C2219"/><w:sz w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${esc(text)}</w:t>
    </w:r>
  </w:p>`;
}

function callout(title, bodyText) {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="100" w:after="110" w:line="250" w:lineRule="auto"/>
      <w:ind w:left="200" w:right="200"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="18" w:space="8" w:color="0D9488"/>
        <w:top w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/>
        <w:right w:val="single" w:sz="4" w:space="8" w:color="E2DCCD"/>
        <w:bottom w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/>
      </w:pBdr>
      <w:shd w:val="clear" w:color="auto" w:fill="F4EFE2"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="20"/></w:rPr>
      <w:t xml:space="preserve">${esc(title)}: </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:color w:val="2C2219"/><w:sz w:val="19"/></w:rPr>
      <w:t xml:space="preserve">${esc(bodyText)}</w:t>
    </w:r>
  </w:p>`;
}

function codeBlock(codeText) {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="70" w:after="90" w:line="240" w:lineRule="auto"/>
      <w:ind w:left="200" w:right="200"/>
      <w:pBdr>
        <w:top w:val="single" w:sz="4" w:space="4" w:color="D8D0BE"/>
        <w:left w:val="single" w:sz="4" w:space="6" w:color="D8D0BE"/>
        <w:bottom w:val="single" w:sz="4" w:space="4" w:color="D8D0BE"/>
        <w:right w:val="single" w:sz="4" w:space="6" w:color="D8D0BE"/>
      </w:pBdr>
      <w:shd w:val="clear" w:color="auto" w:fill="FAF7EE"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>
        <w:color w:val="0D9488"/>
        <w:sz w:val="18"/>
      </w:rPr>
      <w:t xml:space="preserve">${esc(codeText)}</w:t>
    </w:r>
  </w:p>`;
}

function table(headers, rows) {
  const headerCells = headers
    .map(
      (h) => `<w:tc>
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="0D9488"/>
        <w:tcMar>
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr>
          <w:t xml:space="preserve">${esc(h)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`
    )
    .join('');

  const bodyRows = rows
    .map((row, rIdx) => {
      const fill = rIdx % 2 === 1 ? 'F4EFE2' : 'FFFFFF';
      const cells = row
        .map(
          (cell, cIdx) => `<w:tc>
          <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
            <w:tcMar>
              <w:top w:w="70" w:type="dxa"/>
              <w:bottom w:w="70" w:type="dxa"/>
              <w:left w:w="120" w:type="dxa"/>
              <w:right w:w="120" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>${cIdx === 0 ? '<w:b/>' : ''}<w:color w:val="2C2219"/><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">${esc(cell)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`
        )
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D8D0BE"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E6DFD0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E6DFD0"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>${headerCells}</w:tr>
    ${bodyRows}
  </w:tbl>
  <w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr></w:p>`;
}

// ============================================================================
// 3. Author All 10 Pages of the Seshat Notch User Manual
// ============================================================================

const pages = [
  // --------------------------------------------------------------------------
  // PAGE 1: Title Page, Core Philosophy, Installation & Onboarding
  // --------------------------------------------------------------------------
  [
    h1('Page 1 — Seshat Notch: User Manual & System Reference (v1.0.0)'),
    callout(
      'Every Day, a Notch. Every Goal, Measured.',
      'Seshat Notch is a local-first personal planning, habit, and time-tracking application designed specifically for Windows laptops and desktops. Named after Seshat—the ancient Egyptian goddess of writing, measurement, and archival records—the app combines multi-horizon planning with verifiable, transparent mathematics.'
    ),
    h2('1.1 Core Design Philosophy'),
    bullet(
      'Multi-Horizon Alignment:',
      'Every daily task and focus block connects upward to weekly targets, monthly milestones, and long-term life areas.'
    ),
    bullet(
      'Plan vs. Reality:',
      'Most planners hide missed targets or silently delete overdue tasks. Seshat Notch compares planned estimates against actual logged reality and preserves an immutable change history.'
    ),
    bullet(
      'Fair Streak Momentum:',
      'Habits support scheduled rest days, excused skips, and multi-day vacation or illness pauses so legitimate rest never destroys your hard-earned streak.'
    ),
    bullet(
      '100% Local-First & Private:',
      'Zero telemetry, no cloud lock-in, and no external analytics. All data lives locally in transactional IndexedDB storage with 1-click JSON, CSV, and Markdown export.'
    ),
    h2('1.2 Installing & Running Seshat Notch on Windows'),
    table(
      ['Runtime Mode', 'How to Install / Launch', 'Capabilities & Best Use Case'],
      [
        [
          'Option A: Installed Windows Web App (PWA)',
          'Open https://swashbuckler16.github.io/Seshat-Notch/ in Microsoft Edge or Google Chrome on Windows and click "Install App" in the address bar.',
          'Launches in its own standalone desktop window from the Windows Start Menu or Taskbar. Caches all fonts (Inter & IBM Plex Mono), icons, and scripts for 100% offline use.'
        ],
        [
          'Option B: Native Windows Desktop Shell (Tauri v2)',
          'Run "npm run tauri:build" (or launch the compiled .msi / .exe installer from src-tauri/target/release/bundle).',
          'Adds a persistent Windows System Tray icon (close-to-tray), OS-wide global Quick-Add hotkey (Ctrl+Shift+K), background native Windows notifications, and silent automatic disk backups.'
        ],
        [
          'Option C: Local Developer Server',
          'Run "npm install" followed by "npm run dev" in PowerShell.',
          'Runs locally at http://localhost:5173 for development, customization, and running the 76-test automated verification suite.'
        ]
      ]
    ),
    h2('1.3 First-Run Onboarding Wizard (OnboardingView)'),
    p(
      'When you open Seshat Notch for the first time on a clean machine, the application starts completely empty rather than forcing pre-populated sample clutter. The guided Onboarding screen offers two paths:'
    ),
    bullet(
      'Path 1 — Create Your Own Workspace (30 Seconds):',
      'Enter your first Life Area (e.g., "Security Engineering" or "Career"), your first active Project or Goal, and an optional daily Habit. Seshat Notch initializes your database inside an atomic transaction and opens the Today screen.'
    ),
    bullet(
      'Path 2 — Load the Optional Example Plan (Heimdall SOC Lab):',
      'Click "Load Example Plan" to populate an 8-milestone technical project ("Heimdall Detection Lab & SIEM Pipeline") complete with sample tasks, targets, and habits so you can explore every chart and formula immediately.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 2: Global Navigation, App Header & Quick-Add Command Palette
  // --------------------------------------------------------------------------
  [
    h1('Page 2 — Global Navigation, Header Controls & Quick-Add Grammar'),
    p(
      'Seshat Notch uses a streamlined 5-tab top navigation bar designed for rapid keyboard and mouse operation on laptop and desktop screens, paired with a global Quick-Add command palette.'
    ),
    h2('2.1 Top-Level Navigation & Keyboard Shortcuts'),
    table(
      ['Shortcut / Control', 'Destination / Action', 'Primary Purpose'],
      [
        ['Alt + 1', 'Today Tab (TodayView)', 'Morning 5-second overview, due tasks/targets, focus timer, and 7-day habit notches.'],
        ['Alt + 2', 'Plan Tab (PlannerView)', 'Manage Life Areas, Projects, Milestones, Dependencies, and Month/Week/Day Targets.'],
        ['Alt + 3', 'Habits Tab (HabitsView)', 'Manage build/avoidance habits, fair streaks, excused skips, pauses, and 52-week heatmaps.'],
        ['Alt + 4', 'Progress Tab (DashboardView)', '7-sub-tab analytics dashboard: Overview, Projects, Habits, Activity, Goals, Reviews, Insights.'],
        ['Alt + 5', 'Settings Tab (DataManagementView)', 'JSON/CSV/Markdown export, bulk import, Recovery Bin, Snapshots, Day Boundary, and Reminders.'],
        ['Ctrl + K  or  N', 'Quick-Add Command Palette', 'Open the token-aware Quick-Add modal from any screen (when not typing in an input field).'],
        ['Ctrl + Shift + K', 'Global Windows Quick Add', 'Summons Seshat Notch from the Windows system tray and opens Quick Add (Tauri Desktop mode).'],
        ['Escape (Esc)', 'Close Modal / Drawer', 'Closes any open modal dialog, formula popover, or Quick-Add palette immediately.']
      ]
    ),
    h2('2.2 Persistent App Header Controls'),
    bullet(
      'Header Timer Pill (HeaderTimerPill):',
      'Whenever a focus timer session is running or paused, a live tabular stopwatch badge appears in the top header across all tabs. You can pause, resume, stop and log the session, or click the pill to jump directly to the Today execution strip.'
    ),
    bullet(
      'Quick Add Button:',
      'Opens the Quick-Add modal with a single click and displays the Ctrl+K keyboard hint.'
    ),
    bullet(
      'Theme Toggle (ThemeToggle):',
      'Switches instantaneously between Warm Paper Light Mode ([data-mode="light"]) and Warm Espresso Dark Mode ([data-mode="dark"]). Your selection is persisted in localStorage and included in full JSON backups.'
    ),
    h2('2.3 Quick-Add Grammar Engine (QuickAddModal & quickAddParser.ts)'),
    p(
      'Pressing Ctrl+K (or N) opens the Quick-Add Command Palette. As you type a single line of text, the deterministic parser extracts structured tokens in real time and displays live preview chips below the input box:'
    ),
    codeBlock(
      'Write Sigma rule for Event ID 4688 #heimdall >phase3 ~45m !high @today +rules:2'
    ),
    table(
      ['Token Prefix', 'Syntax Example', 'Parsed Field & Behavior'],
      [
        ['#project', '#heimdall or #career', 'Matches and links the task to an existing active Project by slug or title prefix.'],
        ['>milestone', '>phase3 or >baseline', 'Links the task to a specific Milestone/Phase inside the selected project.'],
        ['~estimate', '~45m, ~1.5h, or ~90m', 'Sets the planned duration estimate in minutes (e.g., ~1.5h -> 90 minutes).'],
        ['!priority', '!urgent, !high, !med, !low', 'Assigns task priority (defaults to medium when omitted).'],
        ['@date', '@today, @tomorrow, @2026-11-05', 'Schedules the task for a specific local calendar date (respecting your Day Boundary setting).'],
        ['+metric:val', '+pages:10, +labs:2, +5', 'Attaches a quantifiable target metric unit and value to the task.']
      ]
    ),
    callout(
      'Interactive Example Chips',
      'Below the input box, the row labeled "Examples:" displays clickable token chips tailored to your active projects. Clicking any example chip inserts or replaces that token in your current command line.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 3: Tab 1 — Today View & Rapid Execution Strip
  // --------------------------------------------------------------------------
  [
    h1('Page 3 — Tab 1: Today View & Rapid Execution Strip'),
    p(
      'The Today tab (Alt+1) is your operational command center. It is engineered so you can scan your entire day in under five seconds and start executing without navigating through nested menus.'
    ),
    h2('3.1 Morning Summary Strip (MorningSummary)'),
    bullet(
      'Local Date Header & Day Stepper:',
      'Displays the active calendar date (e.g., "Sunday, Nov 1, 2026") using your configured local day-rollover boundary. Use the Previous (<), Today, and Next (>) buttons to inspect past days or pre-plan tomorrow.'
    ),
    bullet(
      'Four Hero Counters:',
      'Displays tabular counts for Tasks (Done / Scheduled), Goals (Done / Active Daily & Weekly Targets), Habits (Checked / Active), and Focus Time (Logged vs. Estimated).'
    ),
    bullet(
      'The Measuring Cord (CordBar):',
      'A single horizontal progress bar with 10% survey ticks showing combined daily completion percentage across tasks, targets, and habits.'
    ),
    h2('3.2 Proactive Contextual Banners on Today'),
    table(
      ['Banner Name', 'When It Appears', 'User Actions Available'],
      [
        [
          'Daily Backup Due Prompt',
          'Appears when the daily backup prompt is enabled in Settings and no local .json backup file has been saved yet for today.',
          'Click "Save backup (.json)" to save your entire database and settings to disk in one click, or click "Later" to snooze the prompt until tomorrow.'
        ],
        [
          'Sunday Weekly Review & Triage',
          'Appears automatically on Sundays to remind you to close out the week.',
          'Click "Start Review" to open the Weekly Review & Carry-Over Triage workflow.'
        ],
        [
          'Scheduled Reminder Banner',
          'Appears when a Morning Plan, Evening Check-In, or Sunday 17:00 reminder triggers.',
          'Displays the reminder message inside the workspace alongside a native desktop/browser notification.'
        ]
      ]
    ),
    h2('3.3 Rapid Execution & Focus Strip (ExecutionStrip & FocusTimerWidget)'),
    p(
      'Located directly beneath the Morning Summary, the Execution Strip folds focus time tracking directly into your daily workflow so you do not have to switch screens:'
    ),
    bullet(
      'Live Stopwatch & Interval Presets:',
      'Start a 25-minute Pomodoro, a 50-minute Deep Work block, or a 90-minute Deep Work block linked optionally to any task scheduled for today.'
    ),
    bullet(
      'Session Classification:',
      'Classify every focus session as Deep Work (cognitively demanding creation/engineering), Deliberate Learning (study/labs), or Shallow Work (admin/triage).'
    ),
    bullet(
      'One-Click Quick-Log Buttons:',
      'Forgot to start the timer? Click "+15m", "+25m", "+50m", or "+90m Deep work" (or open the Manual Time Modal) to log completed focus blocks retroactively.'
    ),
    h2('3.4 Today’s Operational Grid (Tasks, Targets & Habits)'),
    bullet(
      'TodayTasks (Left Column):',
      'Lists all tasks scheduled or due on the selected date. Check off tasks, expand subtasks, log partial progress, or click "+ Add task" to invoke Quick Add.'
    ),
    bullet(
      'TodayTargets (Left Column):',
      'Shows both Daily targets for the selected date and Weekly targets for the current ISO week so your weekly commitments stay visible every day. Increment numeric progress directly with + / - controls.'
    ),
    bullet(
      'TodayHabits (Right Column):',
      'Renders each active habit with an interactive 7-day Notch Rib. Click today’s notch to mark completion, or use the Skip/Pause actions for excused rest.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 4: Tab 2 — Multi-Horizon Planner (Areas, Projects & Milestones)
  // --------------------------------------------------------------------------
  [
    h1('Page 4 — Tab 2: Plan View (Life Areas, Projects & Milestones)'),
    p(
      'The Plan tab (Alt+2) organizes your long-term architecture across two dedicated sub-views: "Projects & Milestones" and "Monthly, Weekly & Daily Targets".'
    ),
    h2('4.1 Life Areas Organizer (AreaManager)'),
    p(
      'Life Areas represent ongoing spheres of responsibility that never "finish" (for example: Security Engineering, Career & Certifications, Health & Fitness, or Open Source). In the left sidebar of the Projects view:'
    ),
    bullet('Create Area:', 'Click "+ New Area" to define a domain name, description, and display order.'),
    bullet('Filter by Area:', 'Click any Area in the list (or "All Areas") to filter the active projects list.'),
    bullet('Reorder & Archive:', 'Use the up/down arrows to prioritize areas or archive inactive areas without losing historical projects.'),
    h2('4.2 Project & Goal Inspector (ProjectInspector)'),
    p(
      'Selecting a project opens the Project Inspector panel, which captures both strategic context and quantitative pacing parameters:'
    ),
    table(
      ['Project Field', 'Options / Format', 'How Seshat Notch Uses It'],
      [
        ['Title & Type (isGoal)', 'Project or Quantified Goal', 'Distinguishes milestone-driven builds from metric-driven goals.'],
        ['Why This Matters (why)', 'Freeform strategic statement', 'Keeps your core motivation visible during weekly reviews and low-energy days.'],
        ['Success Criteria', 'Concrete definition of done', 'Defines the exact verifiable outcome required to mark the project completed.'],
        ['Start Date & End Date', 'Local YYYY-MM-DD dates', 'Used by the Metric Engine to compute Expected Progress % and Schedule Ratio.'],
        ['Weighting Mode', 'Equal, Manual Weight, or Estimate', 'Controls how milestones and tasks contribute to overall Project Progress %.'],
        ['Status', 'Active, Paused, Completed, Dropped', 'Paused projects are excluded from "Behind" penalties; Dropped requires a reason.']
      ]
    ),
    callout(
      'Mandatory Drop Reason Guard (domainService.dropProject)',
      'If you change a project or task status to "Dropped", Seshat Notch requires a non-empty explanation (e.g., "Superseded by new architecture"). This prevents silent abandonment and records the decision in the append-only Change Log.'
    ),
    h2('4.3 Milestone Timeline & Dependency Graph (MilestoneTimeline)'),
    p(
      'Complex projects are broken down into sequential Milestones (Phases). For example, an 8-phase engineering lab can assign specific weights and target dates to each phase:'
    ),
    bullet(
      'Finish-to-Start Dependencies:',
      'Link Milestone B to depend on Milestone A. The timeline highlights whether prerequisite phases are complete before dependent phases begin.'
    ),
    bullet(
      'Milestone Weighting:',
      'Assign custom relative weights (e.g., Phase 1 = 10%, Phase 2 = 25%) or let the engine weight phases automatically by task duration estimates.'
    ),
    bullet(
      'Blocker Tracking & Impact Calculation:',
      'Attach active Blockers to any project or milestone with a description and start timestamp. The metric engine calculates total days blocked so schedule delays are explained rather than mystery gaps.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 5: Tab 2 (Continued) — Multi-Horizon Targets & Cascade Engine
  // --------------------------------------------------------------------------
  [
    h1('Page 5 — Tab 2 (Cont.): Multi-Horizon Targets & Cascade Engine'),
    p(
      'Switching the Plan tab to "Monthly, Weekly & Daily Targets" (MultiHorizonView) reveals the multi-horizon planning matrix that bridges high-level monthly objectives down to daily execution.'
    ),
    h2('5.1 The Three Planning Horizons (periodUtils.ts)'),
    table(
      ['Horizon', 'Period Key Format', 'Role in the Planning Hierarchy'],
      [
        [
          'Month Horizon',
          'YYYY-MM (e.g., 2026-11)',
          'Defines high-level monthly quotas and milestone deliverables (e.g., "Complete 4 detection lab phases" or "Log 40 hours of deep work").'
        ],
        [
          'Week Horizon',
          'ISO Week YYYY-Www (e.g., 2026-W44)',
          'Breaks monthly targets into actionable 7-day sprints (Monday–Sunday). Appears on both the Plan screen and the Today screen.'
        ],
        [
          'Day Horizon',
          'Local Date YYYY-MM-DD (e.g., 2026-11-01)',
          'Concrete daily numeric or boolean targets that appear directly in TodayTargets and feed the Morning Summary Measuring Cord.'
        ]
      ]
    ),
    h2('5.2 Creating & Updating Measurable Targets (TargetEditorModal)'),
    p(
      'Every Target in Seshat Notch is attached to a verifiable number so progress is never subjective:'
    ),
    bullet(
      'Metric Types:',
      'Choose Count (e.g., 12 rules, 5 chapters), Duration (e.g., 180 minutes), Percentage (0–100%), or Boolean (Done / Not Done).'
    ),
    bullet(
      'Project & Milestone Linking:',
      'Optionally link a target to an active Project so increments logged on the target also surface in project reviews.'
    ),
    bullet(
      'Rapid Progress Logging:',
      'Use the inline +1 / -1 buttons or enter an exact delta value. Every increment writes both an updated currentValue and a timestamped ProgressLog record inside a database transaction.'
    ),
    h2('5.3 The Cascade Distribution Engine (CascadeModal)'),
    p(
      'One of Seshat Notch’s signature planning tools is the Cascade Engine (domainService.cascadeTargetToSubPeriods). Instead of manually creating 4 weekly targets or 7 daily targets by hand:'
    ),
    bullet(
      'Month -> Weeks Cascade:',
      'Click "Cascade" on any Monthly target (for example, "Write 20 pages in November"). The Cascade Modal calculates the overlapping ISO weeks and divides the remaining target value evenly across those weeks.'
    ),
    bullet(
      'Week -> Days Cascade:',
      'Click "Cascade" on any Weekly target (for example, "Complete 350 minutes of study in 2026-W44"). Choose whether to distribute across all 7 days (50m/day) or weekdays only (70m/day Mon–Fri).'
    ),
    h2('5.4 Period Navigation & Copy-Forward Re-Planning'),
    bullet(
      'Adjacent Period Stepper:',
      'Step backward or forward across months, ISO weeks, or days using getAdjacentPeriod().'
    ),
    bullet(
      'Copy Unfinished Targets Forward:',
      'At the end of a week or month, click "Copy Unfinished to Next Period" to carry remaining target quotas into the upcoming week or month while preserving the original period’s historical record.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 6: Tab 3 — Habits & Routines & Fair Streak Engine
  // --------------------------------------------------------------------------
  [
    h1('Page 6 — Tab 3: Habits & Routines & The Fair Streak Engine'),
    p(
      'The Habits tab (Alt+3) implements Seshat Notch’s Fair Streak Engine (habitMath.ts)—designed to reward genuine long-term consistency without punishing planned rest, illness, or travel.'
    ),
    h2('6.1 Flexible Habit Schedules (HabitEditorModal)'),
    table(
      ['Schedule Type', 'Configuration', 'How Fair Streak Evaluates It'],
      [
        [
          'Daily (daily)',
          'Every calendar day',
          'Expects a check-in each day unless the day is marked with an Excused Skip or falls inside an active Pause window.'
        ],
        [
          'Weekdays Only (weekdays)',
          'Monday through Friday',
          'Saturday and Sunday are automatically treated as scheduled Rest Days. Missing Saturday/Sunday never breaks your streak.'
        ],
        [
          'Specific Days (custom_days)',
          'Select exact days (e.g., Mon, Wed, Fri)',
          'Only selected weekdays require a check-in; non-selected days are automatic Rest Days that bridge your streak.'
        ],
        [
          'X Times Per Week (times_per_week)',
          'Target frequency (e.g., 4x / week)',
          'Evaluates whether you met your weekly quota across the Monday–Sunday ISO week.'
        ]
      ]
    ),
    h2('6.2 Excused Skips & Vacation / Illness Pauses'),
    bullet(
      'Excused Skip (HabitSkipModal):',
      'If an unexpected obligation or recovery day prevents a habit on a scheduled day, click "Excuse / Skip Today" and select or enter a brief reason. The day is recorded as an Excused Skip (◆): it does not increment the streak counter, nor does it reset your streak to zero.'
    ),
    bullet(
      'Habit Pause Windows (HabitPauseModal):',
      'Going on vacation or recovering from illness? Add a start-to-end Pause Window on the habit. All dates inside the pause window are bypassed by the streak and consistency denominator.'
    ),
    h2('6.3 Build Habits vs. Avoidance Habits (HabitRelapseModal)'),
    bullet(
      'Positive Build Habits:',
      'Standard habits where you log completions (e.g., "90m Deep Work Block", "Mobility Routine"). Displays Current Fair Streak, Best Streak, and 30-Day Consistency %.'
    ),
    bullet(
      'Avoidance / Abstinence Habits (isAvoidance = true):',
      'Tracks habits where success is abstaining from a behavior (e.g., "Zero late-night doomscrolling"). Automatically counts "Days Clean" since start or last relapse, and provides a structured Relapse Modal to record triggers and reset notes honestly.'
    ),
    h2('6.4 Visual Motifs: 7-Day Notch Rib & 52-Week Year Heatmap'),
    bullet(
      'The 7-Day Notch Rib (NotchRib):',
      'Each habit card displays a tactile 7-day row of vertical notches representing the last 7 local days (Completed ●, Excused/Rest ◆, or Missed). Click any day tick to toggle or log.'
    ),
    bullet(
      '52-Week Year Heatmap (HabitYearHeatmap):',
      'Expand any habit to inspect its full 52-week (364-day) ledger matrix, showing seasonal consistency patterns at a glance.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 7: Tab 4 — Progress Dashboard (Overview, Projects, Habits, Activity, Goals)
  // --------------------------------------------------------------------------
  [
    h1('Page 7 — Tab 4: Progress Dashboard & Traceable Visuals'),
    p(
      'The Progress tab (Alt+4) brings all of your execution data together across 7 directly accessible sub-tabs (with zero hidden "More" dropdowns) and zero external charting bloat. Every chart is a custom, high-contrast SVG built from saved records.'
    ),
    h2('7.1 Global Dashboard Filter Bar (DashboardHeader)'),
    p(
      'At the top of the Progress view, you can filter all metrics and charts by Time Window (Last 7 Days, Last 30 Days, Last 90 Days, or All Time) and by Life Area.'
    ),
    h2('7.2 Sub-Tabs 1 to 5 Reference'),
    table(
      ['Sub-Tab', 'Visualizations & Components', 'Key Metrics & What They Tell You'],
      [
        [
          '1. Overview (DashboardOverviewTab)',
          '4 Hero StatTiles with Formula Popovers + Project Health List + Horizontal Time Breakdown Bar (SvgTimePieChart)',
          'Shows Active Projects Progress %, Weekly Goals %, Habit Consistency %, and Total Focus Hours Logged. If no focus time is logged yet, displays a clean, honest empty state instead of an empty ring.'
        ],
        [
          '2. Projects (DashboardProjectsTab)',
          'Stephen Few Bullet Charts (SvgBulletChart) + Milestone Pacing Table + Blocker Impact badges',
          'Compares Actual Progress % (solid bar) against Expected Progress % by today (vertical target marker). Classifies each project with both word and glyph: On track (●), At risk (▲), Behind (■), or Paused (◆).'
        ],
        [
          '3. Habits (DashboardHabitsTab)',
          'Fair Consistency Leaderboard + 52-Week Heatmap Matrix',
          'Ranks habits by fair consistency rate (completed days divided by required non-paused days) and highlights current vs. best streaks.'
        ],
        [
          '4. Activity (DashboardExecutionTab)',
          'Task Completion Burn-Up Curve (SvgBurnUpChart) + Daily Focus Volume Sparklines (SvgSparkline) + Estimate Accuracy',
          'Compares cumulative tasks planned vs. completed over time and calculates Estimate Accuracy (Actual Minutes / Estimated Minutes) to help calibrate future planning.'
        ],
        [
          '5. Goals (DashboardGoalsTab)',
          'Multi-Horizon Target Completion Bars across Month, Week, and Day horizons',
          'Shows exact numeric progress (currentValue / targetValue) across all active monthly, weekly, and daily targets.'
        ]
      ]
    ),
    h2('7.3 Traceable Math: The Formula Inspector Modal (FormulaInspectorModal)'),
    callout(
      'Click the "?" Icon on Any Metric Tile',
      'Every hero metric tile in Seshat Notch includes a Formula Inspector button. Clicking it opens a modal showing: (1) the exact mathematical formula used, (2) the live input variables pulled from your database, (3) the step-by-step calculation, and (4) how to interpret the result.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 8: Carry-Over Inbox, Periodic Reviews & Rule-Based Insights
  // --------------------------------------------------------------------------
  [
    h1('Page 8 — Carry-Over Triage, Periodic Reviews & Insights'),
    p(
      'Pages 8 covers the reflection and course-correction engines of Seshat Notch: the Carry-Over Inbox, Structured Reviews (Daily, Weekly, Monthly), and the deterministic Insights engine.'
    ),
    h2('8.1 Carry-Over Inbox & Triage Workflow (CarryOverInbox)'),
    p(
      'When scheduled tasks from previous days remain unfinished, Seshat Notch collects them into the Carry-Over Inbox (accessible from Reviews and the Sunday Review prompt). Every overdue task is triaged using one of three explicit actions:'
    ),
    table(
      ['Triage Action', 'Component / Service Method', 'What Happens in the Database'],
      [
        [
          '1. Reschedule Task',
          'domainService.rescheduleTask(id, newDate)',
          'Moves scheduleDate to Today, Tomorrow, or a chosen date and logs a "reschedule" entry in the Change Log.'
        ],
        [
          '2. Split into Smaller Tasks',
          'CarryOverSplitModal -> domainService.splitTask()',
          'Marks the oversized parent task as split/archived and creates 2 or more smaller, actionable child tasks scheduled for today.'
        ],
        [
          '3. Drop with Reason',
          'CarryOverDropModal -> domainService.dropTask(id, reason)',
          'Requires a written explanation before marking the task "dropped", ensuring tasks never vanish silently.'
        ]
      ]
    ),
    h2('8.2 Structured Periodic Reviews (ReviewsView & ReviewEditor)'),
    p(
      'Accessible from Progress -> Reviews (or the "Start Review" button on Today), the Review Editor supports three cadences: Daily Shutdown, Weekly Review, and Monthly Retrospective:'
    ),
    bullet(
      'Auto-Compiled Period Snapshot:',
      'Automatically summarizes tasks completed, tasks carried over, focus minutes logged, and habit completion rate for the review period.'
    ),
    bullet(
      'Structured Reflection Prompts:',
      'Provides dedicated sections for Wins & Accomplishments, Friction & Blockers, Lessons Learned, and Next Period Priorities.'
    ),
    bullet(
      'Energy & Mood Rating (1–5 Scale):',
      'Records subjective energy and focus quality alongside objective execution metrics.'
    ),
    h2('8.3 Sub-Tab 7: Deterministic Insights (DashboardInsightsTab)'),
    p(
      'Unlike apps that hallucinate patterns from two days of data, Seshat Notch’s Insights tab uses a strict deterministic rule evaluator:'
    ),
    callout(
      '14-Day Active Data Threshold Guard',
      'Insights requires at least 14 distinct active task days before generating velocity or weekday performance observations. If you have fewer than 14 active task days recorded, the screen displays an honest "Needs more data (X of 14 active task days recorded)" progress bar rather than guessing.'
    ),
    bullet(
      'Peak Velocity Day & Estimation Bias:',
      'Once 14+ active days exist, Insights identifies your highest-output day of the week, compares deep-work ratios across projects, and flags systematic under- or over-estimation.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 9: Tab 5 — Settings & Data Management
  // --------------------------------------------------------------------------
  [
    h1('Page 9 — Tab 5: Settings, Backups, Export/Import & Recovery Bin'),
    p(
      'The Settings tab (Alt+5, implemented in DataManagementView) gives you total ownership over your data, backups, deleted items, and local desktop preferences across five sub-panels.'
    ),
    h2('9.1 Backups & Snapshots (SnapshotsPanel)'),
    bullet(
      'Save Backup to Local File (.json):',
      'Saves a complete JSON archive directly to your Windows filesystem (`seshat-notch-backup-YYYY-MM-DD.json`). In Tauri Desktop mode, daily backups write silently to `Documents/SeshatNotch/Backups/`. In browser mode, a "Daily backup due" prompt appears on Today when not yet saved.'
    ),
    bullet(
      'Full Settings Preservation:',
      'Every JSON backup embeds all 12 database tables PLUS your user preferences (`dayBoundaryHour`, `reminderSettings`, `dailyBackupPromptEnabled`, and `theme`), so restoring a backup restores your exact setup.'
    ),
    bullet(
      'In-App Restore Points:',
      'Take manual snapshots anytime or rely on up to 10 automatic pre-import safety snapshots stored in IndexedDB with 1-click Restore.'
    ),
    h2('9.2 Export Data (DataExportPanel) & Import Plans (DataImportPanel)'),
    table(
      ['Format', 'Export / Import Capability', 'Details & Standards Compliance'],
      [
        [
          'Full JSON (.json)',
          'Export & Import (Merge or Replace)',
          'Lossless archive of all entities, logs, and settings. "Merge" resolves conflicts by newest updatedAt timestamp; "Replace" takes an automatic safety snapshot first.'
        ],
        [
          'Tabular CSV (.csv)',
          'Export any of 6 core tables',
          'RFC 4180 compliant CSV export (properly escaping commas, quotes, and newlines) for tasks, projects, targets, habits, timeSessions, and progressLogs.'
        ],
        [
          'Markdown (.md)',
          'Export Master Ledger & Bulk Import Checklists',
          'Exports a human-readable Master Planning Ledger, or imports any Markdown checklist (`- [ ] Task #project ~45m !high @today`) using Quick-Add tokens.'
        ]
      ]
    ),
    h2('9.3 Recovery Bin (RecoveryBinPanel)'),
    p(
      'Deleting a project, milestone, target, task, habit, or routine performs a Soft Delete (`isDeleted = true`). The Recovery Bin lists every deleted item with its deletion timestamp and reason, allowing 1-click Restore or Permanent Purge.'
    ),
    h2('9.4 Privacy, Day Rollover & Reminders (PrivacySecurityPanel)'),
    bullet(
      'Local Day Rollover Boundary (00:00 to 05:00 AM):',
      'Working at 2:00 AM? Set your rollover boundary to 03:00 AM or 04:00 AM so late-night work still counts toward the current day and @today resolves accurately in your local timezone.'
    ),
    bullet(
      'Reminders & Scheduled Prompts:',
      'Off by default. Configure Morning Plan (e.g., 09:00), Evening Check-In (e.g., 20:00), and Sunday 17:00 Review prompts. Evaluated every 60 seconds while open in the browser, or continuously in the background via the Tauri Windows System Tray.'
    ),
    bullet(
      'Local App Lock PIN:',
      'Optional 4-to-8 digit offline PIN hash to lock sensitive personal reviews on shared machines.'
    ),
  ].join('\n'),

  // --------------------------------------------------------------------------
  // PAGE 10: Services Architecture, Mathematical Formulas & Troubleshooting
  // --------------------------------------------------------------------------
  [
    h1('Page 10 — Architecture Services, Mathematical Formulas & FAQ'),
    p(
      'This final reference page documents the internal TypeScript/Rust services powering Seshat Notch, the exact mathematical formulas used across the application, and common troubleshooting steps.'
    ),
    h2('10.1 Core Services & Modules Reference'),
    table(
      ['Service / Module Path', 'Primary Responsibilities'],
      [
        ['src/services/domainService.ts', 'Atomic multi-store CRUD wrapped in db.transaction(), milestone dependency checks, cascade target splitting, carry-over triage, and mandatory drop-reason guards.'],
        ['src/services/dataOwnershipService.ts', 'Full JSON/CSV/Markdown export, Merge/Replace JSON import, Markdown checklist import, Snapshot rotation (max 10 auto), Recovery Bin restore/purge, and preferences backup.'],
        ['src/services/reminderService.ts', 'Evaluates local HH:MM time against Morning, Evening, and Sunday reminder slots, prevents duplicate daily firing, and dispatches notifications.'],
        ['src/services/desktopShellService.ts', 'Bridges the React frontend with Tauri v2 (src-tauri/src/main.rs) for Windows System Tray events, global Ctrl+Shift+K shortcut, native toasts, and silent disk backups.'],
        ['src/db/changeLogService.ts', 'Records an append-only audit trail (create, update, soft_delete, hard_delete, drop, reschedule) with before/after values and user reasons.'],
        ['src/utils/dateUtils.ts', 'Local timezone calendar date formatting (YYYY-MM-DD) and configurable late-night day boundary rollover (00:00–05:00 AM), eliminating UTC midnight drift.'],
        ['src/utils/metricEngine.ts & habitMath.ts', 'Pure deterministic functions for Project Progress %, Expected Pacing %, Schedule Ratio, 14-day Velocity Forecast, Fair Streaks, and 52-week heatmaps.']
      ]
    ),
    h2('10.2 Verifiable Mathematical Formulas'),
    bullet(
      'Project Progress % (Equal / Manual / Estimate Weighting):',
      'Progress % = (Sum of Completed Milestone/Task Weights ÷ Total Active Weights) × 100.'
    ),
    bullet(
      'Expected Progress % & Schedule Ratio:',
      'Expected % = ((Today − StartDate) ÷ (EndDate − StartDate)) × 100. Schedule Ratio = Actual Progress % ÷ Expected Progress %. Status: On Track ● (≥ 0.90), At Risk ▲ (0.70–0.89), Behind ■ (< 0.70).'
    ),
    bullet(
      '14-Day Velocity Forecast Date:',
      'Daily Velocity = Completed Weight over Last 14 Days ÷ 14. Remaining Days = Remaining Weight ÷ Daily Velocity (rendered as a credible ±15% date range).'
    ),
    bullet(
      'Fair Habit Consistency %:',
      'Consistency % = (Completed Days ÷ (Total Scheduled Days − Excused Skips − Paused Days)) × 100.'
    ),
    bullet(
      'Deep Work Ratio & Estimate Accuracy:',
      'Deep Work Ratio = (Deep Work Minutes ÷ Total Logged Minutes) × 100. Estimate Accuracy = (Actual Logged Minutes ÷ Planned Estimate Minutes) × 100.'
    ),
    h2('10.3 Troubleshooting & Frequently Asked Questions'),
    bullet(
      'Q: Why did my planner show the wrong date between midnight and 5:00 AM?',
      'A: All 43 date operations now use local timezone calendar dates via dateUtils.ts instead of UTC. If you work past midnight, set your "Local Day Rollover Boundary" in Settings -> Privacy & Preferences to 03:00 AM or 04:00 AM.'
    ),
    bullet(
      'Q: How do I verify offline mode works before going offline?',
      'A: Open the app once in Edge or Chrome; the service worker (sw.js v3) caches the HTML shell, self-hosted fonts, and icons individually. You can also run "npm test" to execute the automated static-server offline smoke test.'
    ),
    bullet(
      'Q: How do I move my data to a new Windows laptop?',
      'A: Click "Save backup (.json)" on the Today banner (or Settings -> Backups & Snapshots), copy the .json file to your new laptop, and import it under Settings -> Import Plans. All projects, tasks, habits, logs, and settings will be restored.'
    ),
  ].join('\n'),
];

// ============================================================================
// 4. Assemble OpenXML Package Files and Write Seshat-Notch-User-Manual.docx
// ============================================================================

const documentBodyXml = pages
  .map((pageContent, idx) => (idx < pages.length - 1 ? `${pageContent}\n${pageBreak()}` : pageContent))
  .join('\n');

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/></w:pPr>
  </w:style>
</w:styles>`;

const header1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/></w:pBdr>
    </w:pPr>
    <w:r>
      <w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve">SESHAT NOTCH — USER MANUAL &amp; SYSTEM REFERENCE   |   </w:t>
    </w:r>
    <w:r>
      <w:rPr><w:color w:val="6B5E50"/><w:sz w:val="16"/></w:rPr>
      <w:t>Every day, a notch. Every goal, measured.</w:t>
    </w:r>
  </w:p>
</w:hdr>`;

const footer1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="E2DCCD"/></w:pBdr>
      <w:jc w:val="right"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:color w:val="6B5E50"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve">Seshat Notch v1.0.0 (Windows Desktop &amp; Offline PWA)  —  Page </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE">
      <w:r><w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r>
    </w:fldSimple>
    <w:r>
      <w:rPr><w:color w:val="6B5E50"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve"> of </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES">
      <w:r><w:rPr><w:b/><w:color w:val="0D9488"/><w:sz w:val="16"/></w:rPr><w:t>10</w:t></w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${documentBodyXml}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId2"/>
      <w:footerReference w:type="default" r:id="rId3"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="540" w:footer="540" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Seshat Notch — 10-Page User Manual &amp; System Reference</dc:title>
  <dc:subject>Complete User Guide for Tabs, Workflows, Formulas, and Services</dc:subject>
  <dc:creator>Swashbuckler16</dc:creator>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-11-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Seshat Notch Documentation Generator</Application>
  <Pages>10</Pages>
  <Company>Seshat Notch</Company>
  <AppVersion>1.0000</AppVersion>
</Properties>`;

const zipBuffer = buildZipArchive([
  { name: '[Content_Types].xml', data: contentTypesXml },
  { name: '_rels/.rels', data: rootRelsXml },
  { name: 'docProps/core.xml', data: coreXml },
  { name: 'docProps/app.xml', data: appXml },
  { name: 'word/_rels/document.xml.rels', data: wordRelsXml },
  { name: 'word/styles.xml', data: stylesXml },
  { name: 'word/header1.xml', data: header1Xml },
  { name: 'word/footer1.xml', data: footer1Xml },
  { name: 'word/document.xml', data: documentXml },
]);

const rootDocxPath = path.resolve('Seshat-Notch-User-Manual.docx');
const docsDocxPath = path.resolve('docs', 'Seshat-Notch-User-Manual.docx');
fs.mkdirSync(path.dirname(docsDocxPath), { recursive: true });
fs.writeFileSync(rootDocxPath, zipBuffer);
fs.writeFileSync(docsDocxPath, zipBuffer);

console.log(`Generated 10-page .docx user manual (${zipBuffer.length} bytes):`);
console.log(` - ${rootDocxPath}`);
console.log(` - ${docsDocxPath}`);
