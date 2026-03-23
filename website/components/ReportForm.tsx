'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useAuth } from './AuthContext';

const reportSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  severity_level: z.coerce.number(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  latitude: z.number(),
  longitude: z.number(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportFormProps {
  location: { lat: number; lng: number };
  onSuccess: () => void;
  onCancel: () => void;
}

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Low-Medium',
  3: 'Medium',
  4: 'Medium-High',
  5: 'High',
};

const ReportForm: React.FC<ReportFormProps> = ({ location, onSuccess, onCancel }) => {
  const { token } = useAuth();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      latitude: location.lat,
      longitude: location.lng,
      severity_level: 3,
    }
  });

  const severityValue = Number(watch('severity_level')) || 3;

  const onSubmit = async (data: ReportFormValues) => {
    try {
      const mapSeverity = (val: number): string => {
        if (val <= 2) return 'low';
        if (val === 3) return 'medium';
        return 'high';
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports`,
        {
          ...data,
          severity_level: mapSeverity(data.severity_level),
          location: { latitude: data.latitude, longitude: data.longitude }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
    } catch (err) {
      console.error('Failed to submit report:', err);
      alert('Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="p-6 glass-panel rounded-xl space-y-4 shadow-2xl min-w-[320px]">

      <h2 className="text-xl font-bold text-white">Report Incident</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
          <select 
            {...register('type')}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Theft">Theft</option>
            <option value="Assault">Assault</option>
            <option value="Vandalism">Vandalism</option>
            <option value="Harassment">Harassment</option>
            <option value="Car crash">Car crash</option>
            <option value="Other">Other</option>
          </select>
          {errors.type && <p className="text-xs text-red-400">{errors.type.message}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Severity</label>
            <span className="text-sm font-bold text-blue-400">{severityValue} — {SEVERITY_LABELS[severityValue] || 'Medium'}</span>
          </div>
          <input 
            type="range" min="1" max="5" step="1"
            {...register('severity_level')}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[11px] text-slate-400 select-none font-medium px-0.5">
            <span>1 · Low</span>
            <span>3 · Medium</span>
            <span>5 · High</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
          <textarea 
            {...register('description')}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white h-24 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Provide details about the incident..."
          />
          {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
        </div>

        <div className="flex space-x-3 pt-2">
          <button 
            type="button" onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" disabled={isSubmitting}
            className="flex-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;
