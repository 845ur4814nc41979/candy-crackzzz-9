import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Truck, MapPin, Phone, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { OrderRequest, OrderStatus } from '@/types';
import { hasUsableAddress } from '@/lib/directions';
import { userHasPermission } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import DirectionsPanel from '@/components/admin/DirectionsPanel';

type DeliveryFilter = 'active' | 'in-progress' | 'delivered' | 'all';

const FILTER_LABEL: Record<DeliveryFilter, string> = {
  active: 'Active',
  'in-progress': 'Out for Delivery',
  delivered: 'Delivered',
  all: 'All',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  new: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ready: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'picked-up': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New',
  pending: 'Pending',
  confirmed: 'Confirmed',
  ready: 'Ready for Driver',
  'picked-up': 'Out for Delivery',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

function matchesFilter(filter: DeliveryFilter, order: OrderRequest): boolean {
  if (filter === 'all') return true;
  if (filter === 'delivered') return order.status === 'completed';
  if (filter === 'in-progress') return order.status === 'picked-up';
  // active = anything not delivered or cancelled
  return order.status !== 'completed' && order.status !== 'cancelled';
}

export default function AdminDeliveries() {
  const { orders, setOrders, settings } = useAppContext();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<DeliveryFilter>('active');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const canManage = userHasPermission(currentUser, 'manageOrders');

  const deliveryOrders = useMemo(
    () =>
      orders
        .filter(order => order.pickupOrDelivery === 'delivery')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );

  const filteredDeliveries = useMemo(
    () => deliveryOrders.filter(order => matchesFilter(filter, order)),
    [deliveryOrders, filter],
  );

  const counts = useMemo(
    () => ({
      active: deliveryOrders.filter(order => matchesFilter('active', order)).length,
      'in-progress': deliveryOrders.filter(order => matchesFilter('in-progress', order)).length,
      delivered: deliveryOrders.filter(order => matchesFilter('delivered', order)).length,
      all: deliveryOrders.length,
    }),
    [deliveryOrders],
  );

  const setStatus = (order: OrderRequest, newStatus: OrderStatus, label: string) => {
    if (!canManage) {
      toast({
        title: 'View only',
        description: 'You do not have permission to update delivery status.',
        variant: 'destructive',
      });
      return;
    }
    setOrders(prev =>
      prev.map(o => (o.id === order.id ? { ...o, status: newStatus } : o)),
    );
    toast({ title: `Order marked ${label}.` });
  };

  const saveNote = (order: OrderRequest) => {
    if (!canManage) return;
    const draft = (noteDrafts[order.id] ?? order.notes ?? '').trim();
    setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, notes: draft } : o)));
    toast({ title: 'Driver note saved.' });
  };

  const businessAddress = (settings.serviceArea || settings.businessName || '').trim();

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-1 flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" /> Deliveries
          </h1>
          <p className="text-muted-foreground font-bold">
            {deliveryOrders.length} total delivery order{deliveryOrders.length === 1 ? '' : 's'}.
            {!canManage && ' (Read-only — drivers can update status, owners can edit everything.)'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(FILTER_LABEL) as DeliveryFilter[]).map(value => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            data-testid={`button-deliveries-filter-${value}`}
            className={`px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider border transition-colors ${
              filter === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {FILTER_LABEL[value]} ({counts[value]})
          </button>
        ))}
      </div>

      {filteredDeliveries.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground font-bold text-lg">No delivery orders in this filter.</p>
          <p className="text-sm text-muted-foreground mt-2">
            New delivery orders submitted by customers will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map(order => {
            const address = (order.deliveryAddress || '').trim();
            const hasAddress = hasUsableAddress(address);
            const noteValue = noteDrafts[order.id] ?? order.notes ?? '';

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm"
                data-testid={`card-delivery-${order.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="font-black text-lg">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      Order {order.id}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${STATUS_BADGE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-bold">{hasAddress ? address : 'No address provided'}</div>
                        {hasAddress && (
                          <DirectionsPanel
                            deliveryAddress={address}
                            businessAddress={businessAddress}
                            orderId={order.id}
                          />
                        )}
                      </div>
                    </div>
                    {order.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-secondary" />
                        <a
                          href={`tel:${order.phone}`}
                          className="font-bold hover:text-primary"
                          data-testid={`link-call-customer-${order.id}`}
                        >
                          {order.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold">
                        {order.requestedDate || '—'}
                        {order.requestedTime ? ` @ ${order.requestedTime}` : ''}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-black uppercase tracking-wider text-[10px]">Total</span>{' '}
                      <span className="font-black text-foreground">${order.total.toFixed(2)}</span>
                      {order.rewardsRedemptionStatus === 'pending' && order.rewardsDiscountAmount && (
                        <span className="ml-2 text-emerald-500 font-bold">
                          (${order.rewardsDiscountAmount.toFixed(2)} reward applied)
                        </span>
                      )}
                    </div>
                    {order.specialInstructions && (
                      <div className="text-xs text-muted-foreground italic">
                        "{order.specialInstructions}"
                      </div>
                    )}
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="mt-4 bg-background/60 rounded-xl border border-border p-3 text-sm">
                    <div className="font-black uppercase tracking-wider text-[10px] text-muted-foreground mb-2">
                      Items
                    </div>
                    <ul className="space-y-1">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-item-${index}`} className="flex items-center justify-between gap-3">
                          <span className="font-bold">
                            {item.quantity}× {item.name}
                          </span>
                          {item.price !== null && item.price !== undefined && (
                            <span className="text-muted-foreground">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground" htmlFor={`note-${order.id}`}>
                    Driver Notes
                  </label>
                  <textarea
                    id={`note-${order.id}`}
                    value={noteValue}
                    onChange={e =>
                      setNoteDrafts(prev => ({ ...prev, [order.id]: e.target.value }))
                    }
                    disabled={!canManage}
                    placeholder="Gate code, parking spot, where to leave the order, etc."
                    className="w-full min-h-[64px] bg-background border border-border rounded-xl p-3 text-sm font-medium resize-none disabled:opacity-60"
                    data-testid={`textarea-driver-notes-${order.id}`}
                  />
                  {canManage && noteValue.trim() !== (order.notes ?? '').trim() && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveNote(order)}
                      className="font-black uppercase tracking-wider"
                      data-testid={`button-save-note-${order.id}`}
                    >
                      Save Note
                    </Button>
                  )}
                </div>

                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {order.status !== 'picked-up' && order.status !== 'completed' && order.status !== 'cancelled' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setStatus(order, 'picked-up', 'out for delivery')}
                        className="font-black uppercase tracking-wider"
                        data-testid={`button-set-out-${order.id}`}
                      >
                        <Truck className="w-4 h-4 mr-1" /> Mark Out for Delivery
                      </Button>
                    )}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setStatus(order, 'completed', 'delivered')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider"
                        data-testid={`button-set-delivered-${order.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Delivered
                      </Button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setStatus(order, 'cancelled', 'cancelled (delivery issue)')}
                        className="font-black uppercase tracking-wider"
                        data-testid={`button-set-issue-${order.id}`}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" /> Report Issue
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
