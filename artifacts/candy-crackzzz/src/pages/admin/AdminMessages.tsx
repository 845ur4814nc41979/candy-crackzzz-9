import { useEffect, useState } from 'react';
import { Mail, MailOpen, Archive, Trash2, RefreshCcw, Phone } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  apiListMessages,
  apiSetMessageRead,
  apiSetMessageArchived,
  apiDeleteMessage,
  type MessageRecord,
} from '@/lib/api';

export default function AdminMessages() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await apiListMessages(includeArchived);
      setMessages(result.messages);
    } catch (error) {
      toast({
        title: 'Could not load messages',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const handleSelect = async (msg: MessageRecord) => {
    setActiveId(msg.id);
    if (!msg.readAt) {
      try {
        const result = await apiSetMessageRead(msg.id, true);
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? result.message : m)));
      } catch {
        // ignore
      }
    }
  };

  const handleArchive = async (msg: MessageRecord) => {
    try {
      await apiSetMessageArchived(msg.id, !msg.archivedAt);
      await reload();
    } catch (error) {
      toast({
        title: 'Could not update',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (msg: MessageRecord) => {
    if (!confirm(`Delete the message from ${msg.name}? This cannot be undone.`)) return;
    try {
      await apiDeleteMessage(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      if (activeId === msg.id) setActiveId(null);
    } catch (error) {
      toast({
        title: 'Could not delete',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const active = messages.find((m) => m.id === activeId) ?? null;
  const unreadCount = messages.filter((m) => !m.readAt && !m.archivedAt).length;

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Messages</h1>
          <p className="text-muted-foreground font-bold">
            Customer messages from the contact form. {unreadCount > 0 && `${unreadCount} unread.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="font-bold uppercase"
            onClick={() => setIncludeArchived((v) => !v)}
          >
            <Archive className="w-4 h-4 mr-2" />
            {includeArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          <Button variant="secondary" className="font-bold uppercase" onClick={() => reload(true)}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border lg:col-span-1">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-black uppercase tracking-wider text-lg">Inbox</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground font-bold">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-bold">
                No messages yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg)}
                    className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${
                      activeId === msg.id ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {msg.readAt ? (
                          <MailOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Mail className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span className={`truncate ${msg.readAt ? 'font-bold' : 'font-black'}`}>
                          {msg.name}
                        </span>
                      </div>
                      {msg.archivedAt && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-bold text-muted-foreground truncate">
                      {msg.subject || msg.message.slice(0, 60)}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          {active ? (
            <>
              <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
                <CardTitle className="font-black uppercase tracking-wider text-lg truncate">
                  {active.subject || `Message from ${active.name}`}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold uppercase"
                    onClick={() => handleArchive(active)}
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    {active.archivedAt ? 'Unarchive' : 'Archive'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="font-bold uppercase"
                    onClick={() => handleDelete(active)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">From</div>
                    <div>{active.name}</div>
                  </div>
                  {active.email && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</div>
                      <a className="text-primary hover:underline" href={`mailto:${active.email}`}>
                        {active.email}
                      </a>
                    </div>
                  )}
                  {active.phone && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Phone</div>
                      <a className="text-primary hover:underline" href={`tel:${active.phone}`}>
                        {active.phone}
                      </a>
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Received</div>
                    <div>{new Date(active.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-2xl p-5 whitespace-pre-wrap font-medium leading-relaxed">
                  {active.message}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {active.email && (
                    <Button asChild className="font-bold uppercase">
                      <a href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject || 'Your message')}`}>
                        <Mail className="w-4 h-4 mr-2" /> Reply by Email
                      </a>
                    </Button>
                  )}
                  {active.phone && (
                    <Button asChild variant="secondary" className="font-bold uppercase">
                      <a href={`sms:${active.phone}`}>
                        <Phone className="w-4 h-4 mr-2" /> Text Customer
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-12 text-center text-muted-foreground font-bold">
              Select a message to view details.
            </CardContent>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
