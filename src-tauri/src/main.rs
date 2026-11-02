// Prevents an extra console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartExt};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;

static FIRST_CLOSE_NOTIFIED: AtomicBool = AtomicBool::new(false);

/// Writes a JSON backup file directly to the user's Documents/SeshatNotch/Backups directory on Windows.
#[tauri::command]
fn save_backup_to_disk(app: AppHandle, filename: String, contents: String) -> Result<String, String> {
    let base_dir: PathBuf = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("Failed to resolve backup directory: {}", e))?;

    let backup_dir = base_dir.join("SeshatNotch").join("Backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    let safe_name = filename
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
        .collect::<String>();
    let target_path = backup_dir.join(if safe_name.is_empty() {
        "seshat-notch-backup.json".to_string()
    } else {
        safe_name
    });

    fs::write(&target_path, contents.as_bytes())
        .map_err(|e| format!("Failed to write backup file: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// Dispatches a native Windows Toast Notification even when the window is minimized to the system tray.
#[tauri::command]
fn send_native_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| format!("Notification error: {}", e))
}

/// Checks whether "Start with Windows" autostart is enabled.
#[tauri::command]
fn get_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|e| format!("Autostart query error: {}", e))
}

/// Enables or disables "Start with Windows" autostart so background reminders survive reboots.
#[tauri::command]
fn set_autostart_enabled(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    if enabled {
        manager
            .enable()
            .map_err(|e| format!("Failed to enable autostart: {}", e))?;
    } else {
        manager
            .disable()
            .map_err(|e| format!("Failed to disable autostart: {}", e))?;
    }
    manager
        .is_enabled()
        .map_err(|e| format!("Autostart status error: {}", e))
}

fn show_and_focus_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    let quick_add_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyK);

    tauri::Builder::default()
        // 1. Single-instance guard: launching a second copy focuses the existing window
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_and_focus_main(app);
        }))
        // 2. Start-with-Windows autostart plugin
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        // 3. Native notifications plugin
        .plugin(tauri_plugin_notification::init())
        // 4. Global OS-wide shortcut plugin (Ctrl+Shift+K)
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &quick_add_shortcut && event.state() == ShortcutState::Pressed {
                        show_and_focus_main(app);
                        let _ = app.emit("seshat://quick-add", ());
                    }
                })
                .build(),
        )
        .setup(move |app| {
            // Register global Ctrl+Shift+K shortcut for Quick Add
            let _ = app.global_shortcut().register(quick_add_shortcut);

            // Build single Windows System Tray Icon & Menu (no duplicate config trayIcon)
            let open_item = MenuItem::with_id(app, "open", "Open Seshat Notch", true, None::<&str>)?;
            let quick_add_item = MenuItem::with_id(
                app,
                "quick_add",
                "Quick Add Task (Ctrl+Shift+K)",
                true,
                None::<&str>,
            )?;
            let backup_item = MenuItem::with_id(
                app,
                "backup",
                "Save Backup to Disk Now",
                true,
                None::<&str>,
            )?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Seshat Notch", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&open_item, &quick_add_item, &backup_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id("seshat-tray")
                .tooltip("Seshat Notch — Every day, a notch. Every goal, measured.")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        show_and_focus_main(app);
                    }
                    "quick_add" => {
                        show_and_focus_main(app);
                        let _ = app.emit("seshat://quick-add", ());
                    }
                    "backup" => {
                        show_and_focus_main(app);
                        let _ = app.emit("seshat://trigger-backup", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_and_focus_main(tray.app_handle());
                    }
                });

            if let Some(default_icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(default_icon);
            }

            let _tray = tray_builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Close-to-tray on Windows so background reminders and Ctrl+Shift+K stay active
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();

                // Show a one-time notification hint the first time the window is closed to tray
                if !FIRST_CLOSE_NOTIFIED.swap(true, Ordering::SeqCst) {
                    let _ = window
                        .app_handle()
                        .notification()
                        .builder()
                        .title("Seshat Notch is still running in the tray")
                        .body("Press Ctrl+Shift+K anytime for Quick Add, or right-click the tray icon to Quit.")
                        .show();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            save_backup_to_disk,
            send_native_notification,
            get_autostart_enabled,
            set_autostart_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running Seshat Notch Windows desktop application");
}
