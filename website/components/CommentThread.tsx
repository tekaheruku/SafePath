'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, ThumbsUp, ThumbsDown, Flag, Send, Image as ImageIcon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { resolvePhotoUrl } from '../lib/photoUrl';

interface CommentThreadProps {
  reportId: string;
  onClose: () => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({ reportId, onClose }) => {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/reports/${reportId}/comments`, { headers: authHeaders });
      setComments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast('You must be logged in to comment.');
      return;
    }
    if (!content.trim() && !photoFile) return;

    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadRes = await axios.post(`${apiUrl}/upload`, formData, { headers: authHeaders });
        if (uploadRes.data.success) photo_url = uploadRes.data.url;
      }

      await axios.post(
        `${apiUrl}/reports/${reportId}/comments`,
        { content: content.trim() || null, photo_url },
        { headers: authHeaders }
      );

      setContent('');
      setPhotoFile(null);
      await fetchComments();
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      showToast(err.response?.data?.error?.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, voteType: 'up' | 'down') => {
    if (!token) {
      showToast('You must be logged in to vote.');
      return;
    }
    try {
      await axios.post(`${apiUrl}/comments/${commentId}/vote`, { voteType }, { headers: authHeaders });
      await fetchComments();
    } catch (err) {
      console.error('Failed to vote on comment:', err);
    }
  };

  const handleReport = async (commentId: string) => {
    if (!token) {
      showToast('You must be logged in to report a comment.');
      return;
    }
    try {
      const res = await axios.post(`${apiUrl}/comments/${commentId}/report`, {}, { headers: authHeaders });
      showToast(res.data.data?.message || "Thanks — we've reviewed this comment.");
      await fetchComments();
    } catch (err) {
      console.error('Failed to report comment:', err);
    }
  };

  const isAdmin = Boolean(user && ['lgu_admin', 'superadmin'].includes(user.role));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-theme-panel border border-theme-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <h3 className="font-bold text-theme-fg">Comments</h3>
          <button onClick={onClose} className="text-theme-fg-muted hover:text-theme-fg" aria-label="Close comments">
            <X className="w-5 h-5" />
          </button>
        </div>

        {toast && (
          <div className="mx-4 mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {toast}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-theme-fg-muted text-center py-6">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-theme-fg-muted text-center py-6">
              No comments yet. Add supporting details instead of filing a new report.
            </p>
          ) : (
            comments.map((c) => {
              const upvoteClass = c.user_vote === 'up' ? 'text-indigo-400 font-bold' : 'text-theme-fg-muted hover:text-indigo-400';
              const downvoteClass = c.user_vote === 'down' ? 'text-orange-400 font-bold' : 'text-theme-fg-muted hover:text-orange-400';
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3 ${c.ai_flagged ? 'border-amber-500/50 bg-amber-500/5' : 'border-theme-border'}`}
                  title={c.ai_flagged && isAdmin ? c.ai_flag_reason || undefined : undefined}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-theme-fg">{c.author_name || 'Anonymous'}</span>
                    <span className="text-[10px] text-theme-fg-muted">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  {c.ai_flagged && isAdmin && (
                    <p className="text-[10px] font-semibold text-amber-400 mb-1">⚠ Flagged: {c.ai_flag_reason || 'Guideline violation'}</p>
                  )}
                  {c.content && <p className="text-sm text-theme-fg mb-2 whitespace-pre-wrap">{c.content}</p>}
                  {c.photo_url && (
                    <img
                      src={resolvePhotoUrl(c.photo_url) ?? undefined}
                      alt="Supporting evidence"
                      className="w-full max-h-48 object-cover rounded-lg border border-theme-border mb-2"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleVote(c.id, 'up')} className={`flex items-center gap-1 text-xs transition-colors ${upvoteClass}`}>
                      <ThumbsUp className="w-3.5 h-3.5" /> {c.upvotes_count || 0}
                    </button>
                    <button onClick={() => handleVote(c.id, 'down')} className={`flex items-center gap-1 text-xs transition-colors ${downvoteClass}`}>
                      <ThumbsDown className="w-3.5 h-3.5" /> {c.downvotes_count || 0}
                    </button>
                    <button
                      onClick={() => handleReport(c.id)}
                      className="flex items-center gap-1 text-xs text-theme-fg-muted hover:text-red-400 transition-colors ml-auto"
                      title="Report this comment"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-theme-border space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Saw this too? Add a supporting comment instead of a new report…"
            className="w-full bg-slate-900 border border-theme-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs text-theme-fg-muted hover:text-theme-fg cursor-pointer">
              <ImageIcon className="w-4 h-4" />
              <span>{photoFile ? photoFile.name : 'Attach photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && !photoFile)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentThread;
