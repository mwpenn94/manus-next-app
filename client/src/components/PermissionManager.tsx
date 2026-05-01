import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, User, FileText, Edit, Trash2, PlusCircle, ChevronDown, ChevronRight, Eye, ShieldAlert, Wrench, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Type Definitions
type Action = "create" | "read" | "update" | "delete";
type Resource = "documents" | "users" | "billing" | "settings" | "analytics" | "reports" | "integrations" | "audit_logs";

interface Permission {
  resource: Resource;
  actions: Set<Action>;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string; // ID of the role it inherits from
}

interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  details: string;
}

// Mock Data
const initialRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Full access to all resources.", permissions: [], inherits: "editor" },
  { id: "editor", name: "Editor", description: "Can create, read, and update most resources.", permissions: [
      { resource: "documents", actions: new Set<Action>(["create", "read", "update"]) },
      { resource: "reports", actions: new Set<Action>(["read", "update"]) },
  ], inherits: "viewer" },
  { id: "viewer", name: "Viewer", description: "Read-only access to specific resources.", permissions: [
      { resource: "documents", actions: new Set<Action>(["read"]) },
      { resource: "analytics", actions: new Set<Action>(["read"]) },
  ]},
  { id: "billing_manager", name: "Billing Manager", description: "Manages billing and subscriptions.", permissions: [
      { resource: "billing", actions: new Set<Action>(["create", "read", "update", "delete"]) },
  ]},
];

const initialUsers: User[] = [
  { id: "user-1", name: "Alice Johnson", email: "alice@example.com", roleId: "admin" },
  { id: "user-2", name: "Bob Williams", email: "bob@example.com", roleId: "editor" },
  { id: "user-3", name: "Charlie Brown", email: "charlie@example.com", roleId: "viewer" },
  { id: "user-4", name: "Diana Prince", email: "diana@example.com", roleId: "editor" },
  { id: "user-5", name: "Ethan Hunt", email: "ethan@example.com", roleId: "billing_manager" },
  { id: "user-6", name: "Fiona Glenanne", email: "fiona@example.com", roleId: "viewer" },
];

const initialAuditLogs: AuditLog[] = [
  { id: "log-1", timestamp: new Date(), user: "Alice Johnson", action: "Role Update", details: "Changed Editor permissions for 'reports'." },
  { id: "log-2", timestamp: new Date(Date.now() - 3600000), user: "Alice Johnson", action: "User Assignment", details: "Assigned 'Editor' role to Diana Prince." },
  { id: "log-3", timestamp: new Date(Date.now() - 86400000), user: "System", action: "Role Create", details: "Created new role 'Billing Manager'." },
];

const ALL_RESOURCES: Resource[] = ["documents", "users", "billing", "settings", "analytics", "reports", "integrations", "audit_logs"];
const ALL_ACTIONS: Action[] = ["create", "read", "update", "delete"];

const RoleCard: React.FC<{ role: Role; onSelect: (roleId: string) => void; isSelected: boolean }> = ({ role, onSelect, isSelected }) => (
  <motion.div whileHover={{ scale: 1.03 }} onClick={() => onSelect(role.id)} className={cn("cursor-pointer rounded-lg border p-4 transition-all", isSelected ? "border-primary ring-2 ring-primary" : "border-border")}>
    <div className="flex items-center gap-4">
      <Shield className="h-8 w-8 text-primary" />
      <div>
        <h3 className="font-semibold">{role.name}</h3>
        <p className="text-sm text-muted-foreground">{role.description}</p>
      </div>
    </div>
  </motion.div>
);

const RoleHierarchyNode: React.FC<{ role: Role; allRoles: Role[]; level: number }> = ({ role, allRoles, level }) => {
  const children = useMemo(() => allRoles.filter(r => r.inherits === role.id), [allRoles, role.id]);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ paddingLeft: `${level * 20}px` }}>
      <div className="flex items-center gap-2 py-1">
        {children.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-6 w-6">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        <Badge variant={role.id === "admin" ? "default" : "secondary"}>{role.name}</Badge>
      </div>
      <AnimatePresence>
        {isOpen && children.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            {children.map(child => <RoleHierarchyNode key={child.id} role={child} allRoles={allRoles} level={level + 1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function PermissionManager() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("editor");

  const getResolvedPermissions = useCallback((roleId: string, allRoles: Role[]): Map<Resource, Set<Action>> => {
    const role = allRoles.find(r => r.id === roleId);
    if (!role) return new Map();

    const inheritedPermissions = role.inherits ? getResolvedPermissions(role.inherits, allRoles) : new Map<Resource, Set<Action>>();

    role.permissions.forEach(p => {
      const existingActions = inheritedPermissions.get(p.resource) || new Set<Action>();
      p.actions.forEach(action => existingActions.add(action));
      inheritedPermissions.set(p.resource, existingActions);
    });

    return inheritedPermissions;
  }, []);

  const selectedRolePermissions = useMemo(() => getResolvedPermissions(selectedRoleId, roles), [selectedRoleId, roles, getResolvedPermissions]);

  const handlePermissionChange = (resource: Resource, action: Action, checked: boolean) => {
    setRoles(prevRoles => {
      const newRoles = [...prevRoles];
      const role = newRoles.find(r => r.id === selectedRoleId);
      if (!role) return prevRoles;

      let permission = role.permissions.find(p => p.resource === resource);
      if (!permission) {
        permission = { resource, actions: new Set<Action>() };
        role.permissions.push(permission);
      }

      if (checked) {
        permission.actions.add(action);
      } else {
        permission.actions.delete(action);
      }
      return newRoles;
    });
    // Add to audit log
  };

  const handleUserRoleChange = (userId: string, newRoleId: string) => {
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, roleId: newRoleId } : u));
    // Add to audit log
  };

  return (
    <div className="bg-background text-foreground p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Permission Manager</h1>
        <p className="text-muted-foreground">Manage roles, permissions, and user access across the platform.</p>
      </header>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">Roles & Hierarchy</TabsTrigger>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Roles</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {roles.map(role => (
                    <RoleCard key={role.id} role={role} onSelect={setSelectedRoleId} isSelected={selectedRoleId === role.id} />
                  ))}
                  <Dialog>
                    <DialogTrigger asChild>
                      <motion.div whileHover={{ scale: 1.03 }} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:bg-muted">
                        <PlusCircle className="h-6 w-6" />
                        <span className="font-semibold">Create Custom Role</span>
                      </motion.div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                      </DialogHeader>
                      {/* Form for new role */}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Role Inheritance</CardTitle>
                </CardHeader>
                <CardContent>
                  <RoleHierarchyNode role={roles.find(r => !r.inherits)!} allRoles={roles} level={0} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions for <Badge>{roles.find(r => r.id === selectedRoleId)?.name}</Badge></CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2 text-left font-semibold">Resource</th>
                      {ALL_ACTIONS.map(action => <th key={action} className="p-2 text-center font-semibold capitalize">{action}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_RESOURCES.map(resource => {
                      const permissions = selectedRolePermissions.get(resource) || new Set();
                      return (
                        <tr key={resource} className="border-b border-border transition-colors hover:bg-muted/50">
                          <td className="p-2 font-medium capitalize">{resource.replace('_', ' ')}</td>
                          {ALL_ACTIONS.map(action => (
                            <td key={action} className="p-2 text-center">
                              <Checkbox
                                checked={permissions.has(action)}
                                onCheckedChange={(checked) => handlePermissionChange(resource, action, !!checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Select value={user.roleId} onValueChange={(newRoleId) => handleUserRoleChange(user.id, newRoleId)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <ShieldAlert className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p><span className="font-semibold">{log.user}</span> performed action <Badge variant="secondary">{log.action}</Badge></p>
                        <p className="text-muted-foreground">{log.details}</p>
                        <p className="text-xs text-muted-foreground/70">{log.timestamp.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
