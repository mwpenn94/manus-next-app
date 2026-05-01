
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Hourglass, FileText, Server, Wrench, GitBranch, Shield, ShieldAlert, Play, Undo2 } from "lucide-react";

// --- MOCK DATA AND TYPES ---
type MigrationStatus = "applied" | "pending" | "failed";

type Migration = {
  id: string;
  name: string;
  timestamp: string;
  status: MigrationStatus;
  author: string;
  content: string;
};

const mockMigrations: Migration[] = [
  {
    id: "20240501123000",
    name: "create_users_table",
    timestamp: "2024-05-01T12:30:00Z",
    status: "applied",
    author: "Alice",
    content: `CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  username VARCHAR(50) UNIQUE NOT NULL,\n  email VARCHAR(100) UNIQUE NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);`,
  },
  {
    id: "20240502090000",
    name: "add_posts_table",
    timestamp: "2024-05-02T09:00:00Z",
    status: "applied",
    author: "Bob",
    content: `CREATE TABLE posts (\n  id SERIAL PRIMARY KEY,\n  user_id INTEGER REFERENCES users(id),\n  title VARCHAR(255) NOT NULL,\n  body TEXT,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);`,
  },
  {
    id: "20240503140000",
    name: "add_index_on_users_email",
    timestamp: "2024-05-03T14:00:00Z",
    status: "failed",
    author: "Alice",
    content: `CREATE UNIQUE INDEX idx_users_email ON users(email);`,
  },
    {
    id: "20240504180000",
    name: "create_comments_table",
    timestamp: "2024-05-04T18:00:00Z",
    status: "pending",
    author: "Charlie",
    content: `CREATE TABLE comments (\n  id SERIAL PRIMARY KEY,\n  post_id INTEGER REFERENCES posts(id),\n  user_id INTEGER REFERENCES users(id),\n  content TEXT NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);`,
  },
  {
    id: "20240505110000",
    name: "add_user_roles",
    timestamp: "2024-05-05T11:00:00Z",
    status: "pending",
    author: "David",
    content: `ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';`,
  },
];

const STATUS_ICONS: Record<MigrationStatus, React.ReactNode> = {
  applied: <CheckCircle className="h-5 w-5 text-green-500" />,
  pending: <Hourglass className="h-5 w-5 text-yellow-500" />,
  failed: <XCircle className="h-5 w-5 text-red-500" />,
};

const STATUS_COLORS: Record<MigrationStatus, string> = {
    applied: "border-green-500/50 bg-green-500/10",
    pending: "border-yellow-500/50 bg-yellow-500/10",
    failed: "border-red-500/50 bg-red-500/10",
};

export default function SchemaMigrationRunner() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [isMigrationLocked, setIsMigrationLocked] = useState(false);
  const [dryRunOutput, setDryRunOutput] = useState("");
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);

  useEffect(() => {
    // Simulate fetching data
    setMigrations(mockMigrations.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    // Simulate checking lock status
    const lockCheckInterval = setInterval(() => {
        setIsMigrationLocked(Math.random() > 0.8);
    }, 5000);
    return () => clearInterval(lockCheckInterval);
  }, []);

  const handleSelectMigration = (migration: Migration) => {
    setSelectedMigration(migration);
    setDryRunOutput("");
  };

  const handleApplyMigration = () => {
    if (!selectedMigration || selectedMigration.status !== 'pending') return;
    console.log(`Applying migration: ${selectedMigration.id}`);
    // Simulate API call and update state
    setDryRunOutput(`DRY RUN: Applying migration ${selectedMigration.name}...\n${selectedMigration.content}\n\nMigration would be applied successfully.`);
    setTimeout(() => {
        setMigrations(prev => prev.map(m => m.id === selectedMigration.id ? {...m, status: 'applied'} : m));
        setSelectedMigration(prev => prev ? {...prev, status: 'applied'} : null);
    }, 1500);
  };

  const handleRollbackMigration = () => {
    if (!selectedMigration || selectedMigration.status !== 'applied') return;
    console.log(`Rolling back migration: ${selectedMigration.id}`);
    // Simulate API call and update state
    setDryRunOutput(`DRY RUN: Rolling back migration ${selectedMigration.name}...\n\nMigration would be rolled back successfully.`);
    setTimeout(() => {
        setMigrations(prev => prev.map(m => m.id === selectedMigration.id ? {...m, status: 'pending'} : m));
        setSelectedMigration(prev => prev ? {...prev, status: 'pending'} : null);
        setIsRollbackConfirmOpen(false);
    }, 1500);
  };

  const sortedMigrations = useMemo(() => migrations, [migrations]);

  return (
    <div className="bg-background text-foreground p-4 lg:p-6 font-sans flex flex-col h-full">
        <header className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
                <GitBranch className="h-6 w-6" />
                <h1 className="text-xl font-semibold">Database Migrations</h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    {isMigrationLocked ? (
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                    ) : (
                        <Shield className="h-5 w-5 text-green-500" />
                    )}
                    <span>{isMigrationLocked ? "Locked" : "Unlocked"}</span>
                </div>
                <Button variant="outline" size="sm"><Wrench className="h-4 w-4 mr-2" />Generate Migration</Button>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow mt-4 min-h-0">
            {/* Migration History Timeline */}
            <Card className="lg:col-span-1 flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Migration History</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto flex-grow pr-2">
                    <div className="relative pl-6 space-y-1">
                        <div className="absolute left-[35px] top-2 bottom-2 w-0.5 bg-border" />
                        <AnimatePresence>
                            {sortedMigrations.map((migration) => (
                                <motion.div
                                    key={migration.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    onClick={() => handleSelectMigration(migration)}
                                    className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/80",
                                        selectedMigration?.id === migration.id ? "bg-muted shadow-md" : "bg-card",
                                        STATUS_COLORS[migration.status]
                                    )}
                                >
                                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-1 rounded-full flex items-center justify-center z-10">
                                        <div className="h-6 w-6 bg-background rounded-full flex items-center justify-center">{STATUS_ICONS[migration.status]}</div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div className="font-medium text-sm truncate">{migration.name}</div>
                                        <Badge variant="outline" className="text-xs shrink-0 ml-2">{migration.id.substring(8, 10)}:{migration.id.substring(10, 12)}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">{new Date(migration.timestamp).toLocaleString()} by {migration.author}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>

            {/* Migration Details & Actions */}
            <Card className="lg:col-span-2 flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                    {selectedMigration ? (
                        <motion.div
                            key={selectedMigration.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col h-full"
                        >
                            <CardHeader className="flex-shrink-0">
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate flex items-center gap-2"><FileText className="h-5 w-5" /> {selectedMigration.name}</span>
                                    <Badge variant={selectedMigration.status === 'applied' ? 'default' : selectedMigration.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize shrink-0 ml-4">
                                        {selectedMigration.status}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col min-h-0">
                                <Tabs defaultValue="content" className="flex flex-col flex-grow min-h-0">
                                    <TabsList className="mb-2 flex-shrink-0">
                                        <TabsTrigger value="content">Migration File</TabsTrigger>
                                        <TabsTrigger value="dry-run">Dry Run Output</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="content" className="flex-grow bg-muted/50 rounded-md overflow-hidden relative">
                                        <pre className="text-sm p-4 overflow-auto h-full"><code className="font-mono">{selectedMigration.content}</code></pre>
                                    </TabsContent>
                                    <TabsContent value="dry-run" className="flex-grow bg-muted/50 rounded-md overflow-hidden relative">
                                        <pre className="text-sm p-4 overflow-auto h-full whitespace-pre-wrap font-mono">{dryRunOutput || "Run an action to see its dry-run output."}</pre>
                                    </TabsContent>
                                </Tabs>
                                <div className="flex items-center justify-end gap-2 mt-4 flex-shrink-0">
                                    <Button 
                                        onClick={handleApplyMigration} 
                                        disabled={selectedMigration.status !== 'pending' || isMigrationLocked}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Play className="h-4 w-4 mr-2" /> Apply
                                    </Button>
                                    <Dialog open={isRollbackConfirmOpen} onOpenChange={setIsRollbackConfirmOpen}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="outline"
                                                disabled={selectedMigration.status !== 'applied' || isMigrationLocked}
                                            >
                                                <Undo2 className="h-4 w-4 mr-2" /> Rollback
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Confirm Rollback</DialogTitle>
                                                <DialogDescription>
                                                    Are you sure you want to roll back the migration "{selectedMigration.name}"?
                                                    This action cannot be undone.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsRollbackConfirmOpen(false)}>Cancel</Button>
                                                <Button onClick={handleRollbackMigration} className="bg-red-600 hover:bg-red-700 text-white">Confirm Rollback</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center justify-center h-full text-muted-foreground"
                        >
                            <Server className="h-16 w-16 mb-4" />
                            <p className="text-lg">Select a migration to view details</p>
                            <p className="text-sm">You can preview file contents, run actions, and see dry-run outputs.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    </div>
  );
}
