/**
 * TaskTemplates — User-saved prompt templates with CRUD management.
 *
 * Renders as a horizontal scroll row on the Home page (compact mode)
 * or as a full management grid (in Settings/Library).
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const useMutation = trpc.templates.use.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formIcon, setFormIcon] = useState("Sparkles");
  const [formCategory, setFormCategory] = useState("other");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

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
    setMenuOpenId(null);
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
    } else {
      await createMutation.mutateAsync({
        title: formTitle.trim(),
        prompt: formPrompt.trim(),
        icon: formIcon,
        category: formCategory,
      });
    }
    setDialogOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutateAsync is stable (tRPC)
  }, [editingId, formTitle, formPrompt, formIcon, formCategory, createMutation.mutateAsync, updateMutation.mutateAsync]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    setMenuOpenId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutateAsync is stable (tRPC)
  }, [deleteMutation.mutateAsync]);

  const handleUse = useCallback((template: { id: number; prompt: string }) => {
    useMutation.mutate({ id: template.id });
    onUseTemplate?.(template.prompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
  }, [useMutation.mutate, onUseTemplate]);

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
            <button
              key={template.id}
              onClick={() => handleUse(template)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary/20 bg-primary/5 text-xs text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all whitespace-nowrap shrink-0"
            >
              <IconComp className="w-3.5 h-3.5 text-primary" />
              {template.title}
            </button>
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
      </div>
    );
  }

  // ── Full management mode ──
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
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === template.id ? null : template.id);
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpenId === template.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(template);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
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
