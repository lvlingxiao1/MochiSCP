import React from 'react';
import {
  Folder,
  FileText,
  FileCode,
  FileArchive,
  Image,
  Film,
  Music,
  FileSpreadsheet,
  Settings,
  File,
} from 'lucide-react';

interface FileIconProps {
  name: string;
  isDir: boolean;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ name, isDir, className = 'w-4 h-4' }) => {
  if (isDir) {
    return <Folder className={`${className} text-sky-400 fill-sky-400/20`} />;
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';

  // Code files
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'c', 'cpp', 'java', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'sh', 'sql', 'php'].includes(ext)) {
    return <FileCode className={`${className} text-indigo-400`} />;
  }

  // Archives
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'tgz'].includes(ext)) {
    return <FileArchive className={`${className} text-amber-400`} />;
  }

  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return <Image className={`${className} text-emerald-400`} />;
  }

  // Videos
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return <Film className={`${className} text-purple-400`} />;
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
    return <Music className={`${className} text-pink-400`} />;
  }

  // Config files
  if (['env', 'conf', 'config', 'ini', 'cfg', 'properties'].includes(ext) || name.startsWith('.')) {
    return <Settings className={`${className} text-slate-400`} />;
  }

  // Documents
  if (['md', 'txt', 'log', 'pdf', 'doc', 'docx'].includes(ext)) {
    return <FileText className={`${className} text-sky-200`} />;
  }

  // Data sheets
  if (['csv', 'xlsx', 'xls'].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-green-400`} />;
  }

  return <File className={`${className} text-slate-400`} />;
};
