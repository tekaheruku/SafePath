'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSuggestionSelect: (suggestion: any) => void;
  onSearch: (query: string) => Promise<void>;
  isSearching: boolean;
  selectionMode: 'report' | 'rating' | null;
  boundaryPolygon?: [number, number][]; // Actual Iba boundary for strict geofencing
}

// Simple Ray Casting algorithm for strict geofencing
const isPointInPolygon = (lat: number, lon: number, polygon: [number, number][]) => {
  if (!polygon || polygon.length === 0) return true;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSuggestionSelect, 
  onSearch, 
  isSearching,
  selectionMode,
  boundaryPolygon = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [localData, setLocalData] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load Iba Local Locations Data once on mount
  useEffect(() => {
    fetch('/data/iba_locations.json')
      .then(res => res.json())
      .then(data => setLocalData(data))
      .catch(err => console.error('Failed to load local Iba data:', err));
  }, []);

  // Instant Local Search Logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Perform instant filtering on local data
    const filtered = localData
      .filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const addressMatch = item.address.toLowerCase().includes(query);
        const typeMatch = item.type.toLowerCase().includes(query);
        return nameMatch || addressMatch || typeMatch;
      })
      .map(item => {
        // Calculate a simple relevance score for sorting
        let score = 0;
        const nameLower = item.name.toLowerCase();
        if (nameLower === query) score += 100;
        if (nameLower.startsWith(query)) score += 50;
        if (nameLower.includes(query)) score += 10;
        
        return {
          lat: item.lat,
          lon: item.lon,
          display_name: `${item.name}, ${item.address}`,
          name: item.name,
          type: item.type,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [searchQuery, localData]);

  // Click Outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch(searchQuery);
  };

  const handleItemSelect = (suggestion: any) => {
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSuggestionSelect(suggestion);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[340px] px-4">
      {selectionMode ? (
        <div className="w-full bg-blue-600/90 text-theme-fg px-6 py-2.5 rounded-full font-bold shadow-2xl backdrop-blur-md text-center text-xs border border-white/20 whitespace-nowrap animate-in fade-in zoom-in duration-300">
          📍 Click on the map to select location
        </div>
      ) : (
        <div ref={searchContainerRef} className="relative group hidden md:block">
          <form onSubmit={handleFormSubmit} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-fg-muted">
              {isFetching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowSuggestions(false);
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local locations..."
              className="w-full glass-panel bg-theme-panel/60 text-theme-fg pl-10 pr-20 py-2.5 rounded-full text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border-theme-border group-hover:border-white/20 shadow-2xl"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full text-theme-fg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-theme-fg transition-colors disabled:opacity-50 shadow-lg"
              >
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass-panel bg-theme-panel/90 backdrop-blur-xl border border-theme-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-75">
              <div className="py-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                {suggestions.map((s, index) => (
                  <button
                    key={index}
                    onClick={() => handleItemSelect(s)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left group/item border-b border-white/5 last:border-0"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover/item:bg-indigo-500 group-hover/item:text-white transition-all duration-200">
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-theme-fg line-clamp-1 uppercase tracking-tight">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-theme-fg-muted line-clamp-1 mt-0.5">
                        {s.display_name.split(',').slice(1).join(',').trim()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 bg-theme-panel/50 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] text-theme-fg-muted font-medium italic">Powered by Komoot Photon</span>
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{suggestions.length} results</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
