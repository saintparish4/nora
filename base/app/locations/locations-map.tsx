'use client';

import { useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

interface Location {
  id: string;
  lat: number;
  lng: number;
  markerLabel: string;
  markerStyle: string;
  name: string;
}

interface LocationsMapProps {
  locations: Location[];
  activeId: string;
  onSelectLocation: (id: string) => void;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

// Center on continental US; fitBounds adjusts on load
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 4;

export default function LocationsMap({
  locations,
  activeId,
  onSelectLocation,
}: LocationsMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      // Fit bounds so all markers are visible on initial load
      if (locations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        locations.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
        map.fitBounds(bounds, 60); // 60px padding
      }
    },
    [locations],
  );

  // Pan and zoom to active facility when selection changes
  const ZOOM_ON_SELECT = 13; // neighborhood snapshot: facility + surrounding area
  useEffect(() => {
    if (!mapRef.current) return;
    const active = locations.find((l) => l.id === activeId);
    if (active) {
      mapRef.current.panTo({ lat: active.lat, lng: active.lng });
      mapRef.current.setZoom(ZOOM_ON_SELECT);
    }
  }, [activeId, locations]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f0f0f5]">
        <div className="flex flex-col items-center gap-3 opacity-60">
          <div className="w-8 h-8 border-2 border-[var(--ink-color)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading map&hellip;</span>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      onLoad={onLoad}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          // Subtle, muted style that fits the page's aesthetic
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
          {
            featureType: 'administrative.land_parcel',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#bdbdbd' }],
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#eeeeee' }],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#757575' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#e5e5e5' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9e9e9e' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#ffffff' }],
          },
          {
            featureType: 'road.arterial',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#757575' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#dadada' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#616161' }],
          },
          {
            featureType: 'transit.line',
            elementType: 'geometry',
            stylers: [{ color: '#e5e5e5' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9c9c9' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9e9e9e' }],
          },
        ],
      }}
    >
      {locations.map((loc) => (
        <MarkerF
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          label={{
            text: loc.markerLabel,
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '600',
          }}
          title={loc.name}
          onClick={() => onSelectLocation(loc.id)}
        />
      ))}
    </GoogleMap>
  );
}
