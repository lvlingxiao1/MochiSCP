use crate::types::SessionConfig;

pub fn list_sessions() -> Result<Vec<SessionConfig>, String> {
    crate::ssh_config::list_ssh_profiles()
}

pub fn save_session(session: SessionConfig) -> Result<(), String> {
    crate::ssh_config::save_ssh_profile(session)
}

pub fn delete_session(session_id: &str) -> Result<(), String> {
    crate::ssh_config::delete_ssh_profile(session_id)
}

