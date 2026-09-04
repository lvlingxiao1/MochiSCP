import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderUp,
  Home,
  RefreshCw,
  FolderPlus,
  Eye,
  EyeOff,
  Search,
  ArrowUpDown,
  Laptop,
  Server,
} from 'lucide-react';
import { DriveInfo, FileItem } from '../../types';
import { formatFileSize, formatTimestamp, octalToSymbolic } from '../../utils/format';
import { FileIcon } from './FileIcon';
import { ContextMenu } from './ContextMenu';

type SortField = 'name' | 'size' | 'modified_at';
type SortOrder = 'asc' | 'desc';

interface FilePaneProps {
  title: string;
  isRemote: boolean;
  currentPath: string;
  items: FileItem[];
  isLoading: boolean;
  drives?: DriveInfo[];
  showHidden: boolean;
  onNavigate: (path: string) => void;
  onGoHome?: () => void;
  onRefresh: () => void;
  onToggleHidden: () => void;
  onTransferItem: (item: FileItem) => void;
  onEditItem?: (item: FileItem) => void;
  onNewFolder: () => void;
  onRenameItem: (item: FileItem) => void;
  onDeleteItem: (item: FileItem) => void;
  onChmodItem?: (item: FileItem) => void;
}

export const FilePane: React.FC<FilePaneProps> = ({
  title,
  isRemote,
  currentPath,
  items,
  isLoading,
  drives,
  showHidden,
  onNavigate,
  onGoHome,
  onRefresh,
  onToggleHidden,
  onTransferItem,
  onEditItem,
  onNewFolder,
  onRenameItem,
  onDeleteItem,
  onChmodItem,
}) => {
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [inputPath, setInputPath] = useState(currentPath);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem | null;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputPath(currentPath);
    setSelectedItem(null);
  }, [currentPath]);

  // Breadcrumbs parsing
  const pathSegments = useMemo(() => {
    if (!currentPath) return [];
    const normalized = currentPath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    const segments: { name: string; fullPath: string }[] = [];

    let accum = currentPath.startsWith('/') ? '/' : '';
    for (let i = 0; i < parts.length; i++) {
      if (accum === '/' || accum === '') {
        accum += parts[i];
      } else {
        accum += (currentPath.includes('\\') ? '\\' : '/') + parts[i];
      }
      segments.push({
        name: parts[i],
        fullPath: accum,
      });
    }
    return segments;
  }, [currentPath]);

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => {
      // Directories always come first
      if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
      }

      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      } else if (sortField === 'size') {
        comparison = a.size - b.size;
      } else if (sortField === 'modified_at') {
        comparison = a.modified_at - b.modified_at;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleGoUp = () => {
    if (currentPath === '/' || currentPath === '') return;
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const parts = currentPath.split(separator).filter(Boolean);
    if (parts.length <= 1) {
      onNavigate(currentPath.startsWith('/') ? '/' : parts[0] + separator);
    } else {
      parts.pop();
      const parent = (currentPath.startsWith('/') ? '/' : '') + parts.join(separator);
      onNavigate(parent);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.is_dir) {
      onNavigate(item.path);
    } else if (isRemote && onEditItem) {
      onEditItem(item);
    } else {
      onTransferItem(item);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (item) setSelectedItem(item);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      onNavigate(inputPath.trim());
      setIsEditingPath(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => handleContextMenu(e, null)}
      className="flex-1 flex flex-col h-full bg-slate-900/60 border-r border-slate-700/60 last:border-r-0 select-none overflow-hidden relative"
    >
      {/* Pane Header */}
      <div className="h-10 border-b border-slate-700/60 bg-slate-800/60 px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRemote ? (
            <Server className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-200 truncate">{title}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {drives && drives.length > 1 && (
            <div className="flex items-center gap-1 mr-1">
              {drives.map((d) => (
                <button
                  key={d.mount_point}
                  onClick={() => onNavigate(d.mount_point)}
                  title={d.name}
                  className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-mono text-slate-300"
                >
                  {d.name.includes(':') ? d.name.slice(0, 2) : d.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => (onGoHome ? onGoHome() : onNavigate('~'))}
            title="Home Directory (~)"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleGoUp}
            title="Parent Directory (Up)"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
          >
            <FolderUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            title="Refresh"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={onNewFolder}
            title="New Folder (F7)"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleHidden}
            title={showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'}
            className={`p-1 rounded transition-colors ${
              showHidden
                ? 'text-sky-400 bg-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Path Breadcrumb & Search Bar */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-3 py-1.5 flex items-center gap-2">
        {/* Breadcrumb or Direct Path Input */}
        <div className="flex-1 min-w-0">
          {isEditingPath ? (
            <form onSubmit={handlePathSubmit} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                onBlur={() => setIsEditingPath(false)}
                className="w-full bg-slate-950 border border-sky-500/60 rounded px-2 py-0.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </form>
          ) : (
            <div
              onClick={() => setIsEditingPath(true)}
              title="Click to edit path directly"
              className="flex items-center gap-1 text-xs font-mono text-slate-400 cursor-text hover:bg-slate-800/50 px-1 py-0.5 rounded overflow-x-auto whitespace-nowrap scrollbar-none"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(currentPath.startsWith('/') ? '/' : 'C:\\');
                }}
                className="hover:text-sky-400 text-slate-400 shrink-0"
              >
                /
              </button>
              {pathSegments.map((seg) => (
                <React.Fragment key={seg.fullPath}>
                  <span className="text-slate-600">/</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(seg.fullPath);
                    }}
                    className="hover:text-sky-300 text-slate-300 hover:underline shrink-0"
                  >
                    {seg.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Quick search input */}
        <div className="relative w-28 shrink-0">
          <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="h-7 border-b border-slate-800 bg-slate-800/30 px-3 flex items-center text-[11px] font-semibold text-slate-400 select-none">
        <div
          onClick={() => handleSort('name')}
          className="flex-1 flex items-center gap-1 cursor-pointer hover:text-slate-200"
        >
          <span>Name</span>
          {sortField === 'name' && (
            <ArrowUpDown className="w-2.5 h-2.5 text-sky-400 shrink-0" />
          )}
        </div>
        <div
          onClick={() => handleSort('size')}
          className="w-20 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-slate-200"
        >
          <span>Size</span>
          {sortField === 'size' && (
            <ArrowUpDown className="w-2.5 h-2.5 text-sky-400 shrink-0" />
          )}
        </div>
        <div
          onClick={() => handleSort('modified_at')}
          className="w-32 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-slate-200 hidden sm:flex"
        >
          <span>Modified</span>
          {sortField === 'modified_at' && (
            <ArrowUpDown className="w-2.5 h-2.5 text-sky-400 shrink-0" />
          )}
        </div>
        {isRemote && (
          <div className="w-16 text-right hidden md:block">
            <span>Perms</span>
          </div>
        )}
      </div>

      {/* File List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 focus:outline-none">
        {displayItems.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-xs text-slate-500">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>Loading directory...</span>
              </div>
            ) : (
              <span>Empty directory</span>
            )}
          </div>
        ) : (
          displayItems.map((item) => {
            const isSelected = selectedItem?.path === item.path;
            return (
              <div
                key={item.path}
                onClick={() => setSelectedItem(item)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`flex items-center px-3 py-1.5 text-xs transition-colors cursor-default ${
                  isSelected
                    ? 'bg-sky-500/20 text-white'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                {/* File Icon & Name */}
                <div className="flex-1 flex items-center gap-2 min-w-0 pr-2">
                  <FileIcon name={item.name} isDir={item.is_dir} isSymlink={item.is_symlink} />
                  <span className="truncate">{item.name}</span>
                </div>

                {/* Size */}
                <div className="w-20 text-right font-mono text-[11px] text-slate-400 shrink-0">
                  {item.is_dir
                    ? item.is_symlink
                      ? '<LINK DIR>'
                      : '<DIR>'
                    : formatFileSize(item.size)}
                </div>

                {/* Modified Date */}
                <div className="w-32 text-right font-mono text-[11px] text-slate-500 shrink-0 hidden sm:block">
                  {formatTimestamp(item.modified_at)}
                </div>

                {/* Remote Permissions */}
                {isRemote && (
                  <div
                    title={`Octal: ${item.permissions}`}
                    className="w-16 text-right font-mono text-[10px] text-slate-400 shrink-0 hidden md:block"
                  >
                    {octalToSymbolic(item.permissions)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pane Footer Info */}
      <div className="h-6 border-t border-slate-800/80 bg-slate-900/80 px-3 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          <span>{displayItems.length} items</span>
          {selectedItem && (
            <span className="ml-2 text-sky-300">
              Selected: {selectedItem.name} ({selectedItem.is_dir ? 'DIR' : formatFileSize(selectedItem.size)})
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">
          {isRemote ? 'Remote (SFTP)' : 'Local FS'}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          isRemote={isRemote}
          onClose={() => setContextMenu(null)}
          onTransfer={() => contextMenu.item && onTransferItem(contextMenu.item)}
          onEdit={() => contextMenu.item && onEditItem && onEditItem(contextMenu.item)}
          onOpen={() => contextMenu.item && onNavigate(contextMenu.item.path)}
          onNewFolder={onNewFolder}
          onRename={() => contextMenu.item && onRenameItem(contextMenu.item)}
          onChmod={() => contextMenu.item && onChmodItem && onChmodItem(contextMenu.item)}
          onDelete={() => contextMenu.item && onDeleteItem(contextMenu.item)}
          onCopyPath={() => {
            if (contextMenu.item) {
              navigator.clipboard.writeText(contextMenu.item.path);
            }
          }}
        />
      )}
    </div>
  );
};
