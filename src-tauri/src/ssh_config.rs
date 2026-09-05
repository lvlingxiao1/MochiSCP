use crate::types::{AuthType, SessionConfig};
use std::fs;
use std::path::{Path, PathBuf};

/// Expands leading `~`, `~/`, or `~\` to the current user's home directory.
pub fn expand_tilde(path_str: &str) -> PathBuf {
    if path_str == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from("~"));
    }
    let stripped = path_str.strip_prefix("~/").or_else(|| path_str.strip_prefix("~\\"));
    if let Some(s) = stripped {
        if let Some(home) = dirs::home_dir() {
            return home.join(s);
        }
    }
    PathBuf::from(path_str)
}

/// Contracts path starting with `$HOME` to `~/...` for clean ~/.ssh/config output.
pub fn contract_tilde(path_str: &str) -> String {
    if let Some(home) = dirs::home_dir() {
        let home_str = home.to_string_lossy();
        if path_str == home_str {
            return "~".to_string();
        }
        let prefix_slash = format!("{}/", home_str);
        let prefix_backslash = format!("{}\\", home_str);
        if let Some(rest) = path_str.strip_prefix(&prefix_slash).or_else(|| path_str.strip_prefix(&prefix_backslash)) {
            return format!("~/{}", rest.replace('\\', "/"));
        }
    }
    path_str.to_string()
}

/// Locate ~/.ssh/config, creating ~/.ssh if necessary.
pub fn get_ssh_config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Failed to get home directory".to_string())?;
    let ssh_dir = home.join(".ssh");
    if !ssh_dir.exists() {
        fs::create_dir_all(&ssh_dir).map_err(|e| format!("Failed to create ~/.ssh directory: {}", e))?;
    }
    Ok(ssh_dir.join("config"))
}

#[derive(Debug, Clone)]
pub struct Directive {
    pub indent: String,
    pub key: String,      // Lowercase for comparison, e.g. "hostname"
    pub original_key: String, // e.g. "HostName"
    pub separator: String,    // e.g. " " or " = "
    pub value: String,
}

#[derive(Debug, Clone)]
pub enum BlockItem {
    Directive(Directive),
    RawLine(String),
}

#[derive(Debug, Clone)]
pub struct HostBlock {
    pub host_line: String,
    pub patterns: Vec<String>,
    pub items: Vec<BlockItem>,
}

#[derive(Debug, Clone)]
pub enum SshConfigSection {
    Preamble(Vec<String>),
    Host(HostBlock),
    Other(Vec<String>), // Match blocks or other unmanaged sections
}

/// Parses an OpenSSH config file preserving all comments, blank lines, indentation and directives.
pub fn parse_ssh_config(content: &str) -> Vec<SshConfigSection> {
    let mut sections = Vec::new();
    let mut current_preamble = Vec::new();
    let mut current_host: Option<HostBlock> = None;
    let mut current_other: Option<Vec<String>> = None;

    for line in content.lines() {
        let trimmed = line.trim();

        // Check for Host keyword
        if trimmed.starts_with("Host ") || trimmed.starts_with("host ") || trimmed == "Host" || trimmed == "host" {
            // Flush previous section
            if let Some(h) = current_host.take() {
                sections.push(SshConfigSection::Host(h));
            } else if let Some(o) = current_other.take() {
                sections.push(SshConfigSection::Other(o));
            } else if !current_preamble.is_empty() {
                sections.push(SshConfigSection::Preamble(current_preamble));
                current_preamble = Vec::new();
            }

            let patterns: Vec<String> = trimmed
                .split_whitespace()
                .skip(1)
                .map(|s| s.to_string())
                .collect();

            current_host = Some(HostBlock {
                host_line: line.to_string(),
                patterns,
                items: Vec::new(),
            });
            continue;
        }

        // Check for Match keyword
        if trimmed.starts_with("Match ") || trimmed.starts_with("match ") || trimmed == "Match" || trimmed == "match" {
            if let Some(h) = current_host.take() {
                sections.push(SshConfigSection::Host(h));
            } else if let Some(o) = current_other.take() {
                sections.push(SshConfigSection::Other(o));
            } else if !current_preamble.is_empty() {
                sections.push(SshConfigSection::Preamble(current_preamble));
                current_preamble = Vec::new();
            }

            let mut o = Vec::new();
            o.push(line.to_string());
            current_other = Some(o);
            continue;
        }

        // Within a Host block
        if let Some(ref mut host) = current_host {
            if trimmed.is_empty() || trimmed.starts_with('#') {
                host.items.push(BlockItem::RawLine(line.to_string()));
            } else if let Some(directive) = parse_directive_line(line) {
                host.items.push(BlockItem::Directive(directive));
            } else {
                host.items.push(BlockItem::RawLine(line.to_string()));
            }
            continue;
        }

        // Within an Other block
        if let Some(ref mut other) = current_other {
            other.push(line.to_string());
            continue;
        }

        // In preamble before any block
        current_preamble.push(line.to_string());
    }

    if let Some(h) = current_host {
        sections.push(SshConfigSection::Host(h));
    } else if let Some(o) = current_other {
        sections.push(SshConfigSection::Other(o));
    } else if !current_preamble.is_empty() {
        sections.push(SshConfigSection::Preamble(current_preamble));
    }

    sections
}

fn parse_directive_line(line: &str) -> Option<Directive> {
    let indent_len = line.chars().take_while(|c| c.is_whitespace()).count();
    let indent = &line[..indent_len];
    let trimmed = line[indent_len..].trim();

    if trimmed.is_empty() || trimmed.starts_with('#') {
        return None;
    }

    // Split on whitespace or '='
    let (key_part, sep, val_part) = if let Some(eq_idx) = trimmed.find('=') {
        let key = trimmed[..eq_idx].trim();
        let val = trimmed[eq_idx + 1..].trim();
        (key, " = ", val)
    } else if let Some(space_idx) = trimmed.find(char::is_whitespace) {
        let key = &trimmed[..space_idx];
        let val = trimmed[space_idx..].trim();
        (key, " ", val)
    } else {
        return None;
    };

    Some(Directive {
        indent: if indent.is_empty() { "    ".to_string() } else { indent.to_string() },
        key: key_part.to_lowercase(),
        original_key: key_part.to_string(),
        separator: sep.to_string(),
        value: val_part.to_string(),
    })
}

/// Serializes the parsed structure back to ssh_config format without losing unmodified formatting.
pub fn serialize_ssh_config(sections: &[SshConfigSection]) -> String {
    let mut out = String::new();

    for (i, section) in sections.iter().enumerate() {
        if i > 0 && !out.ends_with("\n\n") && !out.ends_with("\n") {
            out.push('\n');
        }

        match section {
            SshConfigSection::Preamble(lines) => {
                for line in lines {
                    out.push_str(line);
                    out.push('\n');
                }
            }
            SshConfigSection::Host(host) => {
                out.push_str(&host.host_line);
                out.push('\n');
                for item in &host.items {
                    match item {
                        BlockItem::Directive(d) => {
                            out.push_str(&d.indent);
                            out.push_str(&d.original_key);
                            out.push_str(&d.separator);
                            out.push_str(&d.value);
                            out.push('\n');
                        }
                        BlockItem::RawLine(raw) => {
                            out.push_str(raw);
                            out.push('\n');
                        }
                    }
                }
            }
            SshConfigSection::Other(lines) => {
                for line in lines {
                    out.push_str(line);
                    out.push('\n');
                }
            }
        }
    }

    out
}

/// Maps parsed HostBlocks to MochiSCP SessionConfigs, ignoring wildcard patterns.
pub fn list_ssh_profiles() -> Result<Vec<SessionConfig>, String> {
    let config_path = get_ssh_config_path()?;
    if !config_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read ~/.ssh/config: {}", e))?;
    let sections = parse_ssh_config(&content);

    let default_palette = ["#fb7185", "#f43f5e", "#ec4899", "#f97316", "#10b981", "#8b5cf6"];
    let mut profiles = Vec::new();

    for section in sections {
        if let SshConfigSection::Host(host) = section {
            for pattern in &host.patterns {
                // Ignore wildcards like "*" or "*.example.com"
                if pattern.contains('*') || pattern.contains('?') {
                    continue;
                }

                let mut hostname = pattern.clone();
                let mut user = String::new();
                let mut port: u16 = 22;
                let mut key_path: Option<String> = None;
                let mut initial_path: Option<String> = None;
                let mut custom_color: Option<String> = None;

                for item in &host.items {
                    match item {
                        BlockItem::Directive(d) => match d.key.as_str() {
                            "hostname" => hostname = d.value.clone(),
                            "user" => user = d.value.clone(),
                            "port" => {
                                if let Ok(p) = d.value.parse::<u16>() {
                                    port = p;
                                }
                            }
                            "identityfile" => {
                                if key_path.is_none() {
                                    key_path = Some(d.value.clone());
                                }
                            }
                            _ => {}
                        },
                        BlockItem::RawLine(raw) => {
                            let trimmed = raw.trim();
                            if let Some(comment) = trimmed.strip_prefix("# MochiSCP:") {
                                for part in comment.split_whitespace() {
                                    if let Some(c) = part.strip_prefix("color=") {
                                        custom_color = Some(c.to_string());
                                    } else if let Some(p) = part.strip_prefix("initial_path=") {
                                        initial_path = Some(p.to_string());
                                    }
                                }
                            }
                        }
                    }
                }

                // If user is empty, fallback to current login username
                if user.is_empty() {
                    user = whoami_username();
                }

                let color = custom_color.unwrap_or_else(|| {
                    let hash: usize = pattern.bytes().map(|b| b as usize).sum();
                    default_palette[hash % default_palette.len()].to_string()
                });

                let auth_type = if key_path.is_some() {
                    AuthType::PrivateKey
                } else {
                    AuthType::Password
                };

                profiles.push(SessionConfig {
                    id: pattern.clone(),
                    name: pattern.clone(),
                    host: hostname,
                    port,
                    username: user,
                    auth_type,
                    key_path,
                    initial_remote_path: initial_path,
                    color: Some(color),
                    created_at: 0,
                });
            }
        }
    }

    Ok(profiles)
}

fn whoami_username() -> String {
    std::env::var("USER")
        .or_else(|_| std::env::var("LOGNAME"))
        .unwrap_or_else(|_| "root".to_string())
}

/// Saves or updates a profile in ~/.ssh/config, preserving all formatting and creating a backup.
pub fn save_ssh_profile(session: SessionConfig) -> Result<(), String> {
    let config_path = get_ssh_config_path()?;
    let content = if config_path.exists() {
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read ~/.ssh/config: {}", e))?
    } else {
        String::new()
    };

    // 1. Create a safe backup before writing if file exists
    if config_path.exists() && !content.is_empty() {
        let backup_path = config_path.with_extension("bak");
        let _ = fs::write(backup_path, &content);
    }

    let mut sections = parse_ssh_config(&content);
    let target_alias = session.name.trim();

    // Check if target_alias already exists in any Host block
    let mut found_index = None;
    for (idx, section) in sections.iter().enumerate() {
        if let SshConfigSection::Host(h) = section {
            if h.patterns.iter().any(|p| p.eq_ignore_ascii_case(target_alias)) {
                found_index = Some(idx);
                break;
            }
        }
    }

    let clean_key_path = session.key_path.as_ref().map(|p| contract_tilde(p));

    if let Some(idx) = found_index {
        // Update existing host block
        if let SshConfigSection::Host(ref mut host) = sections[idx] {
            update_or_add_directive(host, "HostName", &session.host);
            update_or_add_directive(host, "User", &session.username);

            if session.port != 22 {
                update_or_add_directive(host, "Port", &session.port.to_string());
            } else {
                // If port was explicitly 22, keep or remove if default
                if has_directive(host, "port") {
                    update_or_add_directive(host, "Port", "22");
                }
            }

            match session.auth_type {
                AuthType::PrivateKey => {
                    if let Some(ref kp) = clean_key_path {
                        update_or_add_directive(host, "IdentityFile", kp);
                    }
                }
                AuthType::Password => {
                    remove_directive(host, "identityfile");
                }
            }

            // Update MochiSCP metadata comment (color, initial_path)
            let meta_comment = format!(
                "# MochiSCP: color={} initial_path={}",
                session.color.as_deref().unwrap_or("#fb7185"),
                session.initial_remote_path.as_deref().unwrap_or("~")
            );
            update_or_add_mochiscp_comment(host, &meta_comment);
        }
    } else {
        // Append a new Host block
        let mut items = Vec::new();

        // Metadata comment
        let meta_comment = format!(
            "# MochiSCP: color={} initial_path={}",
            session.color.as_deref().unwrap_or("#fb7185"),
            session.initial_remote_path.as_deref().unwrap_or("~")
        );
        items.push(BlockItem::RawLine(format!("    {}", meta_comment)));

        // HostName
        items.push(BlockItem::Directive(Directive {
            indent: "    ".to_string(),
            key: "hostname".to_string(),
            original_key: "HostName".to_string(),
            separator: " ".to_string(),
            value: session.host.clone(),
        }));

        // User
        items.push(BlockItem::Directive(Directive {
            indent: "    ".to_string(),
            key: "user".to_string(),
            original_key: "User".to_string(),
            separator: " ".to_string(),
            value: session.username.clone(),
        }));

        // Port (if not default 22)
        if session.port != 22 {
            items.push(BlockItem::Directive(Directive {
                indent: "    ".to_string(),
                key: "port".to_string(),
                original_key: "Port".to_string(),
                separator: " ".to_string(),
                value: session.port.to_string(),
            }));
        }

        // IdentityFile (if PrivateKey)
        if matches!(session.auth_type, AuthType::PrivateKey) {
            if let Some(ref kp) = clean_key_path {
                items.push(BlockItem::Directive(Directive {
                    indent: "    ".to_string(),
                    key: "identityfile".to_string(),
                    original_key: "IdentityFile".to_string(),
                    separator: " ".to_string(),
                    value: kp.clone(),
                }));
            }
        }

        sections.push(SshConfigSection::Host(HostBlock {
            host_line: format!("Host {}", target_alias),
            patterns: vec![target_alias.to_string()],
            items,
        }));
    }

    let new_content = serialize_ssh_config(&sections);
    write_ssh_config_file(&config_path, &new_content)
}

/// Deletes a Host profile from ~/.ssh/config.
pub fn delete_ssh_profile(host_alias: &str) -> Result<(), String> {
    let config_path = get_ssh_config_path()?;
    if !config_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read ~/.ssh/config: {}", e))?;
    let backup_path = config_path.with_extension("bak");
    let _ = fs::write(backup_path, &content);

    let mut sections = parse_ssh_config(&content);
    let target = host_alias.trim();

    sections.retain_mut(|section| {
        if let SshConfigSection::Host(h) = section {
            if h.patterns.len() == 1 && h.patterns[0].eq_ignore_ascii_case(target) {
                return false; // Remove entire block
            }
            h.patterns.retain(|p| !p.eq_ignore_ascii_case(target));
            if h.patterns.is_empty() {
                return false;
            }
            // Update host line if multiple patterns were present
            h.host_line = format!("Host {}", h.patterns.join(" "));
        }
        true
    });

    let new_content = serialize_ssh_config(&sections);
    write_ssh_config_file(&config_path, &new_content)
}

fn has_directive(host: &HostBlock, key_lower: &str) -> bool {
    host.items.iter().any(|item| {
        if let BlockItem::Directive(d) = item {
            d.key == key_lower
        } else {
            false
        }
    })
}

fn update_or_add_directive(host: &mut HostBlock, original_key: &str, value: &str) {
    let key_lower = original_key.to_lowercase();
    let mut updated = false;

    for item in &mut host.items {
        if let BlockItem::Directive(ref mut d) = item {
            if d.key == key_lower {
                d.value = value.to_string();
                updated = true;
                break;
            }
        }
    }

    if !updated {
        host.items.push(BlockItem::Directive(Directive {
            indent: "    ".to_string(),
            key: key_lower,
            original_key: original_key.to_string(),
            separator: " ".to_string(),
            value: value.to_string(),
        }));
    }
}

fn remove_directive(host: &mut HostBlock, key_lower: &str) {
    host.items.retain(|item| {
        if let BlockItem::Directive(d) = item {
            d.key != key_lower
        } else {
            true
        }
    });
}

fn update_or_add_mochiscp_comment(host: &mut HostBlock, comment_str: &str) {
    let mut updated = false;
    for item in &mut host.items {
        if let BlockItem::RawLine(ref mut line) = item {
            if line.trim().starts_with("# MochiSCP:") {
                *line = format!("    {}", comment_str);
                updated = true;
                break;
            }
        }
    }
    if !updated {
        host.items.insert(0, BlockItem::RawLine(format!("    {}", comment_str)));
    }
}

fn write_ssh_config_file(path: &Path, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("Failed to write to ~/.ssh/config: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = fs::Permissions::from_mode(0o600);
        let _ = fs::set_permissions(path, perms);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_CONFIG: &str = r#"# User configuration
Host pi2
    HostName lvlingxiao.ddns.net
    User lvlingxiao
    IdentityFile ~/.ssh/asdf

Host popo6
    HostName 2607:fea8:49e5:d700:994f:db45:5a01:9124
    AddressFamily inet6
    User lvlingxiao
    IdentityFile ~/.ssh/pi1

Host *
    ServerAliveInterval 60
"#;

    #[test]
    fn test_parse_and_serialize_preservation() {
        let sections = parse_ssh_config(SAMPLE_CONFIG);
        assert_eq!(sections.len(), 4); // Preamble, pi2, popo6, Host *

        let serialized = serialize_ssh_config(&sections);
        assert!(serialized.contains("Host pi2"));
        assert!(serialized.contains("AddressFamily inet6"));
        assert!(serialized.contains("ServerAliveInterval 60"));
    }

    #[test]
    fn test_list_profiles_filters_wildcard() {
        let sections = parse_ssh_config(SAMPLE_CONFIG);
        let mut profiles = Vec::new();
        for s in sections {
            if let SshConfigSection::Host(h) = s {
                for p in &h.patterns {
                    if !p.contains('*') {
                        profiles.push(p.clone());
                    }
                }
            }
        }
        assert_eq!(profiles, vec!["pi2", "popo6"]);
    }

    #[test]
    fn test_update_directive_preserves_custom_fields() {
        let mut sections = parse_ssh_config(SAMPLE_CONFIG);
        if let SshConfigSection::Host(ref mut h) = sections[2] {
            assert_eq!(h.patterns[0], "popo6");
            update_or_add_directive(h, "User", "new_user");
        }

        let serialized = serialize_ssh_config(&sections);
        assert!(serialized.contains("User new_user"));
        assert!(serialized.contains("AddressFamily inet6")); // Preserved!
    }

    #[test]
    fn test_expand_and_contract_tilde() {
        let home = dirs::home_dir().unwrap();
        let contracted = contract_tilde(&format!("{}/.ssh/id_rsa", home.to_string_lossy()));
        assert_eq!(contracted, "~/.ssh/id_rsa");

        let expanded = expand_tilde("~/.ssh/id_rsa");
        assert_eq!(expanded, home.join(".ssh/id_rsa"));
    }
}
