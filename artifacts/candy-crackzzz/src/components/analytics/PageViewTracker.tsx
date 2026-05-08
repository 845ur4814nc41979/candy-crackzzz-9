import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { trackPageView } from '@/lib/analytics';

export default function PageViewTracker() {
  const [location] = useLocation();
  const { settings } = useAppContext();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (!settings?.analyticsEnabled) return;
      const path = location || '/';
      if (lastTracked.current === path) return;
      const excludeAdmin = settings.analyticsExcludeAdminRoutes ?? true;
      if (excludeAdmin && (path.startsWith('/admin') || path.startsWith('/api'))) return;
      lastTracked.current = path;
      void trackPageView({
        path,
        excludeAdminRoutes: excludeAdmin,
        retentionLimit: settings.analyticsRetentionLimit,
      }).catch(() => {});
    } catch {
    }
  }, [location, settings.analyticsEnabled, settings.analyticsExcludeAdminRoutes, settings.analyticsRetentionLimit]);

  return null;
}
