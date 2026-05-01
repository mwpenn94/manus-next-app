
import { useState, useEffect, useCallback, createContext, useContext, useRef, HTMLAttributes } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_KEY = 'manus-pinned-order';

interface DragReorderContextValue<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  draggedItem: React.MutableRefObject<number | null>;
  reorder: (fromIndex: number, toIndex: number) => void;
}

const DragReorderContext = createContext<DragReorderContextValue<any> | null>(null);

export function useDragReorder<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const storedOrder = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedOrder) {
        const orderedIds = JSON.parse(storedOrder) as string[];
        const itemMap = new Map(initialItems.map(item => [item.id, item]));
        const orderedItems = orderedIds.map(id => itemMap.get(id)).filter(Boolean) as T[];
        const remainingItems = initialItems.filter(item => !orderedIds.includes(item.id));
        return [...orderedItems, ...remainingItems];
      }
    } catch (error) {
      console.error("Failed to parse pinned order from localStorage", error);
    }
    return initialItems;
  });

  const draggedItem = useRef<number | null>(null);

  useEffect(() => {
    try {
      const orderedIds = items.map(item => item.id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orderedIds));
    } catch (error) {
      console.error("Failed to save pinned order to localStorage", error);
    }
  }, [items]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  const handleDragStart = (index: number) => {
    draggedItem.current = index;
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>, index: number) => {
    event.preventDefault();
    if (draggedItem.current === null || draggedItem.current === index) {
      return;
    }
    reorder(draggedItem.current, index);
    draggedItem.current = index;
  };

  const handleDrop = () => {
    draggedItem.current = null;
  };

  const contextValue = {
    items,
    setItems,
    draggedItem,
    reorder,
  };

  return {
    items,
    reorder,
    DragReorderProvider: ({ children }: { children: React.ReactNode }) => (
      <DragReorderContext.Provider value={contextValue}>
        {children}
      </DragReorderContext.Provider>
    ),
    getDraggableItemProps: (index: number) => ({
      onDragStart: () => handleDragStart(index),
      onDragOver: (e: React.DragEvent<HTMLElement>) => handleDragOver(e, index),
      onDrop: handleDrop,
      draggable: true,
    }),
  };
}

export const DragHandle = (props: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      {...props}
      className={cn(
        "cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors",
        props.className
      )}
    >
      <GripVertical className="h-5 w-5" />
    </div>
  );
};
