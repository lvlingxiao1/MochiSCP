use crate::types::{AuthType, FileItem, SessionConfig};
use ssh2::Session;
use std::collections::HashMap;
use std::net::{TcpStream, ToSocketAddrs};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub struct SftpPool {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl SftpPool {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn connect(
        &self,
        config: &SessionConfig,
        secret: Option<String>,
    ) -> Result<String, String> {
        let addr = format!("{}:{}", config.host, config.port);
        let socket_addrs = addr
            .to_socket_addrs()
            .map_err(|e| format!("Invalid host or port: {}", e))?
            .next()
            .ok_or_else(|| "Could not resolve host".to_string())?;

        let tcp = TcpStream::connect_timeout(&socket_addrs, Duration::from_secs(10))
            .map_err(|e| format!("Connection timeout or refused: {}", e))?;
        tcp.set_nodelay(true).ok();

        let mut sess = Session::new().map_err(|e| format!("Failed to create SSH session: {}", e))?;
        sess.set_tcp_stream(tcp);
        sess.set_timeout(15000);
        sess.handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;

        match config.auth_type {
            AuthType::Password => {
                let password = secret.unwrap_or_default();
                sess.userauth_password(&config.username, &password)
                    .map_err(|e| format!("Password authentication failed: {}", e))?;
            }
            AuthType::PrivateKey => {
                let key_path_str = config.key_path.as_deref().unwrap_or("");
                if key_path_str.is_empty() {
                    return Err("Private key path is required".to_string());
                }
                let expanded_path = crate::ssh_config::expand_tilde(key_path_str);
                if !expanded_path.exists() {
                    return Err(format!("Private key file not found: {} ({})", key_path_str, expanded_path.display()));
                }
                sess.userauth_pubkey_file(
                    &config.username,
                    None,
                    &expanded_path,
                    secret.as_deref(),
                )
                .map_err(|e| format!("Public key authentication failed: {}", e))?;
            }
        }

        if !sess.authenticated() {
            return Err("Authentication failed: invalid credentials".to_string());
        }

        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(config.id.clone(), sess);

        Ok(format!("Connected to {}", config.host))
    }

    pub fn disconnect(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(sess) = sessions.remove(session_id) {
            let _ = sess.disconnect(None, "User disconnected", None);
        }
        Ok(())
    }

    pub fn is_connected(&self, session_id: &str) -> bool {
        if let Ok(sessions) = self.sessions.lock() {
            if let Some(sess) = sessions.get(session_id) {
                return sess.authenticated();
            }
        }
        false
    }

    pub fn get_remote_home(&self, session_id: &str) -> Result<String, String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        let sftp = sess.sftp().map_err(|e| format!("SFTP subsystem error: {}", e))?;
        let home = sftp.realpath(Path::new(".")).map_err(|e| e.to_string())?;
        Ok(home.to_string_lossy().to_string())
    }

    pub fn read_dir(&self, session_id: &str, remote_path: &str, show_hidden: bool) -> Result<Vec<FileItem>, String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        let sftp = sess.sftp().map_err(|e| format!("SFTP subsystem error: {}", e))?;

        let resolved_path = if remote_path.is_empty() || remote_path == "." || remote_path == "~" {
            sftp.realpath(Path::new("."))
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| "/".to_string())
        } else {
            remote_path.to_string()
        };
        let path = Path::new(&resolved_path);

        let entries = match sftp.readdir(path) {
            Ok(e) => e,
            Err(e) => {
                if let Ok(real) = sftp.realpath(path) {
                    sftp.readdir(&real).map_err(|err| format!("Failed to read remote dir: {}", err))?
                } else {
                    return Err(format!("Failed to read remote dir: {}", e));
                }
            }
        };
        let mut items = Vec::new();

        for (item_path, stat) in entries {
            let file_name = item_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            if file_name.is_empty() || file_name == "." || file_name == ".." {
                continue;
            }

            if !show_hidden && file_name.starts_with('.') {
                continue;
            }

            let full_path = if resolved_path == "/" {
                format!("/{}", file_name)
            } else {
                format!("{}/{}", resolved_path.trim_end_matches('/'), file_name)
            };

            let mut is_dir = stat.is_dir();
            let is_symlink = stat.file_type().is_symlink();
            let mut size = stat.size.unwrap_or(0);

            // If it's a symlink, check whether the target is a directory using stat()
            if is_symlink {
                if let Ok(target_stat) = sftp.stat(Path::new(&full_path)) {
                    if target_stat.is_dir() {
                        is_dir = true;
                    }
                    if let Some(target_sz) = target_stat.size {
                        size = target_sz;
                    }
                }
            }
            let modified_at = stat.mtime.unwrap_or(0) as i64;
            let permissions = stat
                .perm
                .map(|p| format!("{:04o}", p & 0o7777))
                .unwrap_or_else(|| "0644".to_string());

            let owner = stat.uid.map(|u| u.to_string());
            let group = stat.gid.map(|g| g.to_string());

            items.push(FileItem {
                name: file_name,
                path: full_path,
                size,
                is_dir,
                is_symlink,
                modified_at,
                permissions,
                owner,
                group,
            });
        }

        // Sort: directories first, then alphabetical
        items.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });

        Ok(items)
    }

    pub fn create_dir(&self, session_id: &str, remote_path: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        let sftp = sess.sftp().map_err(|e| e.to_string())?;
        sftp.mkdir(Path::new(remote_path), 0o755)
            .map_err(|e| format!("Failed to create remote directory: {}", e))
    }

    pub fn delete_item(&self, session_id: &str, remote_path: &str, is_dir: bool) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        let sftp = sess.sftp().map_err(|e| e.to_string())?;

        let path = Path::new(remote_path);
        if is_dir {
            sftp.rmdir(path).map_err(|e| format!("Failed to remove remote directory: {}", e))
        } else {
            sftp.unlink(path).map_err(|e| format!("Failed to remove remote file: {}", e))
        }
    }

    pub fn rename_item(&self, session_id: &str, from: &str, to: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        let sftp = sess.sftp().map_err(|e| e.to_string())?;

        sftp.rename(Path::new(from), Path::new(to), None)
            .map_err(|e| format!("Failed to rename remote item: {}", e))
    }

    pub fn chmod_item(&self, session_id: &str, remote_path: &str, mode: u32) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        let sftp = sess.sftp().map_err(|e| e.to_string())?;

        let path = Path::new(remote_path);
        let mut stat = sftp.stat(path).map_err(|e| format!("Failed to get stat: {}", e))?;
        stat.perm = Some(mode);
        sftp.setstat(path, stat).map_err(|e| format!("Failed to set permissions: {}", e))
    }

    pub fn get_session_clone(&self, session_id: &str) -> Result<Session, String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let sess = sessions.get(session_id).ok_or("Not connected")?;
        Ok(sess.clone())
    }
}
