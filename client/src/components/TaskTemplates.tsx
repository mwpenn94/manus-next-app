/**
 * TaskTemplates — User-saved prompt templates with CRUD management.
 *
 * Renders as a horizontal scroll row on the Home page (compact mode)
 * or as a full management grid (in Settings/Library).
 *
 * Compact mode now includes:
 * - A "Manage" button at the end of the row to open full management dialog
 * - Right-click / long-press context menu on each pill for quick edit/delete
 */
import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Globe,
  Code,
  FileText,
  BarChart3,
  Rocket,
  GraduationCap,
  Heart,
  Star,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  BookmarkPlus,
  Settings2,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Icon registry for templates
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Globe,
  Code,
  FileText,
  BarChart3,
  Rocket,
  GraduationCap,
  Heart,
  Star,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const CATEGORY_OPTIONS = [
  { value: "research", label: "Research" },
  { value: "writing", label: "Writing" },
  { value: "coding", label: "Coding" },
  { value: "analysis", label: "Analysis" },
  { value: "creative", label: "Creative" },
  { value: "productivity", label: "Productivity" },
  { value: "other", label: "Other" },
];

interface TaskTemplatesProps {
  /** Compact mode for Home page — horizontal scroll row */
  compact?: boolean;
  /** Callback when a template is selected (injects prompt into input) */
  onUseTemplate?: (prompt: string) => void;
  /** Show the "Save as template" button for creating from current input */
  showSaveButton?: boolean;
  /** Current input text to pre-fill when saving as template */
  currentInput?: string;
}

export default function TaskTemplates({
  compact = false,
  onUseTemplate,
  showSaveButton = false,
  currentInput = "",
}: TaskTemplatesProps) {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.templates.list.useQuery();
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });
  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });
  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });
  const bulkDeleteMutation = trpc.templates.bulkDelete.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });
  const useMutation = trpc.templates.use.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formIcon, setFormIcon] = useState("Sparkles");
  const [formCategory, setFormCategory] = useState("other");

  // Management dialog state
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Context menu state for compact pills
  const [contextMenuId, setContextMenuId] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCreate = useCallback((prefillPrompt?: string) => {
    setEditingId(null);
    setFormTitle("");
    setFormPrompt(prefillPrompt || "");
    setFormIcon("Sparkles");
    setFormCategory("other");
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((template: {
    id: number;
    title: string;
    prompt: string;
    icon: string | null;
    category: string | null;
  }) => {
    setEditingId(template.id);
    setFormTitle(template.title);
    setFormPrompt(template.prompt);
    setFormIcon(template.icon || "Sparkles");
    setFormCategory(template.category || "other");
    setDialogOpen(true);
    setContextMenuId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formTitle.trim() || !formPrompt.trim()) return;
    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        title: formTitle.trim(),
        prompt: formPrompt.trim(),
        icon: formIcon,
        category: formCategory,
      });
      toast.success("Template updated");
    } else {
      await createMutation.mutateAsync({
        title: formTitle.trim(),
        prompt: formPrompt.trim(),
        icon: formIcon,
        category: formCategory,
      });
      toast.success("Template created");
    }
    setDialogOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, formTitle, formPrompt, formIcon, formCategory]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    setContextMenuId(null);
    toast.success("Template deleted");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkDeleteMutation.mutateAsync({ ids });
    setSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    toast.success(`${ids.length} template(s) deleted`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const handleUse = useCallback((template: { id: number; prompt: string }) => {
    useMutation.mutate({ id: template.id });
    onUseTemplate?.(template.prompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUseTemplate]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(templates.map((t) => t.id)));
  }, [templates]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Long-press handler for mobile context menu
  const handleTouchStart = useCallback((id: number) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenuId(id);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  if (isLoading || templates.length === 0) {
    // In compact mode, show nothing if no templates
    if (compact && templates.length === 0 && !isLoading) {
      return showSaveButton && currentInput.trim() ? (
        <button
          onClick={() => openCreate(currentInput)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all whitespace-nowrap"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          Save as template
        </button>
      ) : null;
    }
    if (isLoading) return null;
  }

  // ── Compact mode: horizontal scroll row for Home page ──
  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {templates.map((template) => {
          const IconComp = ICON_MAP[template.icon || "Sparkles"] || Sparkles;
          return (
            <ContextMenu key={template.id}>
              <ContextMenuTrigger asChild>
                <button
                  onClick={() => handleUse(template)}
                  onTouchStart={() => handleTouchStart(template.id)}
                  onTouchEnd={handleTouchEnd}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary/20 bg-primary/5 text-xs text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all whitespace-nowrap shrink-0 group"
                >
                  <IconComp className="w-3.5 h-3.5 text-primary" />
                  {template.title}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-40">
                <ContextMenuItem onClick={() => handleUse(template)}>
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Use
                </ContextMenuItem>
                <ContextMenuItem onClick={() => openEdit(template)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => handleDelete(template.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {showSaveButton && currentInput.trim() && (
          <button
            onClick={() => openCreate(currentInput)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all whitespace-nowrap shrink-0"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save
          </button>
        )}
        {/* Manage button */}
        {templates.length > 0 && (
          <button
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all whitespace-nowrap shrink-0"
            title="Manage templates"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Manage
          </button>
        )}

        {/* Create/Edit Dialog */}
        <TemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingId={editingId}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formPrompt={formPrompt}
          setFormPrompt={setFormPrompt}
          formIcon={formIcon}
          setFormIcon={setFormIcon}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />

        {/* Management Dialog */}
        <ManageTemplatesDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          templates={templates}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectAll={selectAll}
          deselectAll={deselectAll}
          onEdit={openEdit}
          onDelete={handleDelete}
          onBulkDelete={() => setBulkDeleteConfirmOpen(true)}
          onCreate={() => openCreate()}
          deleting={deleteMutation.isPending}
        />

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} template(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The selected templates will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Full management mode (standalone page/section) ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">My Templates</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openCreate()}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {templates.map((template) => {
            const IconComp = ICON_MAP[template.icon || "Sparkles"] || Sparkles;
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-4 bg-card border border-border rounded-xl hover:border-foreground/20 transition-all group cursor-pointer"
                onClick={() => handleUse(template)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {template.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {template.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {template.category}
                        </span>
                      )}
                      {template.usageCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          Used {template.usageCount}x
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Menu button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Template options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(template); }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formPrompt={formPrompt}
        setFormPrompt={setFormPrompt}
        formIcon={formIcon}
        setFormIcon={setFormIcon}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

// ── Manage Templates Dialog ──
function ManageTemplatesDialog({
  open,
  onOpenChange,
  templates,
  selectedIds,
  toggleSelect,
  selectAll,
  deselectAll,
  onEdit,
  onDelete,
  onBulkDelete,
  onCreate,
  deleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Array<{ id: number; title: string; prompt: string; icon: string | null; category: string | null; usageCount: number }>;
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  onEdit: (template: { id: number; title: string; prompt: string; icon: string | null; category: string | null }) => void;
  onDelete: (id: number) => void;
  onBulkDelete: () => void;
  onCreate: () => void;
  deleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Templates</DialogTitle>
          <DialogDescription>
            Edit, delete, or organize your saved templates.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedIds.size === templates.length ? deselectAll : selectAll}
              className="text-xs h-7 px-2"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              {selectedIds.size === templates.length ? "Deselect All" : "Select All"}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
                className="text-xs h-7 px-2"
                disabled={deleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete ({selectedIds.size})
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreate}
            className="text-xs h-7 px-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New
          </Button>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2 min-h-0">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No templates yet. Create one to get started.
            </div>
          ) : (
            templates.map((template) => {
              const IconComp = ICON_MAP[template.icon || "Sparkles"] || Sparkles;
              const isSelected = selectedIds.has(template.id);
              return (
                <div
                  key={template.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                    isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-accent/50 border border-transparent"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(template.id)}
                    className="shrink-0"
                  />
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComp className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {template.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {template.prompt.slice(0, 60)}{template.prompt.length > 60 ? "..." : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {template.usageCount > 0 && (
                      <span className="text-[10px] text-muted-foreground mr-1">
                        {template.usageCount}x
                      </span>
                    )}
                    <button
                      onClick={() => onEdit(template)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit template"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(template.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared Dialog Component ──
function TemplateDialog({
  open,
  onOpenChange,
  editingId,
  formTitle,
  setFormTitle,
  formPrompt,
  setFormPrompt,
  formIcon,
  setFormIcon,
  formCategory,
  setFormCategory,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formPrompt: string;
  setFormPrompt: (v: string) => void;
  formIcon: string;
  setFormIcon: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Title
            </label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g., Weekly Report Template"
              className="bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Prompt
            </label>
            <Textarea
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="The prompt text that will be pre-filled..."
              rows={4}
              className="bg-background resize-none"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Icon
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((iconName) => {
                  const Ic = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      onClick={() => setFormIcon(iconName)}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        formIcon === iconName
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!formTitle.trim() || !formPrompt.trim() || saving}
          >
            {saving ? "Saving..." : editingId ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
