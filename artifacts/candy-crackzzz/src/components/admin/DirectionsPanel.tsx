import { useState } from 'react';
import { MapPin, Navigation, Clock, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiDirections, type DirectionsApiResponse } from '@/lib/api';
import {
  getCurrentPosition,
  geolocationErrorMessage,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  hasUsableAddress,
} from '@/lib/directions';

interface DirectionsPanelProps {
  deliveryAddress: string;
  businessAddress: string;
  orderId: string;
}

type PanelStatus = 'idle' | 'requesting-location' | 'calculating' | 'done' | 'error';

export default function DirectionsPanel({
  deliveryAddress,
  businessAddress,
  orderId,
}: DirectionsPanelProps) {
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [result, setResult] = useState<DirectionsApiResponse | null>(null);
  const [locationWarning, setLocationWarning] = useState<string>('');

  const hasAddress = hasUsableAddress(deliveryAddress);
  const hasBusiness = hasUsableAddress(businessAddress);

  const staticMapsUrl = hasAddress && hasBusiness
    ? buildGoogleMapsDirectionsUrl(businessAddress, deliveryAddress)
    : hasAddress
      ? buildGoogleMapsSearchUrl(deliveryAddress)
      : '';

  const handleUseCurrentLocation = async () => {
    if (!hasAddress) return;
    setLocationWarning('');
    setResult(null);
    setStatus('requesting-location');

    let originCoords: string | null = null;

    try {
      const pos = await getCurrentPosition();
      originCoords = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (err) {
      const msg = err instanceof GeolocationPositionError
        ? geolocationErrorMessage(err)
        : 'Could not get your location. Using store address as fallback.';
      setLocationWarning(msg);

      if (!hasBusiness) {
        setStatus('error');
        setResult({
          ok: false,
          message: msg + ' No store address configured either.',
          mapsUrl: hasAddress ? buildGoogleMapsSearchUrl(deliveryAddress) : undefined,
        });
        return;
      }
    }

    setStatus('calculating');

    try {
      const payload = originCoords
        ? { origin: originCoords, destination: deliveryAddress }
        : { originAddress: businessAddress, destination: deliveryAddress };

      const res = await apiDirections(payload);
      setResult(res);
      setStatus('done');
    } catch {
      setStatus('error');
      setResult({
        ok: false,
        message: 'Could not reach the directions service.',
        mapsUrl: staticMapsUrl || undefined,
      });
    }
  };

  const isLoading = status === 'requesting-location' || status === 'calculating';

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {staticMapsUrl && (
          <a
            href={result?.mapsUrl ?? staticMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`link-open-maps-${orderId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider hover:bg-primary/20 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            Open in Google Maps
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {hasAddress && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={handleUseCurrentLocation}
            data-testid={`button-current-location-${orderId}`}
            className="text-xs font-black uppercase tracking-wider h-8 px-3"
          >
            {status === 'requesting-location' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Getting Location…</>
            ) : status === 'calculating' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Calculating…</>
            ) : (
              <><Navigation className="w-3.5 h-3.5 mr-1.5" /> Use My Location</>
            )}
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Your location is only used to calculate directions after you tap the button.
      </p>

      {locationWarning && (
        <div className="flex items-start gap-1.5 text-xs text-amber-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{locationWarning}</span>
        </div>
      )}

      {status === 'done' && result && (
        <div className="bg-background/70 border border-border rounded-xl p-3 space-y-2">
          {result.ok && result.durationText && (
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1.5 font-black">
                <Clock className="w-4 h-4 text-primary" />
                {result.durationText}
              </div>
              {result.distanceText && (
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {result.distanceText}
                </div>
              )}
            </div>
          )}
          {!result.ok && result.message && (
            <p className="text-xs text-muted-foreground">{result.message}</p>
          )}
          {result.mapsUrl && (
            <a
              href={result.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-xs font-black uppercase tracking-wider hover:underline"
            >
              Open Directions in Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {result.originUsed && (
            <p className="text-[10px] text-muted-foreground">
              Origin: {result.originUsed === 'current_location' ? 'your current location' : 'store address'}
            </p>
          )}
        </div>
      )}

      {status === 'error' && result && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1.5">
          <p className="text-xs text-destructive font-bold">{result.message}</p>
          {result.mapsUrl && (
            <a
              href={result.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-xs font-black uppercase tracking-wider hover:underline"
            >
              Open in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
