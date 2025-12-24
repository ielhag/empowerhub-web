'use client';

import { useEffect, useRef } from 'react';
import { LocationTrack } from '@/types';

interface LocationMapProps {
  tracks: LocationTrack[];
  clientAddress?: {
    latitude?: number;
    longitude?: number;
    full_address?: string;
  };
  className?: string;
}

// Dynamic import to avoid SSR issues
let L: typeof import('leaflet') | null = null;

export function LocationMap({ tracks, clientAddress, className = '' }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const pathRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    // Dynamic import of leaflet on client side only
    const initMap = async () => {
      if (typeof window === 'undefined' || !mapRef.current) return;

      // Import Leaflet dynamically
      const leaflet = await import('leaflet');
      L = leaflet.default;

      // Import leaflet CSS - ignore type error for CSS import
      // @ts-expect-error CSS import has no types
      await import('leaflet/dist/leaflet.css');

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet internal hack for icon URLs
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // Initialize map if not already done
      if (!mapInstanceRef.current) {
        // Calculate center point
        let center: [number, number] = [47.6062, -122.3321]; // Seattle default

        if (tracks.length > 0) {
          const firstTrack = tracks[0];
          center = [firstTrack.latitude, firstTrack.longitude];
        } else if (clientAddress?.latitude && clientAddress?.longitude) {
          center = [clientAddress.latitude, clientAddress.longitude];
        }

        mapInstanceRef.current = L.map(mapRef.current).setView(center, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
      }

      updateMapContent();
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && L) {
      updateMapContent();
    }
  }, [tracks, clientAddress]);

  const updateMapContent = () => {
    if (!mapInstanceRef.current || !L) return;

    const map = mapInstanceRef.current;
    const leaflet = L; // Local reference to avoid null checks

    // Clear existing markers and path
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (pathRef.current) {
      pathRef.current.remove();
      pathRef.current = null;
    }

    // Create custom icons
    const startIcon = leaflet.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const endIcon = leaflet.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const trackIcon = leaflet.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #8b5cf6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const clientIcon = leaflet.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const bounds: [number, number][] = [];

    // Add client address marker
    if (clientAddress?.latitude && clientAddress?.longitude) {
      const marker = leaflet.marker([clientAddress.latitude, clientAddress.longitude], { icon: clientIcon })
        .addTo(map)
        .bindPopup(`<strong>Client Location</strong><br/>${clientAddress.full_address || 'Appointment location'}`);
      markersRef.current.push(marker);
      bounds.push([clientAddress.latitude, clientAddress.longitude]);
    }

    // Add track markers and path
    if (tracks.length > 0) {
      const pathCoords: [number, number][] = [];

      tracks.forEach((track, index) => {
        const isFirst = index === 0;
        const isLast = index === tracks.length - 1;

        const icon = isFirst ? startIcon : isLast ? endIcon : trackIcon;
        const label = isFirst ? 'Start' : isLast ? 'End' : `Point ${index + 1}`;

        const marker = leaflet.marker([track.latitude, track.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <strong>${label}</strong><br/>
            Time: ${track.captured_at ? new Date(track.captured_at).toLocaleTimeString() : 'N/A'}<br/>
            ${track.accuracy ? `Accuracy: ±${Math.round(track.accuracy)}m` : ''}
            ${track.address ? `<br/>${track.address}` : ''}
          `);
        markersRef.current.push(marker);

        pathCoords.push([track.latitude, track.longitude]);
        bounds.push([track.latitude, track.longitude]);
      });

      // Draw path line
      if (pathCoords.length > 1) {
        pathRef.current = leaflet.polyline(pathCoords, {
          color: '#8b5cf6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 5',
        }).addTo(map);
      }
    }

    // Fit bounds if we have points
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  return (
    <div
      ref={mapRef}
      className={`w-full h-[400px] rounded-lg border-2 border-gray-300 dark:border-gray-600 ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}

export default LocationMap;
