'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { IBA_POLYGON, isPointInPolygon } from '@safepath/shared';
import LoginModal from './LoginModal';
const ratingSchema = z.object({
    lighting_score: z.coerce.number().min(1).max(5).optional().nullable(),
    pedestrian_safety_score: z.coerce.number().min(1).max(5),
    driver_safety_score: z.coerce.number().min(1).max(5),
    overall_safety_score: z.coerce.number().min(1).max(5),
    comment: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
});
const RATING_LABELS = {
    1: { label: 'Very Poor', color: 'text-red-400' },
    2: { label: 'Poor', color: 'text-orange-400' },
    3: { label: 'Neutral', color: 'text-yellow-300' },
    4: { label: 'Safe', color: 'text-emerald-400' },
    5: { label: 'Very Safe', color: 'text-green-300' },
};
function getRatingInfo(val) {
    const rounded = Math.min(5, Math.max(1, Math.round(val)));
    return RATING_LABELS[rounded] ?? { label: 'Neutral', color: 'text-yellow-300' };
}
function ScoreSlider({ label, fieldName, register, watch }) {
    const val = Number(watch(fieldName)) || 3;
    const { label: ratingLabel, color } = getRatingInfo(val);
    return (<div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">{label}</label>
        <span className={`text-sm font-bold ${color}`}>{val} — {ratingLabel}</span>
      </div>
      <input type="range" min="1" max="5" step="1" {...register(fieldName)} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-400 bg-slate-600"/>
      <div className="flex justify-between text-[11px] text-slate-400 select-none font-medium px-0.5">
        <span>1 · Very Poor</span>
        <span>3 · Neutral</span>
        <span>5 · Very Safe</span>
      </div>
    </div>);
}
const StreetRatingForm = ({ location, onSuccess, onCancel }) => {
    const [rateLighting, setRateLighting] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const { token } = useAuth();
    const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
        resolver: zodResolver(ratingSchema),
        defaultValues: {
            latitude: location.lat,
            longitude: location.lng,
            lighting_score: 3,
            pedestrian_safety_score: 3,
            driver_safety_score: 3,
            overall_safety_score: 3,
        }
    });
    const onSubmit = async (data) => {
        if (!token) {
            setShowLoginModal(true);
            return;
        }
        // Boundary Check
        if (!isPointInPolygon([data.latitude, data.longitude], IBA_POLYGON)) {
            alert('Selected location is outside the supported area (Iba, Zambales).');
            return;
        }
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/streets/ratings`, {
                pedestrian_safety_score: data.pedestrian_safety_score,
                driver_safety_score: data.driver_safety_score,
                overall_safety_score: data.overall_safety_score,
                lighting_score: rateLighting ? data.lighting_score : null,
                comment: data.comment,
                location: { latitude: data.latitude, longitude: data.longitude }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess();
        }
        catch (err) {
            console.error('Failed to submit rating:', err);
            if (err.response?.status === 401) {
                setShowLoginModal(true);
            }
            else {
                alert('Failed to submit rating. Please try again.');
            }
        }
    };
    return (<div className="p-6 glass-panel rounded-xl space-y-5 shadow-2xl max-w-md min-w-[320px]">
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} message="Please sign in to submit a rating."/>

      <div>
        <h2 className="text-xl font-bold text-white">Rate Street Safety</h2>
        <p className="text-xs text-slate-400 mt-1">📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-sm">

        <ScoreSlider label="Pedestrian Safety" fieldName="pedestrian_safety_score" register={register} watch={watch}/>
        <ScoreSlider label="Driver Safety" fieldName="driver_safety_score" register={register} watch={watch}/>
        <ScoreSlider label="Overall Safety" fieldName="overall_safety_score" register={register} watch={watch}/>

        {/* Lighting — optional toggle */}
        <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-3 space-y-3">
          <button type="button" onClick={() => setRateLighting(v => !v)} className={`w-full flex items-center justify-between text-sm font-semibold transition-colors ${rateLighting ? 'text-yellow-300' : 'text-slate-300'}`}>
            <span className="flex items-center gap-2">
              <span>💡</span>
              <span>Rate Lighting</span>
              <span className="text-xs font-normal text-slate-400">(night-time only)</span>
            </span>
            <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${rateLighting ? 'bg-yellow-500' : 'bg-slate-600'}`}>
              <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${rateLighting ? 'translate-x-4' : 'translate-x-0'}`}/>
            </span>
          </button>

          {rateLighting && (<ScoreSlider label="Lighting" fieldName="lighting_score" register={register} watch={watch}/>)}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Comment <span className="normal-case text-slate-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea {...register('comment')} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white placeholder-slate-500 h-20 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm" placeholder="Any specific observations?"/>
        </div>

        <div className="flex space-x-3 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold transition-colors text-white text-sm">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-white text-sm">
            {isSubmitting ? 'Submitting…' : 'Save Rating'}
          </button>
        </div>
      </form>
    </div>);
};
export default StreetRatingForm;
