import Fuse from 'fuse.js';
import landmarks from '../data/landmarks.json';

export interface LocalLandmark {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
}

const fuse = new Fuse(landmarks, {
  keys: ['name', 'type', 'description'],
  threshold: 0.35,
  includeScore: true,
});

export const searchLocal = (query: string): LocalLandmark[] => {
  if (!query) return [];
  const results = fuse.search(query);
  return results.map(r => r.item as LocalLandmark);
};

export const searchGlobal = async (query: string): Promise<any[]> => {
  // Bounding box for Iba, Zambales
  const viewbox = "119.92,15.41,120.18,15.30";
  const baseParams = `format=json&viewbox=${viewbox}&bounded=1&limit=5&addressdetails=1`;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${baseParams}&q=${encodeURIComponent(query)}`);
    return await response.json();
  } catch (err) {
    console.error('Nominatim search failed:', err);
    return [];
  }
};

/**
 * Reverse-geocode a coordinate into a short, human-readable label (e.g.
 * "J. P. Rizal Street, Palanginan"). Used when a Directions start/destination
 * point is picked by clicking the map, where all we have is a lat/lng — without
 * this the field just showed the raw coordinate pair, which read as broken.
 * Returns null on failure so callers can fall back to a coordinate label.
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    if (!data || data.error) return null;

    const addr = data.address || {};
    const primary: string | undefined = data.name || addr.road || addr.pedestrian || addr.amenity;
    const secondary: string | undefined =
      addr.quarter || addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.city;

    if (primary && secondary && primary !== secondary) return `${primary}, ${secondary}`;
    if (primary) return primary;
    if (secondary) return secondary;

    // Fall back to the first two segments of the full address string.
    if (typeof data.display_name === 'string') {
      const short = data.display_name.split(',').slice(0, 2).join(',').trim();
      if (short) return short;
    }
    return null;
  } catch (err) {
    console.error('Nominatim reverse geocode failed:', err);
    return null;
  }
};
