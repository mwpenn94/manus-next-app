import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { PanelLeftClose, PanelRightClose, PanelTopClose, PanelBottomClose, Rows, Columns, ChevronsLeftRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const MIN_PANEL_PERCENT = 10;

const ResizablePanels = () => {
  const [sizes, setSizes] = useState<number[]>([33.33, 33.34, 33.33]);
  const [collapsedIndices, setCollapsedIndices] = useState<boolean[]>([false, false, false]);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const containerRef = useRef<HTMLDivElement>(null);
  const initialSizesRef = useRef<number[]>([]);

  const handleCollapse = (index: number) => {
    const newCollapsed = [...collapsedIndices];
    newCollapsed[index] = !newCollapsed[index];

    const activePanelCount = newCollapsed.filter(c => !c).length;
    const newSizes = sizes.map((_, i) => {
      if (newCollapsed[i]) return 0;
      return 100 / activePanelCount;
    });

    setCollapsedIndices(newCollapsed);
    setSizes(newSizes);
  };

  const handleDrag = (index: number, info: PanInfo) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const totalSize = orientation === 'horizontal' ? rect.width : rect.height;
    const delta = orientation === 'horizontal' ? info.offset.x : info.offset.y;
    const deltaPercent = (delta / totalSize) * 100;

    const newSizes = [...initialSizesRef.current];
    
    let size1 = newSizes[index] + deltaPercent;
    let size2 = newSizes[index + 1] - deltaPercent;

    if (size1 < MIN_PANEL_PERCENT) {
      size2 -= (MIN_PANEL_PERCENT - size1);
      size1 = MIN_PANEL_PERCENT;
    }
    if (size2 < MIN_PANEL_PERCENT) {
      size1 -= (MIN_PANEL_PERCENT - size2);
      size2 = MIN_PANEL_PERCENT;
    }

    // Ensure we don't push other panels beyond their min size
    if (size1 > 100 - MIN_PANEL_PERCENT) size1 = 100 - MIN_PANEL_PERCENT;
    if (size2 > 100 - MIN_PANEL_PERCENT) size2 = 100 - MIN_PANEL_PERCENT;

    newSizes[index] = size1;
    newSizes[index + 1] = size2;

    setSizes(newSizes);
  };

  const setPreset = (preset: number[]) => {
    setCollapsedIndices(preset.map(p => p === 0));
    const activeCount = preset.filter(p => p > 0).length;
    if (activeCount > 0) {
        const total = preset.reduce((a, b) => a + b, 0);
        if (total !== 100) {
            const factor = 100 / total;
            setSizes(preset.map(p => p * factor));
        } else {
            setSizes(preset);
        }
    } else {
        setSizes(preset);
    }
  };

  const resetLayout = () => {
    const activeCount = collapsedIndices.filter(c => !c).length;
    if (activeCount === 0) return;
    const newSizes = sizes.map((_, i) => collapsedIndices[i] ? 0 : 100 / activeCount);
    setSizes(newSizes);
  };

  const visiblePanels = useMemo(() => sizes.map((_, i) => !collapsedIndices[i]), [collapsedIndices]);

  return (
    <TooltipProvider>
      <Card className="w-full h-[700px] flex flex-col bg-background shadow-lg border-border">
        <CardHeader className="p-2 border-b border-border flex-row items-center justify-between flex-wrap">
          <CardTitle className="text-base font-semibold px-2">Resizable Layout</CardTitle>
          <div className="flex items-center gap-1">
            <ActionButton tooltip={orientation === 'horizontal' ? "Vertical Layout" : "Horizontal Layout"} onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}>
              {orientation === 'horizontal' ? <Rows className="h-4 w-4" /> : <Columns className="h-4 w-4" />}
            </ActionButton>
            <ActionButton tooltip="50/50 Layout" onClick={() => setPreset([50, 50, 0])}>50/50</ActionButton>
            <ActionButton tooltip="Equal Thirds" onClick={() => setPreset([33.33, 33.34, 33.33])}>1/3</ActionButton>
            <ActionButton tooltip="25/50/25 Layout" onClick={() => setPreset([25, 50, 25])}>25/50/25</ActionButton>
            <ActionButton tooltip="Reset Layout" onClick={resetLayout}><ChevronsLeftRight className="h-4 w-4" /></ActionButton>
          </div>
        </CardHeader>
        <div 
          ref={containerRef} 
          className={cn('flex-grow flex w-full h-full overflow-hidden', orientation === 'horizontal' ? 'flex-row' : 'flex-col')}
        >
          <AnimatePresence initial={false}>
            {visiblePanels.map((isVisible, i) => (
              isVisible && (
                <motion.div 
                  key={`panel-${i}`}
                  className="bg-card overflow-auto relative"
                  style={{ flexBasis: `${sizes[i]}%` }}
                  animate={{ flexBasis: `${sizes[i]}%`, opacity: 1 }}
                  initial={{ flexBasis: 0, opacity: 0 }}
                  exit={{ flexBasis: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                >
                  <PanelContent index={i} orientation={orientation} onCollapse={handleCollapse} />
                </motion.div>
              )
            ))}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {visiblePanels.map((isVisible, i) => {
              if (i < visiblePanels.length - 1 && isVisible && visiblePanels[i+1]) {
                return (
                  <Divider 
                    key={`divider-${i}`}
                    onDrag={(info) => handleDrag(i, info)}
                    onDragStart={() => initialSizesRef.current = [...sizes]}
                    onDoubleClick={resetLayout}
                    orientation={orientation} 
                  />
                )
              }
              return null;
            })}
          </AnimatePresence>
        </div>
      </Card>
    </TooltipProvider>
  );
};

const ActionButton = ({ tooltip, children, onClick }: { tooltip: string, children: React.ReactNode, onClick: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="sm" onClick={onClick}>{children}</Button>
    </TooltipTrigger>
    <TooltipContent><p>{tooltip}</p></TooltipContent>
  </Tooltip>
);

interface DividerProps {
  onDrag: (info: PanInfo) => void;
  onDragStart: () => void;
  onDoubleClick: () => void;
  orientation: 'horizontal' | 'vertical';
}

const Divider = ({ onDrag, onDragStart, onDoubleClick, orientation }: DividerProps) => (
  <motion.div
    drag={orientation === "horizontal" ? "x" : "y"}
    onDrag={(_, info) => onDrag(info)}
    onDragStart={onDragStart}
    onDoubleClick={onDoubleClick}
    dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
    dragElastic={0}
    dragMomentum={false}
    className={cn(
      'group flex-shrink-0 flex items-center justify-center bg-transparent hover:bg-primary/20 transition-colors z-10',
      orientation === 'horizontal' ? 'w-2.5 cursor-col-resize' : 'h-2.5 cursor-row-resize'
    )}
    aria-label="Resizable handle"
  >
    <GripVertical className={cn('text-border group-hover:text-primary transition-colors', orientation === 'vertical' && 'rotate-90')} />
  </motion.div>
);

const PanelContent = ({ index, orientation, onCollapse }: { index: number, orientation: 'horizontal' | 'vertical', onCollapse: (index: number) => void }) => {
  const CollapseIcon = orientation === 'horizontal' ? (index === 0 ? PanelLeftClose : PanelRightClose) : (index === 0 ? PanelTopClose : PanelBottomClose);
  return (
    <CardContent className="p-4 h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Panel {index + 1}</h3>
        <ActionButton tooltip={`Collapse panel ${index + 1}`} onClick={() => onCollapse(index)}>
          <CollapseIcon className="h-4 w-4" />
        </ActionButton>
      </div>
      <p className="text-muted-foreground text-sm">This is panel {index + 1}. It can be resized, collapsed, and restored. The layout can be changed from horizontal to vertical.</p>
      <div className="mt-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-background rounded-md border border-border/50">
            <div className="w-8 h-8 bg-muted rounded-sm flex-shrink-0" />
            <div className="flex-grow space-y-1.5">
              <div className="h-3 bg-muted rounded-sm w-3/4" />
              <div className="h-2 bg-muted/50 rounded-sm w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  );
};

export default ResizablePanels;
