use crate::sftp::SftpPool;
use crate::types::TransferProgressPayload;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

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

        let mut local_file = File::open(&local_path)
            .map_err(|e| format!("Failed to open local file: {}", e))?;
        let metadata = local_file
            .metadata()
            .map_err(|e| format!("Failed to get local file metadata: {}", e))?;
        let total_size = metadata.len();

        let mut remote_file = sftp
            .create(Path::new(&remote_path))
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

                let is_done = transferred == total_size;
                let payload = TransferProgressPayload {
                    task_id: task_id.clone(),
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
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
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

        let mut remote_file = sftp
            .open(Path::new(&remote_path))
            .map_err(|e| format!("Failed to open remote file: {}", e))?;
        let stat = sftp
            .stat(Path::new(&remote_path))
            .map_err(|e| format!("Failed to get remote stat: {}", e))?;
        let total_size = stat.size.unwrap_or(0);

        let mut local_file = File::create(&local_path)
            .map_err(|e| format!("Failed to create local file: {}", e))?;

        let mut buffer = [0u8; 64 * 1024]; // 64KB buffer
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
                    task_id: task_id.clone(),
                    transferred,
                    total: total_size,
                    speed,
                    status: if is_done { "completed".to_string() } else { "transferring".to_string() },
                    error: None,
                };
                let _ = app.emit("transfer-progress", payload);
            }
        }

        // Final completion event
        let payload = TransferProgressPayload {
            task_id,
            transferred,
            total: transferred,
            speed: 0,
            status: "completed".to_string(),
            error: None,
        };
        let _ = app.emit("transfer-progress", payload);

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
