/**
 * ProjectsPage — Workspace management for grouping tasks
 * Capability #11: Projects concept from Manus v8.3 parity spec
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTask } from "@/contexts/TaskContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Settings2,
  Loader2,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectsPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { tasks } = useTask();

  // Queries
  const projectsQuery = trpc.project.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Mutations
  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      setNewIcon("");
      toast.success("Project created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      setEditOpen(false);
      toast.success("Project updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      toast.success("Project archived");
    },
    onError: (err) => toast.error(err.message),
  });

  // State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const projects = projectsQuery.data ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      icon: newIcon.trim() || undefined,
    });
  };

  const handleEdit = (project: any) => {
    setEditId(project.externalId);
    setEditName(project.name);
    setEditDesc(project.description ?? "");
    setEditIcon(project.icon ?? "");
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editName.trim()) return;
    updateMutation.mutate({
      externalId: editId,
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      icon: editIcon.trim() || undefined,
    });
  };

  const handleDelete = (externalId: string) => {
    deleteMutation.mutate({ externalId });
  };

  // Count tasks per project (from local task context)
  const getProjectTaskCount = (projectId: number) => {
    return tasks.filter((t: any) => t.projectId === projectId).length;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Sign in to manage projects</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-semibold text-foreground tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize tasks into workspaces with shared instructions and knowledge
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projectsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">No projects yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Projects let you group related tasks together with shared instructions and knowledge files.
            </p>
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {projects.map((project: any) => (
                <motion.div
                  key={project.externalId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="group cursor-pointer hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all"
                    onClick={() => navigate(`/project/${project.externalId}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                            {project.icon || "📁"}
                          </div>
                          <div>
                            <CardTitle className="text-base">{project.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                              aria-label="Project options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(project); }}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.externalId}/settings`); }}>
                              <Settings2 className="w-3.5 h-3.5 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDelete(project.externalId); }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {getProjectTaskCount(project.id)} tasks
                        </span>
                        {project.systemPrompt && (
                          <span className="flex items-center gap-1">
                            <Settings2 className="w-3 h-3" />
                            Custom prompt
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Group related tasks with shared instructions and knowledge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Market Research Q2"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Icon (emoji)</label>
              <Input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="📁"
                className="w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Icon (emoji)</label>
              <Input
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                className="w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!editName.trim() || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
