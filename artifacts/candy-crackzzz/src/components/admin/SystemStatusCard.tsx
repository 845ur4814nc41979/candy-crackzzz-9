import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Database, Mail, Phone, KeyRound, Send, Sparkles, MapPin, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiGetStatus, apiTestEmail, apiTestSms, type SystemStatus } from '@/lib/api';

function StatusRow({
  icon,
  label,
  ok,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          ok ? 'bg-green-500/15 text-green-500' : 'bg-amber-500/15 text-amber-500'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{label}</span>
          {ok ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          )}
        </div>
        {detail && <div className="text-xs text-muted-foreground font-bold mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

export default function SystemStatusCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'email' | 'sms' | null>(null);

  const load = async () => {
    try {
      const result = await apiGetStatus();
      setStatus(result);
    } catch (error) {
      toast({
        title: 'Could not load status',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleTestEmail = async () => {
    setBusy('email');
    try {
      const result = await apiTestEmail();
      toast({
        title: result.ok ? 'Email sent' : 'Email not sent',
        description: result.ok
          ? 'Check the destination inbox.'
          : result.result?.reason ?? 'No provider configured.',
        variant: result.ok ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Email test failed',
        description: error instanceof Error ? error.message : 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleTestSms = async () => {
    setBusy('sms');
    try {
      const result = await apiTestSms();
      toast({
        title: result.ok ? 'SMS sent' : 'SMS not sent',
        description: result.ok
          ? 'Check the destination phone.'
          : result.result?.reason ?? 'No provider configured.',
        variant: result.ok ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'SMS test failed',
        description: error instanceof Error ? error.message : 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="font-black uppercase tracking-wider text-lg">System Health</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {loading || !status ? (
          <div className="text-sm font-bold text-muted-foreground">Checking services...</div>
        ) : (
          <>
            <StatusRow
              icon={<Database className="w-4 h-4" />}
              label="Database"
              ok={status.database.connected}
              detail={
                status.database.connected
                  ? `Connected (${status.database.kind})`
                  : 'Using temporary file storage. Set DATABASE_URL to make data durable.'
              }
            />
            <StatusRow
              icon={<KeyRound className="w-4 h-4" />}
              label="Admin secrets"
              ok={
                status.session.sessionSecretConfigured &&
                status.session.adminUsernameConfigured &&
                status.session.adminPasswordConfigured
              }
              detail={
                [
                  status.session.sessionSecretConfigured ? null : 'SESSION_SECRET',
                  status.session.adminUsernameConfigured ? null : 'ADMIN_USERNAME',
                  status.session.adminPasswordConfigured ? null : 'ADMIN_PASSWORD',
                ]
                  .filter(Boolean)
                  .join(', ') || 'All admin secrets are set.'
              }
            />
            <StatusRow
              icon={<Mail className="w-4 h-4" />}
              label="Email alerts (Resend)"
              ok={status.email.configured}
              detail={
                status.email.configured
                  ? 'Ready to send order and message alerts.'
                  : `Missing: ${status.email.missing.join(', ') || 'none'}`
              }
            />
            <StatusRow
              icon={<Phone className="w-4 h-4" />}
              label="SMS alerts (Twilio)"
              ok={status.sms.configured}
              detail={
                status.sms.configured
                  ? 'Ready to text on new orders and messages.'
                  : `Missing: ${status.sms.missing.join(', ') || 'none'}`
              }
            />

            {status.providers && (
              <>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground pt-3">
                  Future API Readiness
                </div>
                {status.providers.openai && (
                  <StatusRow
                    icon={<Sparkles className="w-4 h-4" />}
                    label="OpenAI (smart writing)"
                    ok={status.providers.openai.configured}
                    detail={
                      status.providers.openai.configured
                        ? status.providers.openai.purpose ?? 'Configured.'
                        : `Optional. Add ${status.providers.openai.missing.join(', ')} to enable.`
                    }
                  />
                )}
                {status.providers.googleMaps && (
                  <StatusRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="Google Maps"
                    ok={status.providers.googleMaps.configured}
                    detail={
                      status.providers.googleMaps.configured
                        ? status.providers.googleMaps.purpose ?? 'Configured.'
                        : `Optional. Add ${status.providers.googleMaps.missing.join(', ')} to enable.`
                    }
                  />
                )}
                {status.providers.push && (
                  <StatusRow
                    icon={<Bell className="w-4 h-4" />}
                    label="Push notifications"
                    ok={status.providers.push.configured}
                    detail={
                      status.providers.push.configured
                        ? status.providers.push.purpose ?? 'Configured.'
                        : `Optional. Add ${status.providers.push.missing.join(', ')} to enable.`
                    }
                  />
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="font-bold uppercase"
                onClick={handleTestEmail}
                disabled={busy === 'email'}
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                {busy === 'email' ? 'Sending…' : 'Test Email'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-bold uppercase"
                onClick={handleTestSms}
                disabled={busy === 'sms'}
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                {busy === 'sms' ? 'Sending…' : 'Test SMS'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
