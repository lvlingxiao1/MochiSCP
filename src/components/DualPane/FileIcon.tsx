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
  CornerUpRight,
} from 'lucide-react';

interface FileIconProps {
  name: string;
  isDir: boolean;
  isSymlink?: boolean;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  name,
  isDir,
  isSymlink,
  className = 'w-4 h-4',
}) => {
  const renderIcon = () => {
    if (isDir) {
      return <Folder className={`${className} text-rose-400 fill-rose-300/25`} />;
    }

    const ext = name.split('.').pop()?.toLowerCase() || '';

    // Code files
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'c', 'cpp', 'java', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'sh', 'sql', 'php'].includes(ext)) {
      return <FileCode className={`${className} text-rose-500`} />;
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
    return <Settings className={`${className} text-stone-400`} />;
  }

  // Documents
  if (['md', 'txt', 'log', 'pdf', 'doc', 'docx'].includes(ext)) {
    return <FileText className={`${className} text-rose-400`} />;
  }

  // Data sheets
  if (['csv', 'xlsx', 'xls'].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  }

    return <File className={`${className} text-stone-400`} />;
  };

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {renderIcon()}
      {isSymlink && (
        <CornerUpRight className="w-2.5 h-2.5 text-rose-500 absolute -bottom-1 -right-1 bg-white rounded-full p-[0.5px] border border-rose-300 shadow-xs" />
      )}
    </div>
  );
};
