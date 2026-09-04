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
  Upload,
  Download,
} from 'lucide-react';
import { DriveInfo, FileItem } from '../../types';
import { formatFileSize, formatTimestamp, octalToSymbolic } from '../../utils/format';
import { setDragSession, getDragSession, DragSessionData } from '../../utils/dragDrop';
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
  onTransferItems: (items: FileItem[], isRemoteSource: boolean, targetDir?: string) => void;
  onEditItem?: (item: FileItem) => void;
  onNewFolder: () => void;
  onRenameItem: (item: FileItem) => void;
  onDeleteItems: (items: FileItem[]) => void;
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
  onTransferItems,
  onEditItem,
  onNewFolder,
  onRenameItem,
  onDeleteItems,
  onChmodItem,
}) => {
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [inputPath, setInputPath] = useState(currentPath);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Drag & drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem | null;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputPath(currentPath);
    setSelectedItems([]);
    setLastSelectedIndex(null);
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

  const selectedPaths = useMemo(() => {
    return new Set(selectedItems.map((i) => i.path));
  }, [selectedItems]);

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

  // Selection logic: Single, Command/Ctrl toggle, Shift range
  const handleItemClick = (item: FileItem, index: number, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Toggle item
      if (selectedPaths.has(item.path)) {
        setSelectedItems((prev) => prev.filter((i) => i.path !== item.path));
      } else {
        setSelectedItems((prev) => [...prev, item]);
      }
      setLastSelectedIndex(index);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      // Range select
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const range = displayItems.slice(start, end + 1);
      setSelectedItems(range);
    } else {
      // Single select
      setSelectedItems([item]);
      setLastSelectedIndex(index);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.is_dir) {
      onNavigate(item.path);
    } else if (isRemote && onEditItem) {
      onEditItem(item);
    } else {
      onTransferItems([item], isRemote);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (item) {
      if (!selectedPaths.has(item.path)) {
        setSelectedItems([item]);
        const idx = displayItems.findIndex((i) => i.path === item.path);
        setLastSelectedIndex(idx !== -1 ? idx : null);
      }
    }

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

  const dragCounterRef = useRef(0);

  // Keyboard Shortcuts (Select All Cmd+A, Transfer F5, Delete F8)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelectedItems(displayItems);
    } else if (e.key === 'F5' && selectedItems.length > 0) {
      e.preventDefault();
      onTransferItems(selectedItems, isRemote);
    } else if ((e.key === 'F8' || (e.metaKey && e.key === 'Backspace')) && selectedItems.length > 0) {
      e.preventDefault();
      onDeleteItems(selectedItems);
    } else if (e.key === 'Enter' && selectedItems.length === 1) {
      const item = selectedItems[0];
      handleItemDoubleClick(item);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    let itemsToDrag = selectedItems;
    if (!selectedPaths.has(item.path)) {
      itemsToDrag = [item];
      setSelectedItems([item]);
    }

    const payload: DragSessionData = {
      source: isRemote ? 'remote' : 'local',
      sourcePath: currentPath,
      items: itemsToDrag,
    };

    console.log('[SkySCP] Drag started from', isRemote ? 'remote' : 'local', payload);
    setDragSession(payload);

    e.dataTransfer.effectAllowed = 'copy';
    const jsonStr = JSON.stringify(payload);
    try {
      e.dataTransfer.setData('text/plain', jsonStr);
      e.dataTransfer.setData('text', jsonStr);
      e.dataTransfer.setData('application/json', jsonStr);
    } catch (err) {
      console.warn('[SkySCP] dataTransfer.setData error:', err);
    }
  };

  const handleDragEnd = () => {
    console.log('[SkySCP] Drag ended');
    setDragSession(null);
    dragCounterRef.current = 0;
    setIsDragOver(false);
    setDropTargetFolder(null);
  };

  const handlePaneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragOver(true);
  };

  const handlePaneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handlePaneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
      setDropTargetFolder(null);
    }
  };

  const handlePaneDrop = (e: React.DragEvent, overrideTargetFolder?: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const destination = overrideTargetFolder || dropTargetFolder || currentPath;
    setDropTargetFolder(null);

    let payload = getDragSession();
    if (!payload) {
      const raw =
        e.dataTransfer.getData('text/plain') ||
        e.dataTransfer.getData('text') ||
        e.dataTransfer.getData('application/json');
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (err) {
          console.error('[SkySCP] Failed to parse dropped data:', err);
        }
      }
    }

    console.log('[SkySCP] Drop received on pane:', {
      pane: isRemote ? 'remote' : 'local',
      destination,
      payload,
    });

    setDragSession(null);

    if (!payload || !payload.items || payload.items.length === 0) {
      console.warn('[SkySCP] Drop payload was empty');
      return;
    }

    const isFromRemote = payload.source === 'remote';
    if (isFromRemote !== isRemote) {
      onTransferItems(payload.items, isFromRemote, destination);
    } else {
      console.log('[SkySCP] Dropped within same pane, ignored');
    }
  };

  // Calculate selected total size
  const totalSelectedSize = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (item.is_dir ? 0 : item.size), 0);
  }, [selectedItems]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragEnter={handlePaneDragEnter}
      onDragOver={handlePaneDragOver}
      onDragLeave={handlePaneDragLeave}
      onDrop={(e) => handlePaneDrop(e)}
      className="flex-1 flex flex-col h-full bg-white/70 border-r border-pink-100 last:border-r-0 select-none overflow-hidden relative focus:outline-none"
    >
      {/* Visual Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-rose-50/90 backdrop-blur-xs border-2 border-dashed border-rose-400 flex flex-col items-center justify-center pointer-events-none animate-pop-in">
          <div className="p-5 rounded-2xl bg-white/95 border border-rose-300 flex flex-col items-center gap-2 shadow-xl shadow-rose-200/50 pointer-events-none">
            {isRemote ? (
              <Upload className="w-8 h-8 text-rose-500 animate-bounce pointer-events-none" />
            ) : (
              <Download className="w-8 h-8 text-rose-500 animate-bounce pointer-events-none" />
            )}
            <span className="text-sm font-bold text-rose-900 pointer-events-none">
              Drop here to {isRemote ? 'Upload to Remote' : 'Download to Local'}
            </span>
            {dropTargetFolder && (
              <span className="text-xs text-rose-700 font-mono bg-rose-100 px-2 py-0.5 rounded pointer-events-none border border-rose-200">
                Into: {dropTargetFolder}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pane Header */}
      <div className="h-10 border-b border-pink-100 bg-rose-50/40 px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRemote ? (
            <Server className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <Laptop className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold text-stone-800 truncate">{title}</span>
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
                  className="px-1.5 py-0.5 rounded bg-rose-100/80 hover:bg-rose-200 text-[10px] font-mono text-stone-700 cursor-pointer"
                >
                  {d.name.includes(':') ? d.name.slice(0, 2) : d.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => (onGoHome ? onGoHome() : onNavigate('~'))}
            title="Home Directory (~)"
            className="p-1 rounded text-stone-500 hover:text-rose-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleGoUp}
            title="Parent Directory (Up)"
            className="p-1 rounded text-stone-500 hover:text-rose-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
          >
            <FolderUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            title="Refresh"
            className="p-1 rounded text-stone-500 hover:text-rose-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
          </button>
          <button
            onClick={onNewFolder}
            title="New Folder (F7)"
            className="p-1 rounded text-stone-500 hover:text-rose-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleHidden}
            title={showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              showHidden
                ? 'text-rose-600 bg-rose-100/90 border border-rose-200'
                : 'text-stone-500 hover:text-rose-600 hover:bg-rose-100/70'
            }`}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Path Breadcrumb & Search Bar */}
      <div className="border-b border-pink-100 bg-white/90 px-3 py-1.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {isEditingPath ? (
            <form onSubmit={handlePathSubmit} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                onBlur={() => setIsEditingPath(false)}
                className="w-full bg-rose-50/30 border border-rose-300 rounded px-2 py-0.5 text-xs text-stone-800 font-mono focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </form>
          ) : (
            <div
              onClick={() => setIsEditingPath(true)}
              title="Click to edit path directly"
              className="flex items-center gap-1 text-xs font-mono text-stone-500 cursor-text hover:bg-rose-50/60 px-1 py-0.5 rounded overflow-x-auto whitespace-nowrap scrollbar-none"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(currentPath.startsWith('/') ? '/' : 'C:\\');
                }}
                className="hover:text-rose-600 text-stone-500 shrink-0 font-bold"
              >
                /
              </button>
              {pathSegments.map((seg) => (
                <React.Fragment key={seg.fullPath}>
                  <span className="text-pink-300">/</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(seg.fullPath);
                    }}
                    className="hover:text-rose-600 text-stone-700 hover:underline shrink-0 font-medium"
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
          <Search className="w-3 h-3 absolute left-2 top-2 text-stone-400" />
          <input
            type="text"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-rose-50/30 border border-pink-200/80 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-stone-800 placeholder-stone-400 focus:outline-none focus:border-rose-400 focus:bg-white"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="h-7 border-b border-pink-100 bg-rose-50/50 px-3 flex items-center text-[11px] font-semibold text-stone-600 select-none">
        <div
          onClick={() => handleSort('name')}
          className="flex-1 flex items-center gap-1 cursor-pointer hover:text-stone-900"
        >
          <span>Name</span>
          {sortField === 'name' && (
            <ArrowUpDown className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          )}
        </div>
        <div
          onClick={() => handleSort('size')}
          className="w-24 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-stone-900"
        >
          <span>Size</span>
          {sortField === 'size' && (
            <ArrowUpDown className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          )}
        </div>
        <div
          onClick={() => handleSort('modified_at')}
          className="w-32 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-stone-900 hidden sm:flex"
        >
          <span>Modified</span>
          {sortField === 'modified_at' && (
            <ArrowUpDown className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          )}
        </div>
        {isRemote && (
          <div className="w-16 text-right hidden md:block">
            <span>Perms</span>
          </div>
        )}
      </div>

      {/* File List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-pink-50/60 focus:outline-none">
        {displayItems.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-xs text-stone-400">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                <span>Loading directory...</span>
              </div>
            ) : (
              <span>Empty directory</span>
            )}
          </div>
        ) : (
          displayItems.map((item, index) => {
            const isSelected = selectedPaths.has(item.path);
            const isRowDropTarget = dropTargetFolder === item.path;

            return (
              <div
                key={item.path}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  if (item.is_dir) {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropTargetFolder(item.path);
                  }
                }}
                onDragLeave={() => {
                  if (dropTargetFolder === item.path) {
                    setDropTargetFolder(null);
                  }
                }}
                onDrop={(e) => {
                  if (item.is_dir) {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePaneDrop(e, item.path);
                  }
                }}
                onClick={(e) => handleItemClick(item, index, e)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`flex items-center px-3 py-1.5 text-xs transition-colors cursor-default ${
                  isRowDropTarget
                    ? 'bg-rose-100 border border-rose-400 text-rose-950 font-medium'
                    : isSelected
                    ? 'bg-rose-100/80 text-rose-950 font-medium'
                    : 'text-stone-700 hover:bg-rose-50/60'
                }`}
              >
                {/* File Icon & Name */}
                <div className="flex-1 flex items-center gap-2 min-w-0 pr-2">
                  <FileIcon name={item.name} isDir={item.is_dir} isSymlink={item.is_symlink} />
                  <span className="truncate">{item.name}</span>
                </div>

                {/* Size */}
                <div className="w-24 text-right font-mono text-[11px] text-stone-500 shrink-0">
                  {item.is_dir
                    ? item.is_symlink
                      ? '<LINK DIR>'
                      : '<DIR>'
                    : formatFileSize(item.size)}
                </div>

                {/* Modified Date */}
                <div className="w-32 text-right font-mono text-[11px] text-stone-400 shrink-0 hidden sm:block">
                  {formatTimestamp(item.modified_at)}
                </div>

                {/* Remote Permissions */}
                {isRemote && (
                  <div
                    title={`Octal: ${item.permissions}`}
                    className="w-16 text-right font-mono text-[10px] text-stone-400 shrink-0 hidden md:block"
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
      <div className="h-6 border-t border-pink-100 bg-rose-50/50 px-3 flex items-center justify-between text-[11px] text-stone-500">
        <div className="truncate">
          <span>{displayItems.length} items</span>
          {selectedItems.length > 0 && (
            <span className="ml-2 text-rose-600 font-medium">
              {selectedItems.length === 1
                ? `Selected: ${selectedItems[0].name} (${selectedItems[0].is_dir ? 'DIR' : formatFileSize(selectedItems[0].size)})`
                : `Selected: ${selectedItems.length} items (${formatFileSize(totalSelectedSize)})`}
            </span>
          )}
        </div>
        <div className="text-[10px] text-stone-400 shrink-0 ml-2">
          {isRemote ? 'Remote (SFTP)' : 'Local FS'}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          selectedCount={selectedItems.length}
          isRemote={isRemote}
          onClose={() => setContextMenu(null)}
          onTransfer={() =>
            onTransferItems(
              selectedItems.length > 0 ? selectedItems : contextMenu.item ? [contextMenu.item] : [],
              isRemote
            )
          }
          onEdit={() => contextMenu.item && onEditItem && onEditItem(contextMenu.item)}
          onOpen={() => contextMenu.item && onNavigate(contextMenu.item.path)}
          onNewFolder={onNewFolder}
          onRename={() => contextMenu.item && onRenameItem(contextMenu.item)}
          onChmod={() => contextMenu.item && onChmodItem && onChmodItem(contextMenu.item)}
          onDelete={() =>
            onDeleteItems(
              selectedItems.length > 0 ? selectedItems : contextMenu.item ? [contextMenu.item] : []
            )
          }
          onCopyPath={() => {
            const paths = (
              selectedItems.length > 0 ? selectedItems : contextMenu.item ? [contextMenu.item] : []
            ).map((i) => i.path);
            navigator.clipboard.writeText(paths.join('\n'));
          }}
        />
      )}
    </div>
  );
};
