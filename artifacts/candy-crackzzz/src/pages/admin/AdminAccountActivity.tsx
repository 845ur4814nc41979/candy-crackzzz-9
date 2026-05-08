import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import RecentEmployeeActivity from '@/components/admin/RecentEmployeeActivity';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminAccountActivity() {
  const { changeCredentials, createEmployeeInvite, setEmployeeAccess, isOwner, staffUsers } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [employeeUsername, setEmployeeUsername] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [teamMessage, setTeamMessage] = useState('');

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMessage('');
    if (!currentPassword) return setAccountMessage('Current password is required.');
    if (newPassword && newPassword !== confirmPassword) return setAccountMessage('New passwords do not match.');
    const result = await changeCredentials(currentPassword, newUsername, newPassword);
    setAccountMessage(result.success ? 'Account updated.' : result.error);
    if (result.success) {
      setCurrentPassword('');
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamMessage('');
    const result = await createEmployeeInvite(employeeUsername, employeePassword);
    setTeamMessage(result.success ? `Employee created: ${result.invite?.username}` : result.error);
    if (result.success) {
      setEmployeeUsername('');
      setEmployeePassword('');
    }
  };

  const toggleEmployee = async (userId: string, enabled: boolean) => {
    const result = await setEmployeeAccess(userId, enabled);
    setTeamMessage(result.success ? (enabled ? 'Employee reconnected.' : 'Employee disconnected.') : result.error);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Account and Security</h1>
          <p className="text-muted-foreground font-bold">Backend account tools are now active.</p>
        </div>

        <form onSubmit={saveAccount} className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-4 max-w-2xl">
          <div>
            <Label className="font-bold">Current Password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-2 h-12 font-bold" required />
          </div>
          <div>
            <Label className="font-bold">New Username</Label>
            <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="mt-2 h-12 font-bold" placeholder="Leave blank to keep current" />
          </div>
          <div>
            <Label className="font-bold">New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-2 h-12 font-bold" placeholder="Leave blank to keep current" />
          </div>
          <div>
            <Label className="font-bold">Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-2 h-12 font-bold" />
          </div>
          {accountMessage && <div className="text-sm font-bold">{accountMessage}</div>}
          <Button type="submit" className="font-black uppercase tracking-wider">Save Changes</Button>
        </form>

        {isOwner && (
          <div className="space-y-8">
            <div className="grid gap-8 xl:grid-cols-2">
              <form onSubmit={createEmployee} className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-4">
                <h2 className="text-2xl font-black uppercase tracking-wider">Create Employee Login</h2>
                <div>
                  <Label className="font-bold">Employee Username</Label>
                  <Input value={employeeUsername} onChange={e => setEmployeeUsername(e.target.value)} className="mt-2 h-12 font-bold" required />
                </div>
                <div>
                  <Label className="font-bold">Employee Password</Label>
                  <Input value={employeePassword} onChange={e => setEmployeePassword(e.target.value)} className="mt-2 h-12 font-bold" required />
                </div>
                <Button type="submit" className="font-black uppercase tracking-wider">Create Employee</Button>
              </form>

              <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-4">
                <h2 className="text-2xl font-black uppercase tracking-wider">Employee Access</h2>
                {staffUsers.length === 0 ? (
                  <div className="text-sm font-bold text-muted-foreground">No employee logins have been created yet.</div>
                ) : (
                  staffUsers.map(user => (
                    <div key={user.id} className="border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-black">{user.username}</div>
                        <div className="text-sm font-bold text-muted-foreground">{user.status}</div>
                      </div>
                      <Button type="button" variant={user.status === 'active' ? 'destructive' : 'default'} onClick={() => void toggleEmployee(user.id, user.status !== 'active')}>
                        {user.status === 'active' ? 'Disconnect' : 'Reconnect'}
                      </Button>
                    </div>
                  ))
                )}
                {teamMessage && <div className="text-sm font-bold">{teamMessage}</div>}
              </div>
            </div>

            <RecentEmployeeActivity />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
