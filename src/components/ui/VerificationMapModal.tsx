'use client';

import { useEffect, useRef } from 'react';
import { X, MapPin, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface VerificationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentAddress?: {
    latitude?: number;
    longitude?: number;
    full_address?: string;
  };
  history: {
    action?: string;
    location_latitude?: number;
    location_longitude?: number;
    verification_distance?: number;
    location_distance?: number;
    timestamp?: string;
    by_user_name?: string;
    team_name?: string;
  };
}

// Dynamic import to avoid SSR issues
let L: typeof import('leaflet') | null = null;

export function VerificationMapModal({
  isOpen,
  onClose,
  appointmentAddress,
  history,
}: VerificationMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapRef.current) return;

      // Import Leaflet dynamically
      const leaflet = await import('leaflet');
      L = leaflet.default;

      // Import leaflet CSS - ignore type error for CSS import
      // @ts-ignore
      await import('leaflet/dist/leaflet.css');

      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const expectedLat = appointmentAddress?.latitude;
      const expectedLng = appointmentAddress?.longitude;
      const actualLat = history.location_latitude;
      const actualLng = history.location_longitude;

      if (!expectedLat || !expectedLng || !actualLat || !actualLng) {
        console.error('Missing location data for verification map');
        return;
      }

      // Calculate center between expected and actual locations
      const centerLat = (expectedLat + actualLat) / 2;
      const centerLng = (expectedLng + actualLng) / 2;

      // Create map
      mapInstanceRef.current = L.map(mapRef.current).setView([centerLat, centerLng], 16);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      // Expected location (appointment address) - Red marker
      const expectedMarker = L.circleMarker(
        [expectedLat, expectedLng],
        {
          radius: 12,
          fillColor: '#ef4444',
          color: '#dc2626',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.7,
        }
      ).addTo(mapInstanceRef.current);

      expectedMarker.bindPopup(`
        <div class="text-sm p-1">
          <strong class="text-red-600">Expected Location</strong><br>
          <span class="text-gray-600">${appointmentAddress?.full_address || 'Appointment Address'}</span>
        </div>
      `);

      // Actual location - Green marker
      const actualMarker = L.circleMarker(
        [actualLat, actualLng],
        {
          radius: 12,
          fillColor: '#22c55e',
          color: '#16a34a',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.7,
        }
      ).addTo(mapInstanceRef.current);

      actualMarker.bindPopup(`
        <div class="text-sm p-1">
          <strong class="text-green-600">Actual ${history.action === 'completed' ? 'Completion' : 'Start'} Location</strong><br>
          <span class="text-gray-600">${history.by_user_name || history.team_name || 'Staff'} ${history.action || 'checked in'} here</span>
        </div>
      `);

      // Draw line between points
      L.polyline(
        [
          [expectedLat, expectedLng],
          [actualLat, actualLng],
        ],
        {
          color: '#8b5cf6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 10',
        }
      ).addTo(mapInstanceRef.current);

      // Fit bounds to show both markers
      const bounds = L.latLngBounds([
        [expectedLat, expectedLng],
        [actualLat, actualLng],
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });

      // Force map to resize after animation
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, appointmentAddress, history]);

  if (!isOpen) return null;

  const distanceFeet = Math.round((history.verification_distance || history.location_distance || 0) * 3.28084);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Location Verification Map
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {history.action === 'completed' ? 'Completion' : 'Start'} verification for{' '}
                {history.by_user_name || history.team_name || 'Staff'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Info Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Expected Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Actual Location</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Distance: <strong className="text-gray-900 dark:text-gray-100">{distanceFeet.toLocaleString()} ft</strong>
              </span>
            </div>
            {history.timestamp && (
              <div className="text-gray-500 dark:text-gray-400">
                {formatDate(history.timestamp, 'MMM d, yyyy h:mm a')}
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div
          ref={mapRef}
          className="w-full h-[400px]"
          style={{ zIndex: 1 }}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerificationMapModal;
