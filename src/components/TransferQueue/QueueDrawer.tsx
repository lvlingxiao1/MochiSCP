import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
} from 'lucide-react';
import { TransferTask } from '../../types';
import { formatFileSize, formatSpeed } from '../../utils/format';

interface QueueDrawerProps {
  isOpen: boolean;
  tasks: TransferTask[];
  onToggle: () => void;
  onClearCompleted: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  tasks,
  onToggle,
  onClearCompleted,
}) => {
  const activeTasks = tasks.filter((t) => t.status === 'transferring');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  return (
    <div className="border-t border-slate-700/80 bg-slate-900/95 backdrop-blur-md select-none transition-all duration-200">
      {/* Drawer Header Bar */}
      <div
        onClick={onToggle}
        className="h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-colors text-xs text-slate-300"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Transfer Queue</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {activeTasks.length > 0 && (
              <span className="text-sky-400 font-medium">
                {activeTasks.length} active
              </span>
            )}
            <span>{completedTasks.length} completed</span>
            {failedTasks.length > 0 && (
              <span className="text-rose-400 font-medium">
                {failedTasks.length} failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {completedTasks.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearCompleted();
              }}
              title="Clear completed"
              className="p-1 hover:text-slate-100 text-slate-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="h-44 border-t border-slate-800/80 overflow-y-auto divide-y divide-slate-800/50 p-2">
          {tasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No transfers in queue
            </div>
          ) : (
            tasks.map((task) => {
              const progress =
                task.size > 0
                  ? Math.min(100, Math.round((task.transferred / task.size) * 100))
                  : task.status === 'completed'
                  ? 100
                  : 0;

              return (
                <div key={task.id} className="py-2 px-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {task.direction === 'upload' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="font-medium text-slate-200 truncate">
                        {task.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 shrink-0">
                      {task.status === 'transferring' && (
                        <span className="text-sky-400">{formatSpeed(task.speed)}</span>
                      )}
                      <span>
                        {formatFileSize(task.transferred)} / {formatFileSize(task.size)}
                      </span>
                      <span className="w-10 text-right font-bold text-slate-300">
                        {progress}%
                      </span>
                      {task.status === 'completed' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {task.status === 'failed' && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {task.status === 'pending' && (
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 rounded-full ${
                        task.status === 'failed'
                          ? 'bg-rose-500'
                          : task.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
