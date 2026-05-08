import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AdminInvite, PublicAdminUser } from '@/lib/api';
import {
  ASSIGNABLE_ROLES,
  roleDescriptions,
  roleLabels,
} from '@/lib/permissions';
import type { AdminRole } from '@/types';
import {
  AlertTriangle,
  Check,
  KeyRound,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';

function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  const pickFrom = (src: string, n: number) =>
    Array.from({ length: n }, () => src[Math.floor(Math.random() * src.length)]).join('');
  return pickFrom(alphabet, 11) + pickFrom(symbols, 1);
}

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminTeam() {
  const {
    adminUsers,
    currentUser,
    createAdminUser,
    updateAdminUser,
    resetAdminUserPassword,
    deleteAdminUser,
  } = useAuth();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState(generateTempPassword());
  const [newRole, setNewRole] = useState<AdminRole>('staff');
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true);

  const [latestInvite, setLatestInvite] = useState<AdminInvite | null>(null);

  const [resetTarget, setResetTarget] = useState<PublicAdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetForceChange, setResetForceChange] = useState(true);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<PublicAdminUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const sortedUsers = useMemo(() => {
    const order = ['owner', 'site_admin', 'system_admin', 'campaign_admin', 'staff', 'employee', 'delivery_driver', 'viewer'];
    return [...adminUsers].sort((a, b) => {
      const ai = order.indexOf(a.role);
      const bi = order.indexOf(b.role);
      if (ai !== bi) return ai - bi;
      return a.username.localeCompare(b.username);
    });
  }, [adminUsers]);

  const activeOwners = useMemo(
    () => adminUsers.filter((u) => u.role === 'owner' && u.status === 'active'),
    [adminUsers],
  );

  const openCreate = () => {
    setNewUsername('');
    setNewPassword(generateTempPassword());
    setNewRole('staff');
    setForceChangeOnLogin(true);
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setCreateError('');
    if (newUsername.trim().length < 3) {
      setCreateError('Username must be at least 3 characters.');
      return;
    }
    if (newPassword.length < 8) {
      setCreateError('Temporary password must be at least 8 characters.');
      return;
    }
    setCreateBusy(true);
    const result = await createAdminUser({
      username: newUsername.trim(),
      password: newPassword,
      role: newRole,
      mustChangePassword: forceChangeOnLogin,
    });
    setCreateBusy(false);
    if (!result.success) {
      setCreateError(result.error || 'Could not create the user.');
      return;
    }
    setCreateOpen(false);
    setLatestInvite(result.invite ?? null);
    toast({ title: 'Admin user created', description: `${result.invite?.username} added to the team.` });
  };

  const handleRoleChange = async (user: PublicAdminUser, role: AdminRole) => {
    const wasOnlyOwner = user.role === 'owner' && activeOwners.length <= 1;
    if (wasOnlyOwner && role !== 'owner') {
      toast({
        title: 'Cannot change role',
        description: 'Promote another admin to Builder first.',
        variant: 'destructive',
      });
      return;
    }
    const result = await updateAdminUser(user.id, { role });
    if (!result.success) {
      toast({ title: 'Update failed', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Role updated', description: `${user.username} is now ${roleLabels[role]}.` });
    }
  };

  const handleToggleStatus = async (user: PublicAdminUser) => {
    const nextStatus: 'active' | 'disabled' = user.status === 'active' ? 'disabled' : 'active';
    if (
      nextStatus === 'disabled' &&
      user.role === 'owner' &&
      activeOwners.length <= 1
    ) {
      toast({
        title: 'Cannot disable',
        description: 'There must be at least one active Builder.',
        variant: 'destructive',
      });
      return;
    }
    const result = await updateAdminUser(user.id, { status: nextStatus });
    if (!result.success) {
      toast({ title: 'Update failed', description: result.error, variant: 'destructive' });
    } else {
      toast({
        title: nextStatus === 'active' ? 'User enabled' : 'User disabled',
        description: `${user.username} can ${nextStatus === 'active' ? 'now' : 'no longer'} sign in.`,
      });
    }
  };

  const handleToggleForceChange = async (user: PublicAdminUser) => {
    const next = !user.mustChangePassword;
    const result = await updateAdminUser(user.id, { mustChangePassword: next });
    if (!result.success) {
      toast({ title: 'Update failed', description: result.error, variant: 'destructive' });
    }
  };

  const openReset = (user: PublicAdminUser) => {
    setResetTarget(user);
    setResetPassword(generateTempPassword());
    setResetForceChange(true);
    setResetError('');
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetError('');
    if (resetPassword.length < 8) {
      setResetError('Temporary password must be at least 8 characters.');
      return;
    }
    setResetBusy(true);
    const result = await resetAdminUserPassword(resetTarget.id, {
      password: resetPassword,
      mustChangePassword: resetForceChange,
    });
    setResetBusy(false);
    if (!result.success) {
      setResetError(result.error || 'Could not reset the password.');
      return;
    }
    setResetTarget(null);
    setLatestInvite(result.invite ?? null);
    toast({ title: 'Password reset', description: 'Share the temporary password with the user.' });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    const result = await deleteAdminUser(confirmDelete.id);
    setDeleteBusy(false);
    if (!result.success) {
      toast({ title: 'Delete failed', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'User deleted', description: `${confirmDelete.username} was removed from the team.` });
    setConfirmDelete(null);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Team</h1>
            <p className="text-sm text-foreground/70 mt-1 max-w-2xl">
              Add admins, change roles, reset temporary passwords, disable access, or remove
              accounts. Only admins with team-management permission can use this page.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="font-black uppercase tracking-wider"
            data-testid="button-add-admin"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add admin user
          </Button>
        </div>

        {latestInvite && (
          <InviteBanner invite={latestInvite} onClose={() => setLatestInvite(null)} />
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1.4fr_0.9fr_1.1fr_1.1fr] gap-3 px-5 py-3 bg-muted/40 text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border">
            <div>User</div>
            <div>Role</div>
            <div>Status</div>
            <div>Last login</div>
            <div className="text-right">Actions</div>
          </div>

          {sortedUsers.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No admin users yet.</div>
          )}

          {sortedUsers.map((user) => {
            const isSelf = user.id === currentUser?.id;
            const isOnlyActiveOwner = user.role === 'owner' && activeOwners.length <= 1 && user.status === 'active';
            return (
              <div
                key={user.id}
                className="grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_0.9fr_1.1fr_1.1fr] gap-3 px-5 py-4 border-b border-border last:border-b-0 items-center"
                data-testid={`row-admin-${user.id}`}
              >
                <div>
                  <div className="font-bold text-foreground flex items-center gap-2">
                    {user.username}
                    {isSelf && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                    {user.mustChangePassword && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded">
                        Must change pwd
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Created {formatDate(user.createdAt)}
                  </div>
                </div>

                <div className="space-y-1">
                  <Select
                    value={user.role}
                    onValueChange={(v) => handleRoleChange(user, v as AdminRole)}
                    disabled={isSelf || isOnlyActiveOwner}
                  >
                    <SelectTrigger
                      className="h-9 text-sm"
                      data-testid={`select-role-${user.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabels[r]}
                        </SelectItem>
                      ))}
                      {user.role === 'employee' && (
                        <SelectItem value="employee" disabled>
                          {roleLabels.employee}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {roleDescriptions[user.role]}
                  </p>
                </div>

                <div>
                  {user.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2 py-1 rounded">
                      <X className="w-3 h-3" /> Disabled
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">{formatDate(user.lastLoginAt)}</div>

                <div className="flex flex-wrap md:justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReset(user)}
                    className="font-bold"
                    data-testid={`button-reset-${user.id}`}
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1" />
                    Reset pwd
                  </Button>
                  {!isSelf && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(user)}
                      disabled={user.status === 'active' && isOnlyActiveOwner}
                      className="font-bold"
                      data-testid={`button-toggle-${user.id}`}
                    >
                      {user.status === 'active' ? (
                        <>
                          <ShieldOff className="w-3.5 h-3.5 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleForceChange(user)}
                    className="font-bold"
                    data-testid={`button-force-pwd-${user.id}`}
                  >
                    {user.mustChangePassword ? 'Clear pwd flag' : 'Force pwd change'}
                  </Button>
                  {!isSelf && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmDelete(user)}
                      disabled={isOnlyActiveOwner}
                      className="font-bold"
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider">Add admin user</DialogTitle>
            <DialogDescription>
              Pick a role and set a temporary password. The user will be required to change it on
              first login by default.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-username">Username</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. mara"
                autoComplete="off"
                data-testid="input-new-username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewPassword(generateTempPassword())}
                  className="font-bold whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters. Shown once after creation.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-role">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AdminRole)}>
                <SelectTrigger id="new-role" data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-snug">
                {roleDescriptions[newRole]}
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
              <div>
                <div className="font-bold text-sm">Force password change on first login</div>
                <div className="text-xs text-muted-foreground">Recommended for new accounts.</div>
              </div>
              <Switch checked={forceChangeOnLogin} onCheckedChange={setForceChangeOnLogin} />
            </label>

            {createError && (
              <div className="text-sm font-bold text-rose-600 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
                {createError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createBusy} data-testid="button-create-admin">
              {createBusy ? 'Creating…' : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Create user
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider">
              Reset password for {resetTarget?.username}
            </DialogTitle>
            <DialogDescription>
              The user will be logged out everywhere and forced to change the password on next login
              (if enabled).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="reset-password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoComplete="new-password"
                  data-testid="input-reset-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPassword(generateTempPassword())}
                  className="font-bold whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
              <div>
                <div className="font-bold text-sm">Force password change on next login</div>
              </div>
              <Switch checked={resetForceChange} onCheckedChange={setResetForceChange} />
            </label>
            {resetError && (
              <div className="text-sm font-bold text-rose-600 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
                {resetError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetBusy}>
              Cancel
            </Button>
            <Button onClick={handleReset} disabled={resetBusy} data-testid="button-confirm-reset">
              {resetBusy ? 'Resetting…' : 'Reset password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider">Delete user?</DialogTitle>
            <DialogDescription>
              This will remove <span className="font-bold">{confirmDelete?.username}</span> from the
              team and end any active sessions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBusy}
              data-testid="button-confirm-delete"
            >
              {deleteBusy ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function InviteBanner({ invite, onClose }: { invite: AdminInvite; onClose: () => void }) {
  const { toast } = useToast();
  const copyAll = async () => {
    const text = `Username: ${invite.username}\nTemporary password: ${invite.password}\nRole: ${roleLabels[invite.role]}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select the text manually instead.', variant: 'destructive' });
    }
  };
  return (
    <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <div className="font-black uppercase tracking-wider text-amber-700">
            Save this password — it's shown only once
          </div>
          <p className="text-sm text-amber-800 mt-1">
            Share these credentials with the user securely. We can't show the password again.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-amber-700 hover:text-amber-900"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-white border border-amber-200 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Username</div>
          <div className="font-mono font-bold text-amber-900 break-all" data-testid="invite-username">
            {invite.username}
          </div>
        </div>
        <div className="bg-white border border-amber-200 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Temporary password</div>
          <div className="font-mono font-bold text-amber-900 break-all" data-testid="invite-password">
            {invite.password}
          </div>
        </div>
        <div className="bg-white border border-amber-200 rounded-lg p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Role</div>
          <div className="font-bold text-amber-900">{roleLabels[invite.role]}</div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={copyAll} className="font-bold" data-testid="button-copy-invite">
          Copy credentials
        </Button>
      </div>
    </div>
  );
}
