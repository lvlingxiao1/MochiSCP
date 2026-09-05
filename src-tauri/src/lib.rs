mod fs_local;
mod session;
mod sftp;
mod ssh_config;
mod terminal;
mod transfer;
mod types;
mod watcher;

use sftp::SftpPool;
use std::sync::Arc;
use tauri::{AppHandle, State};
use types::*;

// === Platform & Local Filesystem Commands ===

#[tauri::command]
fn get_platform_info() -> Result<PlatformInfo, String> {
    fs_local::get_platform_info()
}

#[tauri::command]
fn get_local_drives() -> Result<Vec<DriveInfo>, String> {
    fs_local::get_local_drives()
}

#[tauri::command]
fn read_local_dir(dir_path: String, show_hidden: bool) -> Result<Vec<FileItem>, String> {
    fs_local::read_local_dir(&dir_path, show_hidden)
}

#[tauri::command]
fn create_local_dir(dir_path: String) -> Result<(), String> {
    fs_local::create_local_dir(&dir_path)
}

#[tauri::command]
fn delete_local_item(path: String, permanent: bool) -> Result<(), String> {
    fs_local::delete_local_item(&path, permanent)
}

#[tauri::command]
fn rename_local_item(from: String, to: String) -> Result<(), String> {
    fs_local::rename_local_item(&from, &to)
}

// === Session Commands ===

#[tauri::command]
fn list_sessions() -> Result<Vec<SessionConfig>, String> {
    session::list_sessions()
}

#[tauri::command]
fn save_session(session: SessionConfig) -> Result<(), String> {
    session::save_session(session)
}

#[tauri::command]
fn delete_session(session_id: String) -> Result<(), String> {
    session::delete_session(&session_id)
}

// === SFTP & Remote Filesystem Commands ===

#[tauri::command]
fn connect_sftp(
    pool: State<'_, Arc<SftpPool>>,
    config: SessionConfig,
    secret: Option<String>,
) -> Result<String, String> {
    pool.connect(&config, secret)
}

#[tauri::command]
fn disconnect_sftp(pool: State<'_, Arc<SftpPool>>, session_id: String) -> Result<(), String> {
    pool.disconnect(&session_id)
}

#[tauri::command]
fn is_sftp_connected(pool: State<'_, Arc<SftpPool>>, session_id: String) -> bool {
    pool.is_connected(&session_id)
}

#[tauri::command]
fn get_remote_home(pool: State<'_, Arc<SftpPool>>, session_id: String) -> Result<String, String> {
    pool.get_remote_home(&session_id)
}

#[tauri::command]
fn read_remote_dir(
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    remote_path: String,
    show_hidden: bool,
) -> Result<Vec<FileItem>, String> {
    pool.read_dir(&session_id, &remote_path, show_hidden)
}

#[tauri::command]
fn create_remote_dir(
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    remote_path: String,
) -> Result<(), String> {
    pool.create_dir(&session_id, &remote_path)
}

#[tauri::command]
fn delete_remote_item(
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    remote_path: String,
    is_dir: bool,
) -> Result<(), String> {
    pool.delete_item(&session_id, &remote_path, is_dir)
}

#[tauri::command]
fn rename_remote_item(
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    from: String,
    to: String,
) -> Result<(), String> {
    pool.rename_item(&session_id, &from, &to)
}

#[tauri::command]
fn chmod_remote_item(
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    remote_path: String,
    mode: u32,
) -> Result<(), String> {
    pool.chmod_item(&session_id, &remote_path, mode)
}

// === Transfer Commands ===

#[tauri::command]
async fn upload_file(
    app: AppHandle,
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    local_path: String,
    remote_path: String,
    task_id: String,
) -> Result<(), String> {
    let pool_arc = pool.inner().clone();
    transfer::upload_file(app, pool_arc, session_id, local_path, remote_path, task_id).await
}

#[tauri::command]
async fn download_file(
    app: AppHandle,
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    remote_path: String,
    local_path: String,
    task_id: String,
) -> Result<(), String> {
    let pool_arc = pool.inner().clone();
    transfer::download_file(app, pool_arc, session_id, remote_path, local_path, task_id).await
}

// === Remote Edit Watcher & Terminal Commands ===

#[tauri::command]
fn edit_remote_file(
    app: AppHandle,
    pool: State<'_, Arc<SftpPool>>,
    session_id: String,
    remote_path: String,
) -> Result<String, String> {
    let pool_arc = pool.inner().clone();
    watcher::edit_remote_file(app, pool_arc, session_id, remote_path)
}

#[tauri::command]
fn open_ssh_terminal(
    host: String,
    port: u16,
    username: String,
    remote_path: Option<String>,
) -> Result<(), String> {
    terminal::open_ssh_terminal(&host, port, &username, remote_path.as_deref())
}

#[tauri::command]
fn open_devtools(_window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    _window.open_devtools();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sftp_pool = Arc::new(SftpPool::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(sftp_pool)
        .invoke_handler(tauri::generate_handler![
            open_devtools,
            get_platform_info,
            get_local_drives,
            read_local_dir,
            create_local_dir,
            delete_local_item,
            rename_local_item,
            list_sessions,
            save_session,
            delete_session,
            connect_sftp,
            disconnect_sftp,
            is_sftp_connected,
            get_remote_home,
            read_remote_dir,
            create_remote_dir,
            delete_remote_item,
            rename_remote_item,
            chmod_remote_item,
            upload_file,
            download_file,
            edit_remote_file,
            open_ssh_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
