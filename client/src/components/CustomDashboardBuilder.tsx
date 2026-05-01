import React, { useState, useRef, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, List, Text, Type, Hash, Table } from 'lucide-react';
import { X } from 'lucide-react';

const GRID_SIZE = 20;

interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text' | 'list';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, string>;
}

interface CustomDashboardBuilderProps {
  widgets: Widget[];
  onAddWidget: (widget: { type: string; title: string; x: number; y: number; w: number; h: number }) => void;
  onRemoveWidget: (id: string) => void;
  onMoveWidget: (id: string, position: { x: number; y: number }) => void;
  onResizeWidget: (id: string, size: { w: number; h: number }) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}

const WidgetPlaceholder = ({ type }: { type: Widget['type'] }) => {
  const iconProps = { className: 'w-1/2 h-1/2 text-muted-foreground' };
  switch (type) {
    case 'chart':
      return <BarChart {...iconProps} />;
    case 'metric':
      return <Hash {...iconProps} />;
    case 'table':
      return <Table {...iconProps} />;
    case 'text':
      return <Type {...iconProps} />;
    case 'list':
      return <List {...iconProps} />;
    default:
      return null;
  }
};

const DashboardWidget = ({
  widget,
  isEditing,
  onMoveWidget,
  onResizeWidget,
  onRemoveWidget,
}: {
  widget: Widget;
  isEditing: boolean;
  onMoveWidget: (id: string, position: { x: number; y: number }) => void;
  onResizeWidget: (id: string, size: { w: number; h: number }) => void;
  onRemoveWidget: (id: string) => void;
}) => {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newX = Math.round((widget.x * GRID_SIZE + info.offset.x) / GRID_SIZE);
    const newY = Math.round((widget.y * GRID_SIZE + info.offset.y) / GRID_SIZE);
    onMoveWidget(widget.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
  };

  const handleResize = (corner: 'br' | 'bl' | 'tr' | 'tl') => (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const newW = widget.w + Math.round(info.offset.x / GRID_SIZE) * (corner.includes('r') ? 1 : -1);
      const newH = widget.h + Math.round(info.offset.y / GRID_SIZE) * (corner.includes('b') ? 1 : -1);
      const newX = widget.x + (corner.includes('l') ? Math.round(info.offset.x / GRID_SIZE) : 0);
      const newY = widget.y + (corner.includes('t') ? Math.round(info.offset.y / GRID_SIZE) : 0);

      if (newW > 0 && newH > 0) {
          onResizeWidget(widget.id, { w: newW, h: newH });
          if(corner.includes('l') || corner.includes('t')) {
            onMoveWidget(widget.id, { x: newX, y: newY });
          }
      }
  };

  return (
    <motion.div
      key={widget.id}
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: widget.x * GRID_SIZE, y: widget.y * GRID_SIZE }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
      drag={isEditing}
      onDragEnd={handleDragEnd}
      dragMomentum={false}
      style={{
        position: 'absolute',
        width: widget.w * GRID_SIZE,
        height: widget.h * GRID_SIZE,
      }}
      className="group"
    >
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4 border-b">
          <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemoveWidget(widget.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-grow flex items-center justify-center">
          <WidgetPlaceholder type={widget.type} />
        </CardContent>
      </Card>
      {isEditing && (
        <>
          <motion.div onDrag={handleResize('br')} drag={true} dragMomentum={false} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary rounded-full border-2 border-background" />
          <motion.div onDrag={handleResize('bl')} drag={true} dragMomentum={false} className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize bg-primary rounded-full border-2 border-background" />
          <motion.div onDrag={handleResize('tr')} drag={true} dragMomentum={false} className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize bg-primary rounded-full border-2 border-background" />
          <motion.div onDrag={handleResize('tl')} drag={true} dragMomentum={false} className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize bg-primary rounded-full border-2 border-background" />
        </>
      )}
    </motion.div>
  );
};

export const CustomDashboardBuilder = ({
  widgets,
  onAddWidget,
  onRemoveWidget,
  onMoveWidget,
  onResizeWidget,
  isEditing,
  onToggleEdit,
}: CustomDashboardBuilderProps) => {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleAddWidget = (type: Widget['type']) => {
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    onAddWidget({ type, title, x: 0, y: 0, w: 10, h: 8 });
    setAddDialogOpen(false);
  };

  const widgetTypes: { type: Widget['type']; icon: React.ReactNode }[] = [
    { type: 'chart', icon: <BarChart /> },
    { type: 'metric', icon: <Hash /> },
    { type: 'table', icon: <Table /> },
    { type: 'text', icon: <Text /> },
    { type: 'list', icon: <List /> },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Custom Dashboard</h2>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isEditing}>Add Widget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Widget Type</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                {widgetTypes.map(({ type, icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-24 flex-col gap-2"
                    onClick={() => handleAddWidget(type)}
                  >
                    {icon}
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={onToggleEdit}>
            {isEditing ? 'Done' : 'Edit'}
          </Button>
        </div>
      </div>
      <div className="flex-grow relative p-4" ref={gridRef}>
        {isEditing && (
          <div
            className="absolute inset-0 bg-transparent"
            style={{
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              backgroundImage:
                'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
            }}
          />
        )}
        {widgets.map((widget) => (
          <DashboardWidget
            key={widget.id}
            widget={widget}
            isEditing={isEditing}
            onMoveWidget={onMoveWidget}
            onResizeWidget={onResizeWidget}
            onRemoveWidget={onRemoveWidget}
          />
        ))}
      </div>
    </div>
  );
};
