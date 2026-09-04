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
    <div className="border-t border-pink-100 bg-white/95 backdrop-blur-md select-none transition-all duration-200 shadow-lg">
      {/* Drawer Header Bar */}
      <div
        onClick={onToggle}
        className="h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-rose-50/60 transition-colors text-xs text-stone-700"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-stone-800">
            <Layers className="w-3.5 h-3.5 text-rose-500" />
            <span>Transfer Queue</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            {activeTasks.length > 0 && (
              <span className="text-rose-600 font-medium">
                {activeTasks.length} active
              </span>
            )}
            <span>{completedTasks.length} completed</span>
            {failedTasks.length > 0 && (
              <span className="text-rose-600 font-medium">
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
              className="p-1 hover:text-stone-900 text-stone-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="h-44 border-t border-pink-100 overflow-y-auto divide-y divide-pink-50/70 p-2 bg-[#fffbfc]">
          {tasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-stone-400">
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
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      )}
                      <span className="font-medium text-stone-800 truncate">
                        {task.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-stone-500 shrink-0">
                      {task.status === 'transferring' && (
                        <span className="text-rose-600 font-semibold">{formatSpeed(task.speed)}</span>
                      )}
                      <span>
                        {formatFileSize(task.transferred)} / {formatFileSize(task.size)}
                      </span>
                      <span className="w-10 text-right font-bold text-stone-700">
                        {progress}%
                      </span>
                      {task.status === 'completed' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      {task.status === 'failed' && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      {task.status === 'pending' && (
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-rose-100/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 rounded-full ${
                        task.status === 'failed'
                          ? 'bg-rose-500'
                          : task.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-rose-400 to-pink-500'
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
