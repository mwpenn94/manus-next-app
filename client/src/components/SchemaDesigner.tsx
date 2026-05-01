import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { Plus, Minus, Key, Database, Table as TableIcon, Columns } from 'lucide-react';

// Helper for class names
const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');

// Mocked shadcn/ui components for a self-contained example
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }> = ({ children, className, ...props }) => (
  <button className={cn('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background', className)} {...props}>{children}</button>
);

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props}>{children}</div>
);

// --- TYPES ---
type Constraint = 'PK' | 'FK';

type Column = {
  name: string;
  type: string;
  constraints?: Constraint[];
};

type TableEntity = {
  id: string;
  name: string;
  columns: Column[];
  x: number;
  y: number;
};

type Relationship = {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
};

// --- MOCK DATA ---
const initialTables: TableEntity[] = [
  { id: 'users', name: 'users', x: 100, y: 200, columns: [
      { name: 'id', type: 'uuid', constraints: ['PK'] }, { name: 'username', type: 'varchar' }, { name: 'email', type: 'varchar' }, { name: 'created_at', type: 'timestamp' },
    ]},
  { id: 'posts', name: 'posts', x: 400, y: 100, columns: [
      { name: 'id', type: 'uuid', constraints: ['PK'] }, { name: 'title', type: 'varchar' }, { name: 'content', type: 'text' }, { name: 'author_id', type: 'uuid', constraints: ['FK'] },
    ]},
  { id: 'comments', name: 'comments', x: 400, y: 400, columns: [
      { name: 'id', type: 'uuid', constraints: ['PK'] }, { name: 'content', type: 'text' }, { name: 'post_id', type: 'uuid', constraints: ['FK'] }, { name: 'author_id', type: 'uuid', constraints: ['FK'] },
    ]},
  { id: 'tags', name: 'tags', x: 700, y: 100, columns: [
      { name: 'id', type: 'uuid', constraints: ['PK'] }, { name: 'name', type: 'varchar' },
    ]},
  { id: 'post_tags', name: 'post_tags', x: 700, y: 300, columns: [
      { name: 'post_id', type: 'uuid', constraints: ['PK', 'FK'] }, { name: 'tag_id', type: 'uuid', constraints: ['PK', 'FK'] },
    ]},
];

const initialRelationships: Relationship[] = [
  { from: 'posts', to: 'users', type: 'one-to-many' },
  { from: 'comments', to: 'posts', type: 'one-to-many' },
  { from: 'comments', to: 'users', type: 'one-to-many' },
  { from: 'post_tags', to: 'posts', type: 'many-to-many' },
  { from: 'post_tags', to: 'tags', type: 'many-to-many' },
];

// --- SUB-COMPONENTS ---
const Entity: React.FC<{ entity: TableEntity; onPositionChange: (id: string, x: number, y: number) => void }> = ({ entity, onPositionChange }) => {
  const dragControls = useDragControls();
  const x = useMotionValue(entity.x);
  const y = useMotionValue(entity.y);

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      onDragEnd={() => onPositionChange(entity.id, x.get(), y.get())}
      style={{ x, y }}
      className="absolute bg-card border border-border rounded-lg shadow-lg w-64 cursor-grab active:cursor-grabbing"
      whileHover={{ boxShadow: '0 0 20px rgba(100, 116, 139, 0.4)' }}
    >
      <div onPointerDown={(e: React.PointerEvent) => dragControls.start(e)} className="p-3 font-bold text-foreground border-b border-border flex items-center gap-2">
        <TableIcon className="w-4 h-4 text-muted-foreground" /> {entity.name}
      </div>
      <div className="p-3 space-y-2 bg-muted/20">
        {entity.columns.map((col, i) => (
          <div key={i} className="flex justify-between items-center text-sm hover:bg-muted/50 -mx-1 px-1 rounded">
            <div className="flex items-center gap-2">
              <Columns className="w-3 h-3 text-muted-foreground" />
              <span>{col.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{col.type}</span>
              {col.constraints?.includes('PK') && <span title="Primary Key"><Key className="w-3 h-3 text-yellow-400 rotate-90" /></span>}
              {col.constraints?.includes('FK') && <span title="Foreign Key"><Key className="w-3 h-3 text-blue-400" /></span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const RelationshipLine: React.FC<{ from: TableEntity; to: TableEntity; type: Relationship['type'] }> = ({ from, to }) => {
  const fromRef = { x: from.x + 128, y: from.y + from.columns.length * 28 + 60 };
  const toRef = { x: to.x + 128, y: to.y + to.columns.length * 28 + 60 };
  
  const path = `M ${fromRef.x} ${fromRef.y} C ${fromRef.x + 100} ${fromRef.y}, ${toRef.x - 100} ${toRef.y}, ${toRef.x} ${toRef.y}`;

  return (
    <motion.path
      d={path}
      stroke="#4b5563"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    />
  );
};

// --- MAIN COMPONENT ---
export default function SchemaDesigner() {
  const [tables, setTables] = useState<TableEntity[]>(initialTables);
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
  }, []);

  const relationshipLines = useMemo(() => {
    const tableMap = new Map(tables.map(t => [t.id, t]));
    return initialRelationships.map((rel, i) => {
      const fromTable = tableMap.get(rel.from);
      const toTable = tableMap.get(rel.to);
      if (!fromTable || !toTable) return null;
      return <RelationshipLine key={i} from={fromTable} to={toTable} type={rel.type} />;
    });
  }, [tables]);

  return (
    <div className="w-full h-[700px] bg-background text-foreground rounded-lg border overflow-hidden flex flex-col">
      <header className="p-2 border-b border-border flex justify-between items-center bg-muted/40 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Schema Designer</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button className="w-8 h-8" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}><Minus className="w-4 h-4" /></Button>
          <span className="w-16 text-center text-sm font-mono bg-background border rounded-md py-1">{(zoom * 100).toFixed(0)}%</span>
          <Button className="w-8 h-8" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><Plus className="w-4 h-4" /></Button>
        </div>
      </header>
      <div ref={containerRef} className="flex-grow relative overflow-hidden bg-background">
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{ scale: zoom, transformOrigin: 'top left' }}
        >
          <svg width="2000" height="2000" className="absolute top-0 left-0">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#374151"></circle>
              </pattern>
            </defs>
            <rect width="2000" height="2000" fill="url(#grid)"></rect>
            <g>{relationshipLines}</g>
          </svg>
          {tables.map((table) => (
            <Entity key={table.id} entity={table} onPositionChange={handlePositionChange} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
