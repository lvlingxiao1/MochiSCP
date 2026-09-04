export type AuthType = 'password' | 'private_key';

export interface FileItem {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  is_symlink: boolean;
  modified_at: number; // Unix timestamp in seconds
  permissions: string; // e.g. "0755" or "rwxr-xr-x"
  owner?: string;
  group?: string;
}

export interface SessionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: AuthType;
  key_path?: string;
  initial_remote_path?: string;
  color?: string;
  created_at: number;
}

export type TransferDirection = 'upload' | 'download';
export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'paused';

export interface TransferTask {
  id: string;
  name: string;
  local_path: string;
  remote_path: string;
  direction: TransferDirection;
  size: number;
  transferred: number;
  speed: number; // bytes/sec
  status: TransferStatus;
  error?: string;
  started_at?: number;
  completed_at?: number;
}

export interface DriveInfo {
  name: string;
  mount_point: string;
  total_space?: number;
  available_space?: number;
}

export interface PlatformInfo {
  os: 'macos' | 'windows' | 'linux';
  home_dir: string;
  sep: string;
}
