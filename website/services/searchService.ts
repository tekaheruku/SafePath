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
