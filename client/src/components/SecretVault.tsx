import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, KeyRound, FileText, CircleUserRound, Search, PlusCircle, Folder, Copy, Eye, EyeOff, MoreHorizontal, AlertCircle, Check } from "lucide-react";

type SecretType = "API Key" | "Password" | "Certificate" | "Token";

type Secret = {
  id: string;
  name: string;
  type: SecretType;
  value: string;
  lastRotated: string;
  expires?: string;
  folder: string;
};

const mockSecrets: Secret[] = [
  { id: "sec_1", name: "GitHub API Token", type: "API Key", value: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx", lastRotated: "2026-03-15", folder: "API Keys" },
  { id: "sec_2", name: "AWS Root Password", type: "Password", value: "AwsRoot!@#123", lastRotated: "2026-04-01", expires: "2026-07-01", folder: "Passwords" },
  { id: "sec_3", name: "Stripe Webhook Cert", type: "Certificate", value: "cert_live_xxxxxxxxxxxxxxxxxxxx", lastRotated: "2025-12-10", folder: "Certificates" },
  { id: "sec_4", name: "OpenAI API Key", type: "API Key", value: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx", lastRotated: "2026-04-20", folder: "API Keys" },
  { id: "sec_5", name: "Database Admin Pass", type: "Password", value: "db_admin_p@ssw0rd", lastRotated: "2026-01-30", folder: "Passwords" },
  { id: "sec_6", name: "JWT Signing Secret", type: "Token", value: "jwt_super_secret_string_12345", lastRotated: "2026-02-28", folder: "API Keys" },
  { id: "sec_7", name: "SSL Certificate", type: "Certificate", value: "ssl_cert_xxxxxxxxxxxxxxxxxxxxx", lastRotated: "2026-03-01", expires: "2027-03-01", folder: "Certificates" },
  { id: "sec_8", name: "Vercel API Token", type: "API Key", value: "vcl_xxxxxxxxxxxxxxxxxxxxxxxxxxxx", lastRotated: "2026-04-10", folder: "API Keys" },
  { id: "sec_9", name: "SSH Key Password", type: "Password", value: "ssh_key_pass_phrase", lastRotated: "2025-11-11", folder: "Passwords" },
  { id: "sec_10", name: "Google OAuth Token", type: "Token", value: "ya29.xxxxxxxxxxxxxxxxxxxxxxxxxx", lastRotated: "2026-04-25", folder: "API Keys" },
];

const SECRET_TYPE_CONFIG: Record<SecretType, { icon: React.ElementType; color: string }> = {
  "API Key": { icon: KeyRound, color: "text-blue-400" },
  "Password": { icon: Shield, color: "text-green-400" },
  "Certificate": { icon: FileText, color: "text-yellow-400" },
  "Token": { icon: CircleUserRound, color: "text-purple-400" },
};

const CreateSecretDialog: React.FC<{ onSave: (newSecret: Omit<Secret, 'id' | 'lastRotated'>) => void; folders: string[] }> = ({ onSave, folders }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<SecretType>('API Key');
    const [value, setValue] = useState('');
    const [folder, setFolder] = useState(folders[0] || 'API Keys');
    const [expires, setExpires] = useState('');

    const handleSave = () => {
        if(name && value && folder) {
            onSave({ name, type, value, folder, expires: expires || undefined });
        }
    };

    return (
        <DialogContent className="sm:max-w-[425px] bg-background border-border">
            <DialogHeader>
                <DialogTitle>Create New Secret</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">Type</Label>
                    <Select onValueChange={(v: string) => setType(v as SecretType)} defaultValue={type}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(SECRET_TYPE_CONFIG).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="value" className="text-right">Value</Label>
                    <Input id="value" type="password" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="folder" className="text-right">Folder</Label>
                     <Select onValueChange={(v: string) => setFolder(v)} defaultValue={folder}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a folder" />
                        </SelectTrigger>
                        <SelectContent>
                            {folders.filter(f => f !== 'All').map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expires" className="text-right">Expires (Optional)</Label>
                    <Input id="expires" type="date" value={expires} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpires(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button type="submit" onClick={handleSave}>Save Secret</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
};

export default function SecretVault() {
  const [secrets, setSecrets] = useState<Secret[]>(mockSecrets);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedSecrets, setCopiedSecrets] = useState<Record<string, boolean>>({});

  const folders = useMemo(() => ['All', ...Array.from(new Set(secrets.map(s => s.folder)))], [secrets]);

  const filteredSecrets = useMemo(() => {
    return secrets
      .filter(s => selectedFolder === 'All' || s.folder === selectedFolder)
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [secrets, selectedFolder, searchTerm]);

  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const toggleReveal = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copySecret = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedSecrets(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedSecrets(prev => ({ ...prev, [id]: false })), 2000);
  };

  const handleCreateSecret = (newSecret: Omit<Secret, 'id' | 'lastRotated'>) => {
    const newId = `sec_${secrets.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    setSecrets(prev => [...prev, { ...newSecret, id: newId, lastRotated: today }]);
  };

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground min-h-[800px] w-full p-4 md:p-6 lg:p-8 font-sans flex gap-6">
        <aside className="w-1/4 max-w-xs hidden md:block">
          <h2 className="text-lg font-semibold mb-4 px-2">Folders</h2>
          <nav className="flex flex-col gap-1">
            {folders.map(folder => (
              <Button
                key={folder}
                variant={selectedFolder === folder ? "secondary" : "ghost"}
                className="justify-start gap-2"
                onClick={() => setSelectedFolder(folder)}
              >
                <Folder className="h-4 w-4" />
                {folder}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Secret Vault</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search secrets..." 
                  className="pl-10 w-64 bg-muted border-border"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><PlusCircle className="h-4 w-4 mr-2" /> New Secret</Button>
                </DialogTrigger>
                <CreateSecretDialog onSave={handleCreateSecret} folders={folders} />
              </Dialog>
            </div>
          </header>

          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="p-4 text-left font-medium">Name</th>
                      <th className="p-4 text-left font-medium">Value</th>
                      <th className="p-4 text-left font-medium">Last Rotated</th>
                      <th className="p-4 text-left font-medium">Expires</th>
                      <th className="p-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <AnimatePresence>
                    <tbody>
                      {filteredSecrets.map((secret, index) => (
                        <motion.tr 
                          key={secret.id} 
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                          exit={{ opacity: 0, x: -20 }}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4 flex items-center gap-3">
                            {React.createElement(SECRET_TYPE_CONFIG[secret.type].icon, { className: `h-5 w-5 ${SECRET_TYPE_CONFIG[secret.type].color}` })}
                            <div className="flex flex-col">
                                <span className="font-medium">{secret.name}</span>
                                <Badge variant="outline" className="w-fit mt-1">{secret.type}</Badge>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-muted-foreground tracking-wider">
                            {revealedSecrets[secret.id] ? secret.value : '••••••••••••••••'}
                          </td>
                          <td className="p-4 text-muted-foreground">{secret.lastRotated}</td>
                          <td className="p-4 text-muted-foreground">
                            {secret.expires ? (
                              <span className={cn("flex items-center gap-2", isExpired(secret.expires) && "text-red-500 font-semibold")}>
                                {isExpired(secret.expires) && <Tooltip><TooltipTrigger><AlertCircle className="h-4 w-4" /></TooltipTrigger><TooltipContent><p>This secret has expired.</p></TooltipContent></Tooltip>}
                                {secret.expires}
                              </span>
                            ) : 'Never'}
                          </td>
                          <td className="p-4 flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => copySecret(secret.id, secret.value)}>
                                  <AnimatePresence mode="wait" initial={false}>
                                    <motion.div key={copiedSecrets[secret.id] ? 'check' : 'copy'} initial={{scale: 0.5, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.5, opacity: 0}} transition={{duration: 0.2}}>
                                      {copiedSecrets[secret.id] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </motion.div>
                                  </AnimatePresence>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>{copiedSecrets[secret.id] ? 'Copied!' : 'Copy Secret'}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => toggleReveal(secret.id)}>
                                  {revealedSecrets[secret.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>{revealedSecrets[secret.id] ? 'Hide' : 'Reveal'} Secret</p></TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </AnimatePresence>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
}
