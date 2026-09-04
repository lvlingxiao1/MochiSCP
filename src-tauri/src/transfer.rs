use crate::sftp::SftpPool;
use crate::types::TransferProgressPayload;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

fn upload_single_file(
    app: &AppHandle,
    sftp: &ssh2::Sftp,
    local_path: &Path,
    remote_path: &str,
    task_id: &str,
    total_size: u64,
) -> Result<(), String> {
    let mut local_file = File::open(local_path)
        .map_err(|e| format!("Failed to open local file: {}", e))?;
    let mut remote_file = sftp
        .create(Path::new(remote_path))
        .map_err(|e| format!("Failed to create remote file: {}", e))?;

    let mut buffer = [0u8; 64 * 1024]; // 64KB buffer
    let mut transferred: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_transferred: u64 = 0;

    loop {
        let n = local_file
            .read(&mut buffer)
            .map_err(|e| format!("Read local error: {}", e))?;
        if n == 0 {
            break;
        }

        remote_file
            .write_all(&buffer[..n])
            .map_err(|e| format!("Write remote error: {}", e))?;
        transferred += n as u64;

        let elapsed = last_emit.elapsed();
        if elapsed.as_millis() >= 200 || transferred == total_size {
            let speed = if elapsed.as_secs_f64() > 0.0 {
                ((transferred - last_transferred) as f64 / elapsed.as_secs_f64()) as u64
            } else {
                0
            };
            last_emit = Instant::now();
            last_transferred = transferred;

            let is_done = total_size > 0 && transferred == total_size;
            let payload = TransferProgressPayload {
                task_id: task_id.to_string(),
                transferred,
                total: total_size,
                speed,
                status: if is_done { "completed".to_string() } else { "transferring".to_string() },
                error: None,
            };
            let _ = app.emit("transfer-progress", payload);
        }
    }

    Ok(())
}

pub async fn upload_file(
    app: AppHandle,
    pool: Arc<SftpPool>,
    session_id: String,
    local_path: String,
    remote_path: String,
    task_id: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let sess = pool.get_session_clone(&session_id)?;
        let sftp = sess.sftp().map_err(|e| format!("SFTP error: {}", e))?;

        let local_p = Path::new(&local_path);
        if !local_p.exists() {
            return Err("Source file does not exist".to_string());
        }

        if local_p.is_dir() {
            // Recursive directory upload
            let _ = sftp.mkdir(Path::new(&remote_path), 0o755);
            let walker = walkdir::WalkDir::new(&local_path);
            for entry in walker.into_iter().filter_map(|e| e.ok()) {
                let rel = match entry.path().strip_prefix(local_p) {
                    Ok(r) => r,
                    Err(_) => continue,
                };
                if rel.as_os_str().is_empty() {
                    continue;
                }
                let sub_remote = format!(
                    "{}/{}",
                    remote_path.trim_end_matches('/'),
                    rel.to_string_lossy().replace('\\', "/")
                );
                if entry.file_type().is_dir() {
                    let _ = sftp.mkdir(Path::new(&sub_remote), 0o755);
                } else {
                    let sz = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let _ = upload_single_file(&app, &sftp, entry.path(), &sub_remote, &task_id, sz);
                }
            }

            // Final completion event for folder
            let _ = app.emit(
                "transfer-progress",
                TransferProgressPayload {
                    task_id,
                    transferred: 1,
                    total: 1,
                    speed: 0,
                    status: "completed".to_string(),
                    error: None,
                },
            );
        } else {
            let metadata = fs::metadata(local_p)
                .map_err(|e| format!("Failed to get local file metadata: {}", e))?;
            let total_size = metadata.len();
            upload_single_file(&app, &sftp, local_p, &remote_path, &task_id, total_size)?;

            let _ = app.emit(
                "transfer-progress",
                TransferProgressPayload {
                    task_id,
                    transferred: total_size,
                    total: total_size,
                    speed: 0,
                    status: "completed".to_string(),
                    error: None,
                },
            );
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

fn download_single_file(
    app: &AppHandle,
    sftp: &ssh2::Sftp,
    remote_path: &str,
    local_path: &str,
    task_id: &str,
    total_size: u64,
) -> Result<(), String> {
    let mut remote_file = sftp
        .open(Path::new(remote_path))
        .map_err(|e| format!("Failed to open remote file: {}", e))?;

    let mut local_file = File::create(local_path)
        .map_err(|e| format!("Failed to create local file: {}", e))?;

    let mut buffer = [0u8; 64 * 1024];
    let mut transferred: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_transferred: u64 = 0;

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
        transferred += n as u64;

        let elapsed = last_emit.elapsed();
        if elapsed.as_millis() >= 200 || (total_size > 0 && transferred == total_size) {
            let speed = if elapsed.as_secs_f64() > 0.0 {
                ((transferred - last_transferred) as f64 / elapsed.as_secs_f64()) as u64
            } else {
                0
            };
            last_emit = Instant::now();
            last_transferred = transferred;

            let is_done = total_size > 0 && transferred == total_size;
            let payload = TransferProgressPayload {
                task_id: task_id.to_string(),
                transferred,
                total: total_size,
                speed,
                status: if is_done { "completed".to_string() } else { "transferring".to_string() },
                error: None,
            };
            let _ = app.emit("transfer-progress", payload);
        }
    }

    Ok(())
}

fn download_dir_recursive(
    app: &AppHandle,
    sftp: &ssh2::Sftp,
    remote_dir: &Path,
    local_dir: &Path,
    task_id: &str,
) -> Result<(), String> {
    fs::create_dir_all(local_dir).map_err(|e| e.to_string())?;
    let entries = sftp.readdir(remote_dir).map_err(|e| e.to_string())?;

    for (item_path, stat) in entries {
        let name = match item_path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };
        if name.is_empty() || name == "." || name == ".." {
            continue;
        }

        let sub_remote = remote_dir.join(&name);
        let sub_local = local_dir.join(&name);

        if stat.is_dir() {
            download_dir_recursive(app, sftp, &sub_remote, &sub_local, task_id)?;
        } else {
            let sz = stat.size.unwrap_or(0);
            let _ = download_single_file(
                app,
                sftp,
                &sub_remote.to_string_lossy(),
                &sub_local.to_string_lossy(),
                task_id,
                sz,
            );
        }
    }

    Ok(())
}

pub async fn download_file(
    app: AppHandle,
    pool: Arc<SftpPool>,
    session_id: String,
    remote_path: String,
    local_path: String,
    task_id: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let sess = pool.get_session_clone(&session_id)?;
        let sftp = sess.sftp().map_err(|e| format!("SFTP error: {}", e))?;

        let remote_p = Path::new(&remote_path);
        let stat = sftp
            .stat(remote_p)
            .map_err(|e| format!("Failed to get remote stat: {}", e))?;

        if stat.is_dir() {
            // Recursive directory download
            download_dir_recursive(&app, &sftp, remote_p, Path::new(&local_path), &task_id)?;

            let payload = TransferProgressPayload {
                task_id,
                transferred: 1,
                total: 1,
                speed: 0,
                status: "completed".to_string(),
                error: None,
            };
            let _ = app.emit("transfer-progress", payload);
        } else {
            let total_size = stat.size.unwrap_or(0);
            download_single_file(&app, &sftp, &remote_path, &local_path, &task_id, total_size)?;

            let payload = TransferProgressPayload {
                task_id,
                transferred: total_size,
                total: total_size,
                speed: 0,
                status: "completed".to_string(),
                error: None,
            };
            let _ = app.emit("transfer-progress", payload);
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
