'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { IBA_POLYGON, isPointInPolygon } from '@safepath/shared';
import LoginModal from './LoginModal';

import { IncidentType, SeverityLevel } from '@safepath/shared';

const reportSchema = z.object({
  incident_type_id: z.string().min(1, 'Type is required'),
  severity_level_id: z.string().min(1, 'Severity is required'),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportFormProps {
  location: { lat: number; lng: number };
  incidentTypes: IncidentType[];
  severityLevels: SeverityLevel[];
  preselectedIncidentTypeId: string | null;
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

const ReportForm: React.FC<ReportFormProps> = ({ location, incidentTypes, severityLevels, preselectedIncidentTypeId, onSuccess, onCancel }) => {
  const { token, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-select the first severity level if available, or just the middle one if possible
  const sortedSeverityLevels = [...severityLevels].sort((a, b) => a.level - b.level);
  const defaultSeverity = sortedSeverityLevels.length > 0 
    ? (sortedSeverityLevels.length >= 3 ? sortedSeverityLevels[2].id : sortedSeverityLevels[0].id) 
    : '';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setValue } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      latitude: location.lat,
      longitude: location.lng,
      incident_type_id: preselectedIncidentTypeId || '',
      severity_level_id: defaultSeverity,
    }
  });

  const selectedSeverityId = watch('severity_level_id');
  const selectedSeverity = sortedSeverityLevels.find(s => s.id === selectedSeverityId);
  const selectedIncidentType = incidentTypes.find(t => t.id === watch('incident_type_id'));

  const onSubmit = async (data: ReportFormValues) => {
    // Authentication Check
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    // Photo Check
    if (!photoFile) {
      setPhotoError('A photo is required to submit a report.');
      return;
    }
    setPhotoError(null);

    // Boundary Check
    if (!isPointInPolygon([data.latitude, data.longitude], IBA_POLYGON)) {
      alert('Selected location is outside the supported area (Iba, Zambales).');
      return;
    }

    try {
      setIsUploading(true);
      let photo_url = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/upload`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (uploadRes.data.success) {
          photo_url = uploadRes.data.url;
        }
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/reports`,
        {
          ...data,
          location: { latitude: data.latitude, longitude: data.longitude },
          photo_url
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
    } catch (err: any) {
      console.error('Failed to submit report:', err);
      if (err.response?.status === 401) {
        setShowLoginModal(true);
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 glass-panel rounded-xl space-y-4 shadow-2xl min-w-[320px]">
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        message="Please sign in to submit a rating."
      />

      <h2 className="text-xl font-bold text-theme-fg">Report Incident</h2>

      {user && user.id_verification_status !== 'verified' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <div className="text-xs text-amber-200/80 leading-relaxed">
            Your account is unverified. Reports from unverified accounts may be given lower priority. 
            <Link href="/settings" className="text-amber-400 hover:underline ml-1 font-semibold">Verify in Settings</Link>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-theme-fg-muted uppercase tracking-wider">Type</label>
          {selectedIncidentType ? (
            <div className="flex items-center gap-2 p-2.5 bg-theme-panel/50 border border-slate-700 rounded-lg text-theme-fg font-medium">
              <span>{selectedIncidentType.name}</span>
            </div>
          ) : (
            <select 
              {...register('incident_type_id')}
              className="w-full bg-theme-panel border border-slate-700 rounded-lg p-2 text-theme-fg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Type</option>
              {incidentTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <input type="hidden" {...register('incident_type_id')} />
          {errors.incident_type_id && <p className="text-xs text-red-400">{errors.incident_type_id.message}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <label className="text-xs font-semibold text-theme-fg-muted uppercase tracking-wider">Severity</label>
            {selectedSeverity && (
               <span className="text-sm font-bold" style={{ color: selectedSeverity.color_code }}>
                 {selectedSeverity.name}
               </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {sortedSeverityLevels.map(level => {
              const isActive = selectedSeverityId === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setValue('severity_level_id', level.id)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                  style={{
                    backgroundColor: isActive ? `${level.color_code}30` : 'rgba(30, 41, 59, 0.5)',
                    borderColor: isActive ? level.color_code : 'rgba(51, 65, 85, 1)',
                    color: isActive ? level.color_code : '#94a3b8'
                  }}
                  title={level.description}
                >
                  {level.name}
                </button>
              );
            })}
          </div>
          <input type="hidden" {...register('severity_level_id')} />
          {errors.severity_level_id && <p className="text-xs text-red-400">{errors.severity_level_id.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-theme-fg-muted uppercase tracking-wider">Description</label>
          <textarea 
            {...register('description')}
            className="w-full bg-theme-panel border border-slate-700 rounded-lg p-2 text-theme-fg h-24 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Provide details about the incident..."
          />
          {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-theme-fg-muted uppercase tracking-wider">Photo (Required)</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setPhotoFile(e.target.files[0]);
                setPhotoError(null);
              } else {
                setPhotoFile(null);
              }
            }}
            className="w-full text-sm text-theme-fg-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 transition-all outline-none"
          />
          {photoError && <p className="text-xs text-red-400">{photoError}</p>}
        </div>

        <div className="flex space-x-3 pt-2">
          <button 
            type="button" onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-theme-panel hover:bg-theme-border-hover font-semibold transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" disabled={isSubmitting || isUploading}
            className="flex-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isSubmitting || isUploading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;
