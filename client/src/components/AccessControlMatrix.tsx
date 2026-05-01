import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, CreditCard, Settings, KeyRound, ShieldAlert, PlusCircle, Download, AlertTriangle } from 'lucide-react';

// --- DATA STRUCTURES ---
type PermissionType = 'read' | 'write' | 'delete';

interface Permission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

interface Resource {
  id: string;
  name: string;
  icon: React.ElementType;
}

interface Role {
  id: string;
  name: string;
  isCustom: boolean;
  parentRole?: string;
}

type PermissionsMatrix = Record<string, Record<string, Permission>>;

// --- MOCK DATA ---
const initialRoles: Role[] = [
  { id: 'admin', name: 'Admin', isCustom: false },
  { id: 'editor', name: 'Editor', isCustom: false, parentRole: 'admin' },
  { id: 'viewer', name: 'Viewer', isCustom: false, parentRole: 'editor' },
  { id: 'billing_manager', name: 'Billing Manager', isCustom: true },
];

const initialResources: Resource[] = [
  { id: 'users', name: 'Users', icon: Users },
  { id: 'projects', name: 'Projects', icon: FolderKanban },
  { id: 'billing', name: 'Billing', icon: CreditCard },
  { id: 'settings', name: 'Settings', icon: Settings },
  { id: 'api_keys', name: 'API Keys', icon: KeyRound },
  { id: 'audit_logs', name: 'Audit Logs', icon: ShieldAlert },
];

const generateInitialPermissions = (roles: Role[], resources: Resource[]): PermissionsMatrix => {
  const matrix: PermissionsMatrix = {};
  roles.forEach(role => {
    matrix[role.id] = {};
    resources.forEach(resource => {
      let read = false, write = false, del = false;
      if (role.id === 'admin') {
        read = write = del = true;
      } else if (role.id === 'editor') {
        read = write = true;
        del = resource.id === 'projects';
      } else if (role.id === 'viewer') {
        read = true;
      } else if (role.id === 'billing_manager' && resource.id === 'billing') {
        read = write = true;
      }
      matrix[role.id][resource.id] = { read, write, delete: del };
    });
  });
  return matrix;
};

const PermissionCheckbox: React.FC<{ permission: boolean; onChange: (checked: boolean) => void; inherited: boolean; source: string | null; isConflict: boolean; }> = ({ permission, onChange, inherited, source, isConflict }) => {
  return (
    <div className="relative flex items-center justify-center h-5 w-5">
      <Checkbox checked={permission} onCheckedChange={(checked) => onChange(Boolean(checked))} />
      {inherited && !permission && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" title={`Inherited from ${source}`} />
      )}
      {isConflict && (
          <span title="Conflict: Overridden inherited permission"><AlertTriangle className="absolute -bottom-1 -right-1 w-3 h-3 text-yellow-500" /></span>
      )}
    </div>
  );
};

export default function AccessControlMatrix() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [resources] = useState<Resource[]>(initialResources);
  const [permissions, setPermissions] = useState<PermissionsMatrix>(() => generateInitialPermissions(initialRoles, initialResources));
  const [newRoleName, setNewRoleName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getInheritedPermission = useCallback((roleId: string, resourceId: string, permissionType: PermissionType): { inherited: boolean, source: string | null } => {
    const role = roles.find(r => r.id === roleId);
    if (!role || !role.parentRole) return { inherited: false, source: null };

    let currentRole = roles.find(r => r.id === role.parentRole);
    while(currentRole) {
        if (permissions[currentRole.id]?.[resourceId]?.[permissionType]) {
            return { inherited: true, source: currentRole.name };
        }
        currentRole = currentRole.parentRole ? roles.find(r => r.id === currentRole!.parentRole) : undefined;
    }
    return { inherited: false, source: null };
  }, [roles, permissions]);

  const handlePermissionChange = useCallback((roleId: string, resourceId: string, permissionType: PermissionType, value: boolean) => {
    setPermissions(prev => {
      const newPermissions = JSON.parse(JSON.stringify(prev));
      newPermissions[roleId][resourceId][permissionType] = value;
      return newPermissions;
    });
  }, []);

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const newRoleId = newRoleName.toLowerCase().replace(/\s+/g, '_');
    const newRole: Role = { id: newRoleId, name: newRoleName, isCustom: true };
    setRoles(prev => [...prev, newRole]);
    setPermissions(prev => {
      const newMatrix = { ...prev };
      newMatrix[newRoleId] = {};
      resources.forEach(resource => {
        newMatrix[newRoleId][resource.id] = { read: false, write: false, delete: false };
      });
      return newMatrix;
    });
    setNewRoleName('');
    setIsDialogOpen(false);
  };

  const handleBulkToggle = (type: 'row' | 'col', id: string, pType: PermissionType, checked: boolean) => {
      setPermissions(prev => {
          const newPerms = JSON.parse(JSON.stringify(prev));
          if (type === 'col') {
              resources.forEach(res => { newPerms[id][res.id][pType] = checked; });
          } else {
              roles.forEach(role => { newPerms[role.id][id][pType] = checked; });
          }
          return newPerms;
      });
  };

  const exportPermissions = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ roles, resources, permissions }, null, 2))}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "access_control_matrix.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const gridStyle = { gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${roles.length}, minmax(150px, 1fr))` };

  return (
    <Card className="w-full max-w-7xl mx-auto bg-background text-foreground shadow-lg border-border/40">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-6 py-4">
        <CardTitle className="text-xl">Access Control Matrix</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPermissions}><Download className="mr-2 h-4 w-4" /> Export JSON</Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Role</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background">
              <DialogHeader><DialogTitle>Create New Role</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" value={newRoleName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleName(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <Button onClick={handleAddRole}>Create Role</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="grid" style={gridStyle}>
            {/* Header Row */}
            <div className="sticky top-0 z-10 bg-muted p-3 font-semibold border-b border-r border-border/40 flex items-center">
                <span className="text-sm">Permissions</span>
            </div>
            {roles.map(role => (
              <div key={role.id} className="sticky top-0 z-10 bg-muted p-2 font-semibold border-b border-r border-border/40 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm">{role.name}</span>
                  <div className="grid grid-cols-3 gap-x-3 text-xs text-muted-foreground">
                    <span>R</span><span>W</span><span>D</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Resource Rows */}
            {resources.map((resource, resIndex) => (
              <React.Fragment key={resource.id}>
                <div className="p-3 font-medium border-b border-r border-border/40 flex items-center gap-3 text-sm">
                  {React.createElement(resource.icon, { className: 'h-5 w-5 flex-shrink-0' })}
                  <span className="truncate">{resource.name}</span>
                </div>
                {roles.map((role, roleIndex) => (
                  <motion.div
                    key={`${resource.id}-${role.id}`}
                    className="p-3 border-b border-r border-border/40 grid grid-cols-3 gap-x-3 items-center justify-items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: roleIndex * 0.03 + resIndex * 0.05 }}
                  >
                    {(['read', 'write', 'delete'] as PermissionType[]).map(pType => {
                      const { inherited, source } = getInheritedPermission(role.id, resource.id, pType);
                      const hasDirectPermission = permissions[role.id]?.[resource.id]?.[pType] ?? false;
                      const isConflict = inherited && !hasDirectPermission;
                      return (
                        <PermissionCheckbox
                          key={pType}
                          permission={hasDirectPermission}
                          onChange={(checked) => handlePermissionChange(role.id, resource.id, pType, checked)}
                          inherited={inherited}
                          source={source}
                          isConflict={isConflict}
                        />
                      );
                    })}
                  </motion.div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
