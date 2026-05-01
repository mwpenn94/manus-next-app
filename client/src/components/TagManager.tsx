import React, { useState, useMemo } from 'react';
import { Search, Plus, ChevronDown, Trash2, Merge, Palette, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock shadcn/ui components for self-containment
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...props}>{children}</button>;
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />;
const Checkbox = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input type="checkbox" {...props} />;
const Dialog = ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">{children}</div></div> : null;
const DialogHeader = ({ children }: { children: React.ReactNode }) => <div className="text-lg font-semibold mb-4">{children}</div>;
const DialogContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const DialogFooter = ({ children }: { children: React.ReactNode }) => <div className="mt-6 flex justify-end gap-2">{children}</div>;

// Color palette for the tag color picker
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

// Type definitions
type Tag = { id: string; name: string; color: string; usage: number; groupId: string };
type TagGroup = { id: string; name: string };

// Initial mock data
const initialGroups: TagGroup[] = [
  { id: 'group-1', name: 'Project Status' },
  { id: 'group-2', name: 'Priority' },
  { id: 'group-3', name: 'Departments' },
];

const initialTags: Tag[] = [
  { id: 'tag-1', name: 'In Progress', color: '#3b82f6', usage: 12, groupId: 'group-1' },
  { id: 'tag-2', name: 'Completed', color: '#22c55e', usage: 45, groupId: 'group-1' },
  { id: 'tag-3', name: 'Backlog', color: '#6b7280', usage: 8, groupId: 'group-1' },
  { id: 'tag-4', name: 'High', color: '#ef4444', usage: 23, groupId: 'group-2' },
  { id: 'tag-5', name: 'Medium', color: '#f97316', usage: 56, groupId: 'group-2' },
  { id: 'tag-6', name: 'Low', color: '#eab308', usage: 18, groupId: 'group-2' },
  { id: 'tag-7', name: 'Engineering', color: '#8b5cf6', usage: 7, groupId: 'group-3' },
  { id: 'tag-8', name: 'Marketing', color: '#ec4899', usage: 15, groupId: 'group-3' },
];

const TagPill = ({ name, color }: { name: string; color: string }) => (
  <span className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full text-white"
        style={{ backgroundColor: color }}>
    {name}
  </span>
);

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [groups, setGroups] = useState<TagGroup[]>(initialGroups);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(initialGroups.map(g => g.id)));
  const [isMergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [isRecolorOpen, setRecolorOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLORS[0]);
  const [newTagGroup, setNewTagGroup] = useState(groups[0]?.id || '');

  const filteredTags = useMemo(() =>
    tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [tags, searchQuery]
  );

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setExpandedGroups(newSet);
  };

  const handleSelectTag = (tagId: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tagId)) {
      newSet.delete(tagId);
    } else {
      newSet.add(tagId);
    }
    setSelectedTags(newSet);
  };

  const handleSelectAllInGroup = (groupId: string, tagsInGroup: Tag[]) => {
    const newSet = new Set(selectedTags);
    const groupTagIds = tagsInGroup.map(t => t.id);
    const allSelected = groupTagIds.every(id => newSet.has(id));
    if (allSelected) {
      groupTagIds.forEach(id => newSet.delete(id));
    } else {
      groupTagIds.forEach(id => newSet.add(id));
    }
    setSelectedTags(newSet);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !newTagGroup) return;
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor,
      usage: 0,
      groupId: newTagGroup,
    };
    setTags([...tags, newTag]);
    setNewTagName('');
    setNewTagColor(COLORS[0]);
  };

  const handleDeleteSelected = () => {
    setTags(tags.filter(tag => !selectedTags.has(tag.id)));
    setSelectedTags(new Set());
  };

  const handleMergeTags = (targetTagId: string) => {
    if (!targetTagId) return;
    const selectedIds = Array.from(selectedTags);
    const tagsToMerge = tags.filter(t => selectedIds.includes(t.id));
    const targetTag = tags.find(t => t.id === targetTagId);

    if (!targetTag || tagsToMerge.length < 2) {
      setMergeDialogOpen(false);
      return;
    }

    const totalUsage = tagsToMerge.reduce((sum, tag) => sum + tag.usage, 0);

    const updatedTags = tags.map(tag =>
      tag.id === targetTagId ? { ...tag, usage: tag.usage + totalUsage - targetTag.usage } : tag
    ).filter(tag => !selectedIds.includes(tag.id) || tag.id === targetTagId);

    setTags(updatedTags);
    setSelectedTags(new Set());
    setMergeDialogOpen(false);
  };

  const handleRecolorSelected = (color: string) => {
    setTags(tags.map(tag =>
      selectedTags.has(tag.id) ? { ...tag, color } : tag
    ));
    setRecolorOpen(false);
    setSelectedTags(new Set());
  };

  const renderMergeDialog = () => (
    <Dialog open={isMergeDialogOpen} >
      <DialogHeader>Merge Tags</DialogHeader>
      <DialogContent>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Select a tag to merge {selectedTags.size} selected tags into. The name and color of the target tag will be kept. Usage counts will be combined.</p>
        <select 
          onChange={(e) => handleMergeTags(e.target.value)}
          className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Select target tag...</option>
          {tags
            .filter(tag => selectedTags.has(tag.id))
            .map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
        </select>
      </DialogContent>
      <DialogFooter>
        <Button className="px-4 py-2 rounded-md border dark:border-gray-700" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
      </DialogFooter>
    </Dialog>
  );

  const renderRecolorPopper = () => (
    <AnimatePresence>
      {isRecolorOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-10 -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 flex gap-2 border dark:border-gray-700"
        >
          {COLORS.map(color => (
            <button key={color} onClick={() => handleRecolorSelected(color)} 
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: color }} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded-lg shadow-lg w-full max-w-4xl mx-auto font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Tag Manager</h1>
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </header>

      <form onSubmit={handleCreateTag} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center gap-4 flex-wrap">
        <Input
          type="text"
          placeholder="New tag name"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
        />
        <div className="flex items-center gap-2">
          {COLORS.map(color => (
            <button type="button" key={color} onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newTagColor === color ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : ''}`}
                    style={{ backgroundColor: color }} />
          ))}
        </div>
        <select value={newTagGroup} onChange={e => setNewTagGroup(e.target.value)} className="p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <Button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Tag
        </Button>
      </form>

      <AnimatePresence>
        {selectedTags.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="relative mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between gap-4 border border-blue-200 dark:border-blue-900/50"
          >
            <span className="font-medium text-sm text-blue-800 dark:text-blue-200">{selectedTags.size} selected</span>
            <div className="flex items-center gap-2">
              <Button onClick={() => setMergeDialogOpen(true)} disabled={selectedTags.size < 2} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                <Merge size={14} /> Merge
              </Button>
              <div className="relative">
                <Button onClick={() => setRecolorOpen(prev => !prev)} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Palette size={14} /> Recolor
                </Button>
                {renderRecolorPopper()}
              </div>
              <Button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-red-500/50 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40">
                <Trash2 size={14} /> Delete
              </Button>
            </div>
            <Button onClick={() => setSelectedTags(new Set())} className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <X size={14} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {groups.map(group => {
          const tagsInGroup = filteredTags.filter(tag => tag.groupId === group.id);
          if (tagsInGroup.length === 0 && searchQuery) return null;

          const isAllInGroupSelected = tagsInGroup.length > 0 && tagsInGroup.every(t => selectedTags.has(t.id));

          return (
            <div key={group.id} className="border dark:border-gray-800 rounded-lg overflow-hidden">
              <button onClick={() => toggleGroup(group.id)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isAllInGroupSelected} onChange={() => handleSelectAllInGroup(group.id, tagsInGroup)} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-4 h-4" />
                  <span className="font-semibold">{group.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{tagsInGroup.length} tags</span>
                  <ChevronDown size={20} className={`transition-transform ${expandedGroups.has(group.id) ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <AnimatePresence>
                {expandedGroups.has(group.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <ul className="p-3 space-y-2">
                      {tagsInGroup.map(tag => (
                        <li key={tag.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedTags.has(tag.id)} onChange={() => handleSelectTag(tag.id)} className="w-4 h-4" />
                            <TagPill name={tag.name} color={tag.color} />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{tag.usage} uses</span>
                        </li>
                      ))}
                      {tagsInGroup.length === 0 && <li className="text-center text-sm text-gray-500 py-2">No tags in this group.</li>}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {renderMergeDialog()}
    </div>
  );
}