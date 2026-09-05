import { invoke } from '@tauri-apps/api/core';
import { DriveInfo, FileItem, PlatformInfo, SessionConfig } from '../types';

export const ipc = {
  // Local filesystem
  getPlatformInfo: () => invoke<PlatformInfo>('get_platform_info'),
  getLocalDrives: () => invoke<DriveInfo[]>('get_local_drives'),
  readLocalDir: (dirPath: string, showHidden: boolean) =>
    invoke<FileItem[]>('read_local_dir', { dirPath, showHidden }),
  createLocalDir: (dirPath: string) => invoke<void>('create_local_dir', { dirPath }),
  deleteLocalItem: (path: string, permanent: boolean) =>
    invoke<void>('delete_local_item', { path, permanent }),
  renameLocalItem: (from: string, to: string) =>
    invoke<void>('rename_local_item', { from, to }),

  // Sessions
  listSessions: () => invoke<SessionConfig[]>('list_sessions'),
  saveSession: (session: SessionConfig) =>
    invoke<void>('save_session', { session }),
  deleteSession: (sessionId: string) => invoke<void>('delete_session', { sessionId }),

  // SFTP & Remote
  connectSftp: (config: SessionConfig, secret?: string) =>
    invoke<string>('connect_sftp', { config, secret: secret || null }),
  disconnectSftp: (sessionId: string) => invoke<void>('disconnect_sftp', { sessionId }),
  isSftpConnected: (sessionId: string) =>
    invoke<boolean>('is_sftp_connected', { sessionId }),
  getRemoteHome: (sessionId: string) =>
    invoke<string>('get_remote_home', { sessionId }),
  readRemoteDir: (sessionId: string, remotePath: string, showHidden: boolean) =>
    invoke<FileItem[]>('read_remote_dir', { sessionId, remotePath, showHidden }),
  createRemoteDir: (sessionId: string, remotePath: string) =>
    invoke<void>('create_remote_dir', { sessionId, remotePath }),
  deleteRemoteItem: (sessionId: string, remotePath: string, isDir: boolean) =>
    invoke<void>('delete_remote_item', { sessionId, remotePath, isDir }),
  renameRemoteItem: (sessionId: string, from: string, to: string) =>
    invoke<void>('rename_remote_item', { sessionId, from, to }),
  chmodRemoteItem: (sessionId: string, remotePath: string, mode: number) =>
    invoke<void>('chmod_remote_item', { sessionId, remotePath, mode }),

  // Transfers
  uploadFile: (sessionId: string, localPath: string, remotePath: string, taskId: string) =>
    invoke<void>('upload_file', { sessionId, localPath, remotePath, taskId }),
  downloadFile: (sessionId: string, remotePath: string, localPath: string, taskId: string) =>
    invoke<void>('download_file', { sessionId, remotePath, localPath, taskId }),

  // Remote editing & Terminal
  editRemoteFile: (sessionId: string, remotePath: string) =>
    invoke<string>('edit_remote_file', { sessionId, remotePath }),
  openSshTerminal: (host: string, port: number, username: string, remotePath?: string) =>
    invoke<void>('open_ssh_terminal', { host, port, username, remotePath: remotePath || null }),
  openDevtools: () => invoke<void>('open_devtools'),
};
