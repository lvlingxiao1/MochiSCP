use crate::types::SessionConfig;
use keyring::Entry;

const KEYRING_SERVICE: &str = "com.mochiscp.desktop";
const LEGACY_KEYRING_SERVICE: &str = "com.skyscp.app";

pub fn list_sessions() -> Result<Vec<SessionConfig>, String> {
    crate::ssh_config::list_ssh_profiles()
}

pub fn save_session(session: SessionConfig, secret: Option<String>) -> Result<(), String> {
    let session_id = session.id.clone();
    crate::ssh_config::save_ssh_profile(session)?;

    // Handle keyring password/passphrase storage
    if let Some(sec) = secret {
        if !sec.is_empty() {
            if let Ok(entry) = Entry::new(KEYRING_SERVICE, &session_id) {
                let _ = entry.set_password(&sec);
            }
        }
    }

    Ok(())
}

pub fn delete_session(session_id: &str) -> Result<(), String> {
    crate::ssh_config::delete_ssh_profile(session_id)?;

    // Remove from keyring
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, session_id) {
        let _ = entry.delete_credential();
    }
    if let Ok(legacy_entry) = Entry::new(LEGACY_KEYRING_SERVICE, session_id) {
        let _ = legacy_entry.delete_credential();
    }

    Ok(())
}

pub fn get_session_secret(session_id: &str) -> Result<Option<String>, String> {
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, session_id) {
        if let Ok(pwd) = entry.get_password() {
            return Ok(Some(pwd));
        }
    }
    // Fallback to legacy keyring service
    if let Ok(legacy_entry) = Entry::new(LEGACY_KEYRING_SERVICE, session_id) {
        if let Ok(pwd) = legacy_entry.get_password() {
            return Ok(Some(pwd));
        }
    }
    Ok(None)
}
