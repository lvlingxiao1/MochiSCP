use crate::types::SessionConfig;
use keyring::Entry;
use std::fs;
use std::path::PathBuf;

const KEYRING_SERVICE: &str = "com.skyscp.app";

fn get_config_file_path() -> Result<PathBuf, String> {
    let mut config_dir = dirs::config_dir().ok_or_else(|| "Failed to get config directory".to_string())?;
    config_dir.push("skyscp");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    config_dir.push("sessions.json");
    Ok(config_dir)
}

pub fn list_sessions() -> Result<Vec<SessionConfig>, String> {
    let path = get_config_file_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let data = fs::read_to_string(path).map_err(|e| format!("Failed to read sessions: {}", e))?;
    let sessions: Vec<SessionConfig> = serde_json::from_str(&data).unwrap_or_default();
    Ok(sessions)
}

pub fn save_session(session: SessionConfig, secret: Option<String>) -> Result<(), String> {
    let path = get_config_file_path()?;
    let mut sessions = list_sessions().unwrap_or_default();

    if let Some(pos) = sessions.iter().position(|s| s.id == session.id) {
        sessions[pos] = session.clone();
    } else {
        sessions.push(session.clone());
    }

    let json = serde_json::to_string_pretty(&sessions)
        .map_err(|e| format!("Failed to serialize sessions: {}", e))?;
    fs::write(path, json).map_err(|e| format!("Failed to write sessions file: {}", e))?;

    // Handle keyring password/passphrase storage
    if let Some(sec) = secret {
        if !sec.is_empty() {
            if let Ok(entry) = Entry::new(KEYRING_SERVICE, &session.id) {
                let _ = entry.set_password(&sec);
            }
        }
    }

    Ok(())
}

pub fn delete_session(session_id: &str) -> Result<(), String> {
    let path = get_config_file_path()?;
    let mut sessions = list_sessions().unwrap_or_default();
    sessions.retain(|s| s.id != session_id);

    let json = serde_json::to_string_pretty(&sessions)
        .map_err(|e| format!("Failed to serialize sessions: {}", e))?;
    fs::write(path, json).map_err(|e| format!("Failed to write sessions file: {}", e))?;

    // Remove from keyring
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, session_id) {
        let _ = entry.delete_credential();
    }

    Ok(())
}

pub fn get_session_secret(session_id: &str) -> Result<Option<String>, String> {
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, session_id) {
        match entry.get_password() {
            Ok(pwd) => Ok(Some(pwd)),
            Err(_) => Ok(None),
        }
    } else {
        Ok(None)
    }
}
