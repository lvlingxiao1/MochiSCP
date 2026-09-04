import { FileItem } from '../types';

export interface DragSessionData {
  source: 'local' | 'remote';
  sourcePath: string;
  items: FileItem[];
}

let activeDragSession: DragSessionData | null = null;

export const setDragSession = (data: DragSessionData | null) => {
  activeDragSession = data;
};

export const getDragSession = (): DragSessionData | null => {
  return activeDragSession;
};
