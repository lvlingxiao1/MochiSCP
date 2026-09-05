use std::process::Command;

pub fn open_ssh_terminal(
    host: &str,
    port: u16,
    username: &str,
    remote_path: Option<&str>,
) -> Result<(), String> {
    let mut ssh_cmd = format!("ssh -p {} {}@{}", port, username, host);
    if let Some(path) = remote_path {
        if !path.is_empty() && path != "/" {
            ssh_cmd = format!("{} -t \"cd '{}' && exec \\$SHELL -l\"", ssh_cmd, path);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"\ntell application \"Terminal\" to activate",
            ssh_cmd.replace('\"', "\\\"")
        );
        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to launch macOS Terminal: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        // Try Windows Terminal (wt.exe) first, fallback to powershell via cmd/start
        let wt_status = Command::new("wt.exe")
            .args(["powershell", "-NoExit", "-Command", &ssh_cmd])
            .spawn();

        if wt_status.is_err() {
            Command::new("cmd.exe")
                .args(["/c", "start", "powershell", "-NoExit", "-Command", &ssh_cmd])
                .spawn()
                .map_err(|e| format!("Failed to launch Windows terminal: {}", e))?;
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let terminals = ["x-terminal-emulator", "gnome-terminal", "konsole", "xfce4-terminal", "xterm"];
        let mut launched = false;
        for term in terminals {
            if let Ok(_) = Command::new(term).arg("-e").arg(&ssh_cmd).spawn() {
                launched = true;
                break;
            }
        }
        if !launched {
            return Err("No supported terminal found on Linux".to_string());
        }
    }

    Ok(())
}
