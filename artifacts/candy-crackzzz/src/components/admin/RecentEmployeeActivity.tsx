import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return '—';
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function RecentEmployeeActivity() {
  const { activityLogs } = useAuth();

  const employeeActivity = useMemo(
    () => activityLogs.filter(entry => entry.role === 'employee').slice(0, 10),
    [activityLogs],
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-4">
      <h2 className="text-2xl font-black uppercase tracking-wider">Recent Employee Activity</h2>
      {employeeActivity.length === 0 ? (
        <div className="text-sm font-bold text-muted-foreground">No employee login activity yet.</div>
      ) : (
        <div className="space-y-3">
          {employeeActivity.map(entry => (
            <div key={entry.id} className="border border-border rounded-xl p-4 grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Employee</div>
                <div className="font-black">{entry.username}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Logged In</div>
                <div className="text-sm font-bold">{formatDateTime(entry.loginAt)}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Logged Out / Status</div>
                <div className="text-sm font-bold">{entry.logoutAt ? formatDateTime(entry.logoutAt) : entry.status}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Session Length</div>
                <div className="text-sm font-bold">{entry.status === 'active' ? 'Active now' : formatDuration(entry.durationMs)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
