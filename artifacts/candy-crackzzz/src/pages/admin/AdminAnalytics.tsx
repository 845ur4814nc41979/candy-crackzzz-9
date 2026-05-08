import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye, Users, TrendingUp, Smartphone, Monitor, Tablet, RefreshCw,
  CalendarDays, CalendarRange, CalendarClock, Globe, BarChart2,
  MousePointerClick, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  apiGetAnalyticsSummary,
  apiGetRecentAnalyticsViews,
  type AnalyticsSummary,
  type AnalyticsViewRecord,
} from '@/lib/api';

const DEVICE_COLORS: Record<string, string> = {
  desktop: 'hsl(var(--primary))',
  mobile:  'hsl(var(--secondary))',
  tablet:  'hsl(var(--accent))',
  unknown: 'hsl(var(--muted-foreground))',
};

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return <Smartphone className="w-3.5 h-3.5" />;
  if (device === 'tablet') return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

function formatPath(path: string) {
  if (!path || path === '/') return 'Home (/)';
  return path;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-3xl font-black">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent] = useState<AnalyticsViewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, recentData] = await Promise.all([
        apiGetAnalyticsSummary(),
        apiGetRecentAnalyticsViews(50),
      ]);
      setSummary(summaryData);
      setRecent(recentData.recentViews);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pieData = (summary?.deviceBreakdown ?? []).map((d) => ({
    name: d.device || 'unknown',
    value: d.views,
  }));

  const barData = (summary?.topPages ?? []).slice(0, 8).map((p) => ({
    path: p.path === '/' ? 'Home' : p.path.replace(/^\//, '').replace(/-/g, ' '),
    views: p.views,
    fullPath: p.path,
  }));

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Analyticzz</h1>
          <p className="text-muted-foreground font-bold">
            Storefront traffic — who's visiting and what they're clicking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs font-bold text-muted-foreground">
              Updated {timeAgo(lastRefreshed.toISOString())}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="font-bold uppercase"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-4 font-bold">
          {error}
        </div>
      )}

      {!summary && !error && (
        <div className="text-center py-24 text-muted-foreground font-bold text-lg">
          Loading analytics…
        </div>
      )}

      {summary && (
        <>
          {/* Top-level stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              icon={Eye}
              label="Total Views"
              value={summary.totalViews.toLocaleString()}
              color="bg-primary/20 text-primary"
            />
            <StatCard
              icon={Users}
              label="Visitors"
              value={summary.uniqueVisitors.toLocaleString()}
              color="bg-secondary/20 text-secondary"
            />
            <StatCard
              icon={CalendarDays}
              label="Today"
              value={summary.viewsToday}
              color="bg-emerald-500/20 text-emerald-400"
            />
            <StatCard
              icon={CalendarRange}
              label="This Week"
              value={summary.viewsThisWeek}
              color="bg-amber-500/20 text-amber-400"
            />
            <StatCard
              icon={CalendarClock}
              label="This Month"
              value={summary.viewsThisMonth}
              color="bg-violet-500/20 text-violet-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Top Pages Bar Chart */}
            <Card className="border-border lg:col-span-2">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" /> Top Pages
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {barData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground font-bold">
                    No page view data yet. Visit your storefront to start tracking.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="path"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={false}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload as typeof barData[0];
                          return (
                            <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
                              <p className="font-black text-sm">{d.fullPath}</p>
                              <p className="text-primary font-black text-xl">{payload[0].value} views</p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="views"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Device Breakdown */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-secondary" /> Devices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {pieData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground font-bold text-sm">
                    No device data yet.
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={DEVICE_COLORS[entry.name] ?? `hsl(${index * 60}, 70%, 60%)`}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
                                <p className="font-black text-sm capitalize">{payload[0].name}</p>
                                <p className="font-black text-xl" style={{ color: payload[0].payload.fill }}>
                                  {payload[0].value} views
                                </p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {pieData.map((d) => {
                        const total = pieData.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                        return (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 font-bold capitalize">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: DEVICE_COLORS[d.name] ?? '#888' }}
                              />
                              <DeviceIcon device={d.name} />
                              {d.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black">{d.value}</span>
                              <Badge variant="outline" className="text-xs font-black">{pct}%</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Pages Table */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" /> Page Rankings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.topPages.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-bold">No data yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {summary.topPages.map((page, i) => {
                      const max = summary.topPages[0]?.views ?? 1;
                      const pct = Math.round((page.views / max) * 100);
                      return (
                        <div key={page.path} className="px-5 py-3.5 flex items-center gap-3">
                          <span className="text-xs font-black text-muted-foreground w-5 shrink-0 text-right">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{formatPath(page.path)}</div>
                            <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-black text-sm">{page.views.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Referrers */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" /> Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.referrerBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-bold">
                    No referrer data yet. Direct traffic has no referrer logged.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {summary.referrerBreakdown.slice(0, 8).map((ref) => {
                      let label = ref.referrer;
                      try { label = new URL(ref.referrer).hostname; } catch { /* raw */ }
                      return (
                        <div key={ref.referrer} className="px-5 py-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <MousePointerClick className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-bold text-sm truncate" title={ref.referrer}>{label}</span>
                          </div>
                          <span className="font-black text-sm shrink-0">{ref.views}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Visits */}
          <Card className="border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-400" /> Recent Visits
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-bold">No visits recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">Page</th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground hidden md:table-cell">Device</th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Session</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-muted-foreground">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recent.map((v) => (
                        <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-bold truncate max-w-[200px]">{formatPath(v.path)}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="inline-flex items-center gap-1.5 font-bold capitalize text-xs bg-muted/40 px-2 py-1 rounded-lg">
                              <DeviceIcon device={v.deviceType} />
                              {v.deviceType || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="font-mono text-xs text-muted-foreground">
                              {v.sessionId ? v.sessionId.slice(0, 8) + '…' : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground font-bold text-xs whitespace-nowrap">
                            {timeAgo(v.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
