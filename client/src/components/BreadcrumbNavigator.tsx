import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Home, ChevronRight, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- Data Structures and Mock Data ---
type NavItem = {
  id: string;
  name: string;
  children?: NavItem[];
};

const fileSystem: NavItem = {
  id: 'root',
  name: 'Home',
  children: [
    {
      id: 'projects',
      name: 'Projects',
      children: [
        { 
          id: 'project-a',
          name: 'Project A',
          children: [
            { id: 'src', name: 'src' },
            { id: 'public', name: 'public' },
            { id: 'package.json', name: 'package.json' },
          ]
        },
        { id: 'project-b', name: 'Project B' },
        { id: 'project-c', name: 'Project C' },
      ],
    },
    {
      id: 'documents',
      name: 'Documents',
      children: [
        { id: 'resume.pdf', name: 'resume.pdf' },
        { id: 'report.docx', name: 'report.docx' },
      ],
    },
    { id: 'desktop', name: 'Desktop' },
    { id: 'downloads', name: 'Downloads' },
  ],
};

// --- Helper Functions ---
const findItemPath = (root: NavItem, id: string): NavItem[] | null => {
  const path: NavItem[] = [];
  function search(item: NavItem): boolean {
    path.push(item);
    if (item.id === id) return true;
    if (item.children) {
      for (const child of item.children) {
        if (search(child)) return true;
      }
    }
    path.pop();
    return false;
  }
  if (search(root)) return path;
  return null;
};

const getSiblings = (root: NavItem, path: NavItem[]): NavItem[] => {
    if (path.length <= 1) return [];
    const parentPath = path.slice(0, -1);
    let parent: NavItem | undefined = root;
    for (let i = 1; i < parentPath.length; i++) {
        parent = parent?.children?.find(c => c.id === parentPath[i].id);
        if (!parent) return [];
    }
    return parent.children || [];
};

// --- Sub-components ---
const DropdownMenu: React.FC<{ 
    items: NavItem[];
    onSelect: (id: string) => void;
    onClose: () => void;
}> = ({ items, onSelect, onClose }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="absolute z-10 mt-2 w-56 bg-card border border-border rounded-md shadow-lg py-1"
        >
            {items.map(item => (
                <button 
                    key={item.id} 
                    onClick={() => { onSelect(item.id); onClose(); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:outline-none"
                    role="menuitem"
                >
                    {item.name}
                </button>
            ))}
        </motion.div>
    );
};

const BreadcrumbSegment: React.FC<{ 
    item: NavItem;
    siblings: NavItem[];
    onSelect: (id: string) => void;
    isCurrent: boolean;
}> = ({ item, siblings, onSelect, isCurrent }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <Button 
                variant="ghost"
                size="sm"
                className={cn(
                    'text-sm font-medium h-8 px-2',
                    isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => siblings.length > 1 ? setIsOpen(p => !p) : onSelect(item.id)}
                aria-haspopup={siblings.length > 1}
                aria-expanded={isOpen}
                disabled={isCurrent}
            >
                {item.name}
            </Button>
            <AnimatePresence>
                {isOpen && siblings.length > 1 && (
                    <DropdownMenu items={siblings} onSelect={onSelect} onClose={() => setIsOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

const CollapsedSegments: React.FC<{ items: NavItem[]; onSelect: (id: string) => void; }> = ({ items, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(p => !p)} aria-label="More path segments">
                <MoreHorizontal className="h-4 w-4" />
            </Button>
            <AnimatePresence>
                {isOpen && <DropdownMenu items={items} onSelect={onSelect} onClose={() => setIsOpen(false)} />}
            </AnimatePresence>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
    );
};

// --- Main Component ---
export default function BreadcrumbNavigator() {
  const [currentId, setCurrentId] = useState('src');

  const breadcrumbPath = useMemo(() => findItemPath(fileSystem, currentId), [currentId]);

  const handleSelect = useCallback((id: string) => {
    if (id !== currentId) {
        setCurrentId(id);
    }
  }, [currentId]);

  if (!breadcrumbPath) {
    return (
        <div className="flex items-center justify-center h-16 bg-background text-destructive-foreground p-4 rounded-lg border border-destructive">
            Error: Path not found. Please reset.
            <Button onClick={() => setCurrentId('root')} variant="destructive" size="sm" className="ml-4">Reset</Button>
        </div>
    );
  }

  const MAX_VISIBLE = 5;
  let visiblePath: (NavItem | { type: 'ellipsis'; items: NavItem[] })[] = breadcrumbPath;
  if (breadcrumbPath.length > MAX_VISIBLE) {
      const collapsedItems = breadcrumbPath.slice(1, breadcrumbPath.length - (MAX_VISIBLE - 2));
      visiblePath = [
          breadcrumbPath[0],
          { type: 'ellipsis', items: collapsedItems },
          ...breadcrumbPath.slice(breadcrumbPath.length - (MAX_VISIBLE - 2))
      ];
  }

  return (
    <nav className="bg-card border border-border rounded-lg p-2" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-1">
            <li>
                <Button variant="ghost" size="icon" onClick={() => handleSelect('root')} className="h-8 w-8 flex-shrink-0" aria-label="Go to home">
                    <Home className="h-4 w-4" />
                </Button>
            </li>
            <AnimatePresence initial={false}>
                {visiblePath.map((segment, index) => (
                    <motion.li 
                        key={typeof segment === 'object' && 'id' in segment ? (segment as any).id : `ellipsis-${index}`}
                        className="flex items-center"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        {('type' in segment && segment.type === 'ellipsis') ? (
                            <CollapsedSegments items={(segment as any).items} onSelect={handleSelect} />
                        ) : (
                            <BreadcrumbSegment 
                                item={segment as NavItem}
                                siblings={getSiblings(fileSystem, findItemPath(fileSystem, (segment as any).id)!)}
                                onSelect={handleSelect}
                                isCurrent={(segment as any).id === currentId}
                            />
                        )}
                    </motion.li>
                )).slice(1) /* Remove root Home segment */}
            </AnimatePresence>
        </ol>
    </nav>
  );
}