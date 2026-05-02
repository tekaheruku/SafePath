'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { IBA_POLYGON, isPointInPolygon } from '@safepath/shared';
import LoginModal from './LoginModal';

interface RatingCategory {
  id: string;
  name: string;
}

interface SeverityLevel {
  id: string;
  name: string;
  level: number;
  color_code: string;
}

function SeverityButtons({ label, value, onChange, levels }: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  levels: SeverityLevel[];
}) {
  const currentLevel = levels.find(l => l.level === value);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-theme-panel/30 border border-theme-border/50">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">{label}</label>
        <span className="text-xs font-bold text-theme-fg-muted uppercase tracking-tight">
          {currentLevel?.name || 'Select'}
        </span>
      </div>
      <div className="flex gap-2">
        {levels.map((level) => {
          const isSelected = value === level.level;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onChange(level.level)}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all duration-200 ${
                isSelected 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30 scale-105' 
                  : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              {level.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const StreetRatingForm: React.FC<{
  location: { lat: number; lng: number };
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ location, onSuccess, onCancel }) => {
  const [categories, setCategories] = useState<RatingCategory[]>([]);
  const [severityLevels, setSeverityLevels] = useState<SeverityLevel[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, sevRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/rating-categories`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/severity-levels`)
        ]);
        
        setCategories(catRes.data);
        setSeverityLevels(sevRes.data.sort((a: any, b: any) => a.level - b.level));
        
        const initialScores: Record<string, number> = {};
        catRes.data.forEach((cat: any) => {
          initialScores[cat.id] = 1; // Default to first level (Minor)
        });
        setScores(initialScores);
      } catch (err) {
        console.error('Failed to fetch rating data:', err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    if (!isPointInPolygon([location.lat, location.lng], IBA_POLYGON)) {
      alert('Selected location is outside the supported area (Iba, Zambales).');
      return;
    }

    try {
      setIsSubmitting(true);
      setIsUploading(true);
      let photo_url = null;

      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/upload`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        photo_url = uploadRes.data.url;
      }

      // Map scores to backend expectations. 
      // The backend expects specific columns like lighting_score, pedestrian_safety_score, etc.
      // But we should ideally update the backend to be generic too.
      // For now, I'll map based on category names.
      const payload: any = {
        comment,
        photo_url,
        location: { latitude: location.lat, longitude: location.lng }
      };

      categories.forEach(cat => {
        const score = scores[cat.id];
        if (cat.name.includes('Lighting')) payload.lighting_score = score;
        else if (cat.name.includes('Pedestrian')) payload.pedestrian_safety_score = score;
        else if (cat.name.includes('Driver')) payload.driver_safety_score = score;
        else if (cat.name.includes('Overall')) payload.overall_safety_score = score;
      });

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/streets/ratings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSuccess();
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 glass-panel rounded-2xl space-y-6 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        message="Please sign in to submit a rating."
      />

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Road Safety Assessment</h2>
          <p className="text-[10px] font-bold text-theme-fg-muted mt-1 uppercase tracking-widest">📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
        </div>
        <button onClick={onCancel} className="text-theme-fg-muted hover:text-theme-fg transition-colors">
          <span className="text-2xl">✕</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {categories.map(cat => (
            <SeverityButtons
              key={cat.id}
              label={cat.name}
              levels={severityLevels}
              value={scores[cat.id] || 1}
              onChange={(val) => setScores(prev => ({ ...prev, [cat.id]: val }))}
            />
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Observations</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-theme-panel border border-theme-border rounded-xl p-3 text-theme-fg placeholder-slate-500 h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm transition-all"
            placeholder="What should others know about this spot?"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">Street Photo</label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-theme-border rounded-2xl cursor-pointer hover:bg-theme-panel/40 hover:border-indigo-500/50 transition-all group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{photoFile ? '📸' : '➕'}</span>
              <p className="text-xs text-theme-fg-muted font-bold uppercase tracking-wider">
                {photoFile ? photoFile.name : 'Take or upload a photo'}
              </p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button" onClick={onCancel}
            className="flex-1 py-4 rounded-xl bg-theme-panel hover:bg-theme-border font-bold transition-all text-theme-fg text-sm border border-theme-border"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={isSubmitting || isUploading}
            className="flex-[2] py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-theme-fg text-sm active:scale-[0.98]"
          >
            {isSubmitting || isUploading ? 'Submitting...' : 'Complete Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StreetRatingForm;
