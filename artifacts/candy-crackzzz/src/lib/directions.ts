export interface DirectionsResult {
  ok: boolean;
  distanceText?: string;
  distanceMeters?: number;
  durationText?: string;
  durationSeconds?: number;
  originUsed?: 'current_location' | 'business_address';
  mapsUrl?: string;
  provider?: string;
  message?: string;
}

export type DirectionsStatus =
  | 'idle'
  | 'requesting-location'
  | 'calculating'
  | 'done'
  | 'error';

export function formatAddressForMaps(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}

export function hasUsableAddress(address: string): boolean {
  return formatAddressForMaps(address).length > 4;
}

export function buildGoogleMapsDirectionsUrl(
  originAddress: string,
  destinationAddress: string,
): string {
  const origin = encodeURIComponent(formatAddressForMaps(originAddress));
  const destination = encodeURIComponent(formatAddressForMaps(destinationAddress));
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

export function buildGoogleMapsDirectionsUrlFromCoords(
  lat: number,
  lng: number,
  destinationAddress: string,
): string {
  const origin = encodeURIComponent(`${lat},${lng}`);
  const destination = encodeURIComponent(formatAddressForMaps(destinationAddress));
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

export function buildGoogleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddressForMaps(address))}`;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission was denied. Using store address as fallback.';
    case err.POSITION_UNAVAILABLE:
      return 'Location unavailable on this device. Using store address as fallback.';
    case err.TIMEOUT:
      return 'Location request timed out. Using store address as fallback.';
    default:
      return 'Could not get your location. Using store address as fallback.';
  }
}
