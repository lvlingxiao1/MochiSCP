use crate::sftp::SftpPool;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub fn edit_remote_file(
    app: AppHandle,
    pool: Arc<SftpPool>,
    session_id: String,
    remote_path: String,
) -> Result<String, String> {
    // 1. Prepare local temp directory
    let mut temp_dir = dirs::cache_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
    temp_dir.push("mochiscp");
    temp_dir.push("temp_edits");
    temp_dir.push(&session_id);

    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp edit dir: {}", e))?;

    let file_name = Path::new(&remote_path)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "file.txt".to_string());

    let local_file_path = temp_dir.join(&file_name);

    // 2. Download current remote file
    {
        let sess = pool.get_session_clone(&session_id)?;
        let sftp = sess.sftp().map_err(|e| format!("SFTP error: {}", e))?;
        let mut remote_file = sftp
            .open(Path::new(&remote_path))
            .map_err(|e| format!("Failed to open remote file: {}", e))?;

        let mut local_file = File::create(&local_file_path)
            .map_err(|e| format!("Failed to create local temp file: {}", e))?;

        let mut buffer = [0u8; 32 * 1024];
        loop {
            let n = remote_file
                .read(&mut buffer)
                .map_err(|e| format!("Read remote error: {}", e))?;
            if n == 0 {
                break;
            }
            local_file
                .write_all(&buffer[..n])
                .map_err(|e| format!("Write local error: {}", e))?;
        }
    }

    // 3. Open in default system editor
    let path_to_open = local_file_path.clone();
    let _ = open::that_detached(&path_to_open);

    // 4. Watch for local modifications and auto-upload back to remote
    let watch_path = local_file_path.clone();
    let remote_target = remote_path.clone();
    let sid = session_id.clone();
    let p = pool.clone();
    let app_clone = app.clone();

    thread::spawn(move || {
        let (tx, rx) = channel();
        let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
            Ok(w) => w,
            Err(_) => return,
        };

        if watcher.watch(&watch_path, RecursiveMode::NonRecursive).is_err() {
            return;
        }

        let mut last_upload = std::time::Instant::now();

        // Listen for save events
        while let Ok(res) = rx.recv() {
            if let Ok(Event { kind, .. }) = res {
                if matches!(kind, EventKind::Modify(_)) {
                    // Debounce rapid writes
                    if last_upload.elapsed() > Duration::from_millis(600) {
                        last_upload = std::time::Instant::now();
                        thread::sleep(Duration::from_millis(200));

                        // Read and upload back
                        if let Ok(mut local_f) = File::open(&watch_path) {
                            if let Ok(sess) = p.get_session_clone(&sid) {
                                if let Ok(sftp) = sess.sftp() {
                                    if let Ok(mut rem_f) = sftp.create(Path::new(&remote_target)) {
                                        let mut buf = [0u8; 32 * 1024];
                                        let mut success = true;
                                        while let Ok(n) = local_f.read(&mut buf) {
                                            if n == 0 {
                                                break;
                                            }
                                            if rem_f.write_all(&buf[..n]).is_err() {
                                                success = false;
                                                break;
                                            }
                                        }

                                        if success {
                                            let _ = app_clone.emit(
                                                "file-auto-synced",
                                                serde_json::json!({
                                                    "remote_path": remote_target,
                                                    "file_name": file_name,
                                                }),
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    Ok(local_file_path.to_string_lossy().to_string())
}
