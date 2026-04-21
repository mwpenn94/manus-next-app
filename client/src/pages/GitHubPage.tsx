/**
 * GitHubPage — Manus-style GitHub Integration Management
 * 
 * Features:
 * - Connected repos list with sync status
 * - Import repos from GitHub account
 * - Create new repos
 * - File browser with syntax highlighting
 * - Branch management
 * - Pull request list
 * - Commit history
 * - Issue tracking
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GitBranch, GitPullRequest, GitCommit, FileCode, FolderOpen, Plus,
  RefreshCw, ExternalLink, Star, GitFork, AlertCircle, Search,
  ChevronRight, File, Folder, Lock, Globe, ArrowLeft, Download,
  Loader2, Trash2, Unplug, Eye, Code, Clock, MessageSquare
} from "lucide-react";
import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CodeEditor = lazy(() => import("@/components/CodeEditor"));

type RepoTab = "files" | "branches" | "commits" | "prs" | "issues";

export default function GitHubPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [, routeParams] = useRoute("/github/:repoId");
  const selectedRepoId = routeParams?.repoId;

  // State
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [repoTab, setRepoTab] = useState<RepoTab>("files");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [filePath, setFilePath] = useState<string[]>([]);

  // Create repo form
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [commitMsg, setCommitMsg] = useState("");

  // New file / create issue dialogs
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");

  // Queries
  const reposQuery = trpc.github.repos.useQuery(undefined, { enabled: !!user });
  const remoteReposQuery = trpc.github.listRemoteRepos.useQuery(
    { page: 1, perPage: 50 },
    { enabled: importOpen && !!user }
  );

  const selectedRepo = useMemo(() => {
    if (!selectedRepoId || !reposQuery.data) return null;
    return reposQuery.data.find(r => r.externalId === selectedRepoId) ?? null;
  }, [selectedRepoId, reposQuery.data]);

  const fileTreeQuery = trpc.github.fileTree.useQuery(
    { externalId: selectedRepoId!, branch: selectedBranch || undefined },
    { enabled: !!selectedRepoId && !!selectedRepo }
  );

  const branchesQuery = trpc.github.branches.useQuery(
    { externalId: selectedRepoId! },
    { enabled: !!selectedRepoId && repoTab === "branches" }
  );

  const commitsQuery = trpc.github.commits.useQuery(
    { externalId: selectedRepoId!, branch: selectedBranch || undefined },
    { enabled: !!selectedRepoId && repoTab === "commits" }
  );

  const prsQuery = trpc.github.pullRequests.useQuery(
    { externalId: selectedRepoId!, state: "open" },
    { enabled: !!selectedRepoId && repoTab === "prs" }
  );

  const issuesQuery = trpc.github.issues.useQuery(
    { externalId: selectedRepoId!, state: "open" },
    { enabled: !!selectedRepoId && repoTab === "issues" }
  );

  // File content query
  const currentPath = filePath.join("/");
  const fileContentQuery = trpc.github.fileContent.useQuery(
    { externalId: selectedRepoId!, path: currentPath, ref: selectedBranch || undefined },
    { enabled: !!selectedRepoId && filePath.length > 0 && !currentPath.endsWith("/") }
  );

  // Mutations
  const connectRepoMut = trpc.github.connectRepo.useMutation({
    onSuccess: (data) => {
      toast.success(data.alreadyConnected ? "Repo already connected" : "Repo connected successfully");
      reposQuery.refetch();
      setImportOpen(false);
    },
    onError: (err) => { toast.error(err.message); },
  });

  const createRepoMut = trpc.github.createRepo.useMutation({
    onSuccess: (data) => {
      toast.success(`Repository "${data.fullName}" created`);
      reposQuery.refetch();
      setCreateOpen(false);
      setNewRepoName("");
      setNewRepoDesc("");
      navigate(`/github/${data.externalId}`);
    },
    onError: (err) => { toast.error(err.message); },
  });

  const syncRepoMut = trpc.github.syncRepo.useMutation({
    onSuccess: () => {
      toast.success("Repo synced");
      reposQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const disconnectRepoMut = trpc.github.disconnectRepo.useMutation({
    onSuccess: () => {
      toast.success("Repo disconnected");
      reposQuery.refetch();
      if (selectedRepoId) navigate("/github");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const commitFileMut = trpc.github.commitFile.useMutation({
    onSuccess: () => {
      toast.success("File committed successfully");
      setIsEditing(false);
      setCommitMsg("");
      fileContentQuery.refetch();
      fileTreeQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deleteFileMut = trpc.github.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      setFilePath(filePath.slice(0, -1));
      fileTreeQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const createIssueMut = trpc.github.createIssue.useMutation({
    onSuccess: () => {
      toast.success("Issue created");
      setCreateIssueOpen(false);
      setIssueTitle("");
      setIssueBody("");
      issuesQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const mergePRMut = trpc.github.mergePR.useMutation({
    onSuccess: () => {
      toast.success("Pull request merged");
      prsQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  // Build file tree structure
  const fileTreeItems = useMemo(() => {
    if (!fileTreeQuery.data?.tree) return [];
    const tree = fileTreeQuery.data.tree;
    const currentDir = filePath.join("/");
    
    // Filter to current directory level
    return tree
      .filter(item => {
        if (!currentDir) {
          return !item.path.includes("/");
        }
        return item.path.startsWith(currentDir + "/") &&
          !item.path.slice(currentDir.length + 1).includes("/");
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
        return a.path.localeCompare(b.path);
      });
  }, [fileTreeQuery.data, filePath]);

  const filteredRepos = useMemo(() => {
    if (!reposQuery.data) return [];
    if (!search) return reposQuery.data;
    return reposQuery.data.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.fullName.toLowerCase().includes(search.toLowerCase())
    );
  }, [reposQuery.data, search]);

  const handleImportRepo = useCallback((repo: any) => {
    connectRepoMut.mutate({
      fullName: repo.full_name,
      name: repo.name,
      description: repo.description || undefined,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      language: repo.language || undefined,
      starCount: repo.stargazers_count,
      forkCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
    });
  }, [connectRepoMut]);

  // ── Repo Detail View ──
  if (selectedRepo) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => { navigate("/github"); setFilePath([]); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {selectedRepo.isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
              <h1 className="text-lg font-semibold">{selectedRepo.fullName}</h1>
            </div>
            <Badge variant="outline" className="ml-2">{selectedRepo.defaultBranch}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => syncRepoMut.mutate({ externalId: selectedRepo.externalId })}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1", syncRepoMut.isPending && "animate-spin")} /> Sync
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={selectedRepo.htmlUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> GitHub
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => disconnectRepoMut.mutate({ externalId: selectedRepo.externalId })}>
                <Unplug className="w-3.5 h-3.5 mr-1" /> Disconnect
              </Button>
            </div>
          </div>
          {selectedRepo.description && (
            <p className="text-sm text-muted-foreground ml-[72px]">{selectedRepo.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 ml-[72px] text-xs text-muted-foreground">
            {selectedRepo.language && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" />{selectedRepo.language}</span>}
            <span className="flex items-center gap-1"><Star className="w-3 h-3" />{selectedRepo.starCount}</span>
            <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{selectedRepo.forkCount}</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{selectedRepo.openIssuesCount} issues</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={repoTab} onValueChange={(v) => { setRepoTab(v as RepoTab); setFilePath([]); }} className="flex-1 flex flex-col">
          <div className="border-b border-border px-6">
            <TabsList className="bg-transparent h-10 p-0 gap-0">
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                <Code className="w-3.5 h-3.5 mr-1.5" /> Code
              </TabsTrigger>
              <TabsTrigger value="branches" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                <GitBranch className="w-3.5 h-3.5 mr-1.5" /> Branches
              </TabsTrigger>
              <TabsTrigger value="commits" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                <GitCommit className="w-3.5 h-3.5 mr-1.5" /> Commits
              </TabsTrigger>
              <TabsTrigger value="prs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                <GitPullRequest className="w-3.5 h-3.5 mr-1.5" /> Pull Requests
              </TabsTrigger>
              <TabsTrigger value="issues" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Issues
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 overflow-auto m-0 p-6">
            {/* Breadcrumb + New File */}
            <div className="flex items-center gap-1 mb-4 text-sm">
              <button onClick={() => setFilePath([])} className="text-primary hover:underline font-medium">
                {selectedRepo.name}
              </button>
              {filePath.map((segment, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <button
                    onClick={() => setFilePath(filePath.slice(0, i + 1))}
                    className={cn("hover:underline", i === filePath.length - 1 ? "text-foreground font-medium" : "text-primary")}
                  >
                    {segment}
                  </button>
                </span>
              ))}
              <div className="ml-auto">
                <Button variant="outline" size="sm" onClick={() => { setNewFileOpen(true); setNewFileName(""); setNewFileContent(""); }}>
                  <Plus className="w-3 h-3 mr-1" /> New File
                </Button>
              </div>
            </div>

            {fileTreeQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : fileContentQuery.data && filePath.length > 0 ? (
              /* File content view with CodeEditor */
              <Card className="border-border">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{filePath[filePath.length - 1]}</span>
                      <Badge variant="secondary" className="text-[10px]">{fileContentQuery.data.size} bytes</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <Button variant="outline" size="sm" onClick={() => {
                          const decoded = fileContentQuery.data!.encoding === "base64"
                            ? atob(fileContentQuery.data!.content.replace(/\n/g, ""))
                            : fileContentQuery.data!.content;
                          setEditContent(decoded);
                          setIsEditing(true);
                          setCommitMsg("");
                        }}>
                          <Code className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      )}
                      <Button variant="ghost" size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Delete ${filePath[filePath.length - 1]}?`)) {
                            deleteFileMut.mutate({
                              externalId: selectedRepoId!,
                              path: currentPath,
                              message: `Delete ${filePath[filePath.length - 1]}`,
                              sha: fileContentQuery.data!.sha,
                              branch: selectedBranch || undefined,
                            });
                          }
                        }}
                        disabled={deleteFileMut.isPending}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={fileContentQuery.data.html_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" /> GitHub
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isEditing ? (
                    <div>
                      <Suspense fallback={<div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}>
                        <CodeEditor
                          value={editContent}
                          onChange={setEditContent}
                          filename={filePath[filePath.length - 1]}
                          height="500px"
                        />
                      </Suspense>
                      <div className="border-t border-border p-3 flex items-center gap-2">
                        <Input
                          placeholder="Commit message..."
                          value={commitMsg}
                          onChange={(e) => setCommitMsg(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Button
                          size="sm"
                          disabled={!commitMsg.trim() || commitFileMut.isPending}
                          onClick={() => {
                            commitFileMut.mutate({
                              externalId: selectedRepoId!,
                              path: currentPath,
                              content: btoa(unescape(encodeURIComponent(editContent))),
                              message: commitMsg,
                              sha: fileContentQuery.data!.sha,
                              branch: selectedBranch || undefined,
                            });
                          }}
                        >
                          {commitFileMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <GitCommit className="w-3.5 h-3.5 mr-1" />}
                          Commit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Suspense fallback={<div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}>
                      <CodeEditor
                        value={fileContentQuery.data.encoding === "base64"
                          ? atob(fileContentQuery.data.content.replace(/\n/g, ""))
                          : fileContentQuery.data.content}
                        filename={filePath[filePath.length - 1]}
                        readOnly
                        height="500px"
                      />
                    </Suspense>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Directory listing */
              <Card className="border-border">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {filePath.length > 0 && (
                      <button
                        onClick={() => setFilePath(filePath.slice(0, -1))}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <Folder className="w-4 h-4 text-primary" />
                        <span className="text-sm">..</span>
                      </button>
                    )}
                    {fileTreeItems.map((item) => {
                      const name = item.path.split("/").pop() || item.path;
                      return (
                        <button
                          key={item.sha}
                          onClick={() => {
                            if (item.type === "tree") {
                              setFilePath([...filePath, name]);
                            } else {
                              setFilePath([...filePath, name]);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          {item.type === "tree" ? (
                            <FolderOpen className="w-4 h-4 text-primary" />
                          ) : (
                            <File className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{name}</span>
                          {item.size && <span className="ml-auto text-xs text-muted-foreground">{(item.size / 1024).toFixed(1)} KB</span>}
                        </button>
                      );
                    })}
                    {fileTreeItems.length === 0 && !fileTreeQuery.isLoading && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {fileTreeQuery.isError ? "Failed to load file tree" : "Empty directory"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches" className="flex-1 overflow-auto m-0 p-6">
            <div className="space-y-2">
              {branchesQuery.isLoading && (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
              )}
              {branchesQuery.data?.map((branch) => (
                <Card key={branch.name} className="border-border">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{branch.name}</span>
                    {branch.name === selectedRepo.defaultBranch && (
                      <Badge variant="secondary" className="text-[10px]">default</Badge>
                    )}
                    {branch.protected && (
                      <Badge variant="outline" className="text-[10px]"><Lock className="w-2.5 h-2.5 mr-0.5" /> protected</Badge>
                    )}
                    <code className="ml-auto text-[10px] text-muted-foreground font-mono">{branch.commit.sha.slice(0, 7)}</code>
                  </CardContent>
                </Card>
              ))}
              {branchesQuery.data?.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">No branches found</div>
              )}
            </div>
          </TabsContent>

          {/* Commits Tab */}
          <TabsContent value="commits" className="flex-1 overflow-auto m-0 p-6">
            <div className="space-y-2">
              {commitsQuery.isLoading && (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
              )}
              {commitsQuery.data?.map((commit) => (
                <Card key={commit.sha} className="border-border">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <GitCommit className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{commit.commit.message.split("\n")[0]}</p>
                      <p className="text-xs text-muted-foreground">
                        {commit.author?.login || commit.commit.author.name} committed {new Date(commit.commit.author.date).toLocaleDateString()}
                      </p>
                    </div>
                    <code className="text-[10px] text-muted-foreground font-mono shrink-0">{commit.sha.slice(0, 7)}</code>
                    <Button variant="ghost" size="sm" className="shrink-0" asChild>
                      <a href={commit.html_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Pull Requests Tab */}
          <TabsContent value="prs" className="flex-1 overflow-auto m-0 p-6">
            <div className="space-y-2">
              {prsQuery.isLoading && (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
              )}
              {prsQuery.data?.map((pr) => (
                <Card key={pr.id} className="border-border">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <GitPullRequest className={cn("w-4 h-4 shrink-0", pr.state === "open" ? "text-green-500" : "text-purple-500")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{pr.title}</p>
                        <span className="text-xs text-muted-foreground">#{pr.number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pr.user.login} wants to merge <code className="text-[10px]">{pr.head.ref}</code> into <code className="text-[10px]">{pr.base.ref}</code>
                      </p>
                    </div>
                    <Badge variant={pr.state === "open" ? "default" : "secondary"}>{pr.state}</Badge>
                    {pr.state === "open" && (
                      <Button variant="outline" size="sm"
                        disabled={mergePRMut.isPending}
                        onClick={() => {
                          if (confirm(`Merge PR #${pr.number}: ${pr.title}?`)) {
                            mergePRMut.mutate({ externalId: selectedRepoId!, pullNumber: pr.number });
                          }
                        }}
                      >
                        {mergePRMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Merge"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a href={pr.html_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {prsQuery.data?.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">No open pull requests</div>
              )}
            </div>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="flex-1 overflow-auto m-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Issues</h3>
              <Button variant="outline" size="sm" onClick={() => { setCreateIssueOpen(true); setIssueTitle(""); setIssueBody(""); }}>
                <Plus className="w-3 h-3 mr-1" /> New Issue
              </Button>
            </div>
            <div className="space-y-2">
              {issuesQuery.isLoading && (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
              )}
              {issuesQuery.data?.map((issue) => (
                <Card key={issue.id} className="border-border">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <AlertCircle className={cn("w-4 h-4 shrink-0", issue.state === "open" ? "text-green-500" : "text-red-500")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        <span className="text-xs text-muted-foreground">#{issue.number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        opened by {issue.user.login} on {new Date(issue.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {issue.labels.slice(0, 3).map(l => (
                        <Badge key={l.name} variant="outline" className="text-[10px]" style={{ borderColor: `#${l.color}`, color: `#${l.color}` }}>
                          {l.name}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {issuesQuery.data?.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">No open issues</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* New File Dialog */}
        <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>Create a new file in {filePath.length > 0 ? filePath.join("/") + "/" : "root"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>File name</Label>
                <Input
                  placeholder="e.g. README.md"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                />
              </div>
              <div>
                <Label>Content</Label>
                <Suspense fallback={<div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}>
                  <CodeEditor
                    value={newFileContent}
                    onChange={setNewFileContent}
                    filename={newFileName}
                    height="300px"
                  />
                </Suspense>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNewFileOpen(false)}>Cancel</Button>
              <Button
                disabled={!newFileName.trim() || commitFileMut.isPending}
                onClick={() => {
                  const dir = filePath.join("/");
                  const fullPath = dir ? `${dir}/${newFileName}` : newFileName;
                  commitFileMut.mutate({
                    externalId: selectedRepoId!,
                    path: fullPath,
                    content: btoa(unescape(encodeURIComponent(newFileContent))),
                    message: `Create ${newFileName}`,
                    branch: selectedBranch || undefined,
                  });
                  setNewFileOpen(false);
                }}
              >
                {commitFileMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Create File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Issue Dialog */}
        <Dialog open={createIssueOpen} onOpenChange={setCreateIssueOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Issue</DialogTitle>
              <DialogDescription>Open a new issue on {selectedRepo.fullName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="Issue title"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Describe the issue..."
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateIssueOpen(false)}>Cancel</Button>
              <Button
                disabled={!issueTitle.trim() || createIssueMut.isPending}
                onClick={() => {
                  createIssueMut.mutate({
                    externalId: selectedRepoId!,
                    title: issueTitle,
                    body: issueBody || undefined,
                  });
                }}
              >
                {createIssueMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Create Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Repo List View ──
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>GitHub</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage repositories, code, and deployments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="w-4 h-4 mr-1.5" /> Import Repo
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Repo
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Repo Grid */}
        {reposQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRepos.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No repositories connected</h3>
              <p className="text-sm text-muted-foreground mb-4">Import from GitHub or create a new repository</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>Import Repo</Button>
                <Button onClick={() => setCreateOpen(true)}>Create New</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRepos.map((repo) => (
              <Card
                key={repo.id}
                className="border-border hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/github/${repo.externalId}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {repo.isPrivate ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" /> : <Globe className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className="text-sm font-semibold text-primary group-hover:underline truncate">{repo.fullName}</span>
                    </div>
                    <Badge variant={repo.status === "connected" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {repo.status}
                    </Badge>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.starCount}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forkCount}</span>
                    {repo.lastSyncAt && (
                      <span className="ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Synced {new Date(repo.lastSyncAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Repository</DialogTitle>
            <DialogDescription>Select a repository from your GitHub account to connect</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[50vh] space-y-2 py-2">
            {!remoteReposQuery.data?.connected ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">Connect your GitHub account first</p>
                <Button onClick={() => { setImportOpen(false); navigate("/connectors"); }}>
                  Go to Connectors
                </Button>
              </div>
            ) : remoteReposQuery.isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              remoteReposQuery.data.repos.map((repo: any) => {
                const alreadyConnected = reposQuery.data?.some(r => r.fullName === repo.full_name && r.status !== "disconnected");
                return (
                  <div key={repo.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {repo.private ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="text-sm font-medium truncate">{repo.full_name}</span>
                      </div>
                      {repo.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{repo.description}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant={alreadyConnected ? "secondary" : "default"}
                      disabled={alreadyConnected || connectRepoMut.isPending}
                      onClick={() => handleImportRepo(repo)}
                    >
                      {alreadyConnected ? "Connected" : "Import"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Repo Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Repository</DialogTitle>
            <DialogDescription>Create a new GitHub repository and connect it automatically</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Repository Name</Label>
              <Input
                placeholder="my-awesome-project"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="A brief description of your project"
                value={newRepoDesc}
                onChange={(e) => setNewRepoDesc(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Private Repository</Label>
                <p className="text-xs text-muted-foreground">Only you and collaborators can see this repo</p>
              </div>
              <Switch checked={newRepoPrivate} onCheckedChange={setNewRepoPrivate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createRepoMut.mutate({
                name: newRepoName,
                description: newRepoDesc || undefined,
                isPrivate: newRepoPrivate,
                autoInit: true,
              })}
              disabled={!newRepoName.trim() || createRepoMut.isPending}
            >
              {createRepoMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Repository
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
