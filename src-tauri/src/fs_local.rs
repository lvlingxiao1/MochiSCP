use crate::types::{DriveInfo, FileItem, PlatformInfo};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub fn get_platform_info() -> Result<PlatformInfo, String> {
    let os = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };

    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/".to_string());

    let sep = std::path::MAIN_SEPARATOR.to_string();

    Ok(PlatformInfo {
        os: os.to_string(),
        home_dir,
        sep,
    })
}

pub fn get_local_drives() -> Result<Vec<DriveInfo>, String> {
    let mut drives = Vec::new();

    #[cfg(target_os = "windows")]
    {
        for c in b'A'..=b'Z' {
            let drive_path = format!("{}:\\", c as char);
            if Path::new(&drive_path).exists() {
                drives.push(DriveInfo {
                    name: format!("Drive ({}:)", c as char),
                    mount_point: drive_path,
                    total_space: None,
                    available_space: None,
                });
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        drives.push(DriveInfo {
            name: "Root".to_string(),
            mount_point: "/".to_string(),
            total_space: None,
            available_space: None,
        });

        if let Some(home) = dirs::home_dir() {
            drives.push(DriveInfo {
                name: "Home".to_string(),
                mount_point: home.to_string_lossy().to_string(),
                total_space: None,
                available_space: None,
            });
        }
    }

    Ok(drives)
}

pub fn read_local_dir(dir_path: &str, show_hidden: bool) -> Result<Vec<FileItem>, String> {
    let path = PathBuf::from(dir_path);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path));
    }

    let entries = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();

        if !show_hidden && file_name.starts_with('.') {
            continue;
        }

        let file_path = entry.path().to_string_lossy().to_string();
        let file_type = entry.file_type().ok();
        let is_symlink = file_type.as_ref().map(|ft| ft.is_symlink()).unwrap_or(false);

        // If it's a symlink, check whether the target is a directory so users can navigate into it
        let is_dir = if is_symlink {
            fs::metadata(entry.path()).map(|m| m.is_dir()).unwrap_or(false)
        } else {
            file_type.as_ref().map(|ft| ft.is_dir()).unwrap_or(false)
        };

        let metadata = if is_symlink {
            fs::metadata(entry.path()).or_else(|_| entry.path().symlink_metadata()).ok()
        } else {
            entry.metadata().ok()
        };

        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

        let modified_at = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|dur| dur.as_secs() as i64)
            .unwrap_or(0);

        let mut permissions = String::from("------");
        #[cfg(unix)]
        if let Some(ref m) = metadata {
            let mode = m.permissions().mode();
            permissions = format!("{:04o}", mode & 0o7777);
        }

        items.push(FileItem {
            name: file_name,
            path: file_path,
            size,
            is_dir,
            is_symlink,
            modified_at,
            permissions,
            owner: None,
            group: None,
        });
    }

    // Sort: directories first, then case-insensitive alphabetical by name
    items.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(items)
}

pub fn create_local_dir(dir_path: &str) -> Result<(), String> {
    fs::create_dir_all(dir_path).map_err(|e| format!("Failed to create directory: {}", e))
}

pub fn delete_local_item(path_str: &str, permanent: bool) -> Result<(), String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err("Item does not exist".to_string());
    }

    if !permanent {
        trash::delete(path).map_err(|e| format!("Failed to move to trash: {}", e))?;
    } else if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to remove directory: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to remove file: {}", e))?;
    }

    Ok(())
}

pub fn rename_local_item(from: &str, to: &str) -> Result<(), String> {
    fs::rename(from, to).map_err(|e| format!("Failed to rename item: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_info() {
        let info = get_platform_info().expect("Platform info should succeed");
        assert_eq!(info.os, "macos");
        assert!(!info.home_dir.is_empty());
        assert_eq!(info.sep, "/");
    }

    #[test]
    fn test_read_dir() {
        let items = read_local_dir("/tmp", true).expect("Reading /tmp should succeed");
        assert!(items.iter().all(|i| !i.name.is_empty()));
    }

    #[test]
    fn test_symlink_detection() {
        use std::os::unix::fs::symlink;
        let test_dir = std::env::temp_dir().join(format!("test_mochiscp_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();

        let real_sub_dir = test_dir.join("real_folder");
        fs::create_dir_all(&real_sub_dir).unwrap();

        let sym_folder = test_dir.join("sym_folder");
        let _ = symlink(&real_sub_dir, &sym_folder);

        let items = read_local_dir(&test_dir.to_string_lossy(), true).unwrap();
        let sym_item = items.iter().find(|i| i.name == "sym_folder");
        assert!(sym_item.is_some(), "sym_folder should exist");
        let sym_item = sym_item.unwrap();
        assert!(sym_item.is_symlink, "Should be marked as symlink");
        assert!(sym_item.is_dir, "Target is a dir, so is_dir should be true");

        let _ = fs::remove_dir_all(&test_dir);
    }
}
