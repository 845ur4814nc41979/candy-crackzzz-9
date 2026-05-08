import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Users, TrendingUp, Smartphone, Monitor, Tablet, RefreshCw } from 'lucide-react';
import { apiGetAnalyticsSummary, type AnalyticsSummary } from '@/lib/api';
import { Button } from '@/components/ui/button';

function deviceIcon(device: string) {
  if (device === 'mobile') return Smartphone;
  if (device === 'tablet') return Tablet;
  return Monitor;
}

export default function SiteAnalyticsCard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetAnalyticsSummary();
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
        <CardTitle className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" /> Site Views
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="font-bold uppercase text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {error && (
          <div className="text-xs font-bold text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-2">
            {error}
          </div>
        )}
        {!summary && !error && (
          <div className="text-sm font-bold text-muted-foreground">Loading…</div>
        )}
        {summary && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black text-primary mb-1">
                  <Eye className="w-3 h-3" /> Total Views
                </div>
                <div className="text-2xl font-black">{summary.totalViews.toLocaleString()}</div>
              </div>
              <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black text-secondary mb-1">
                  <Users className="w-3 h-3" /> Visitors
                </div>
                <div className="text-2xl font-black">{summary.uniqueVisitors.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="text-[9px] uppercase tracking-wider font-black text-muted-foreground">Today</div>
                <div className="text-base font-black">{summary.viewsToday}</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="text-[9px] uppercase tracking-wider font-black text-muted-foreground">Week</div>
                <div className="text-base font-black">{summary.viewsThisWeek}</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="text-[9px] uppercase tracking-wider font-black text-muted-foreground">Month</div>
                <div className="text-base font-black">{summary.viewsThisMonth}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Top Pages
              </div>
              {summary.topPages.length === 0 ? (
                <div className="text-xs font-bold text-muted-foreground">No data yet.</div>
              ) : (
                <div className="space-y-1">
                  {summary.topPages.slice(0, 5).map((p) => (
                    <div key={p.path} className="flex items-center justify-between text-xs">
                      <span className="font-bold truncate mr-2">{p.path}</span>
                      <span className="font-black text-primary">{p.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {summary.deviceBreakdown.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-2">Devices</div>
                <div className="flex flex-wrap gap-2">
                  {summary.deviceBreakdown.slice(0, 4).map((d) => {
                    const Icon = deviceIcon(d.device);
                    return (
                      <span key={d.device} className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-muted/40 px-2 py-1 rounded-md">
                        <Icon className="w-3 h-3" /> {d.device || 'unknown'} · {d.views}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {summary.recentViews.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-black text-muted-foreground mb-2">Recent Visits</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {summary.recentViews.slice(0, 6).map((v) => (
                    <div key={v.id} className="text-[11px] flex items-center justify-between">
                      <span className="font-bold truncate mr-2">{v.path}</span>
                      <span className="text-muted-foreground font-bold shrink-0">
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
