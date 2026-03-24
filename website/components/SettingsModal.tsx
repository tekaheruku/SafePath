import React, { useState } from 'react';
import { useSettingsStore, ThemeType } from '../store/useSettingsStore';
import axios from 'axios';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, token }) => {
  const { theme, setTheme } = useSettingsStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/change-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: response.data.data.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh]">
          {/* Theme Selection */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Appearance</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['dark', 'gray', 'white'] as ThemeType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    theme === t 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.2)]' 
                      : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 ${
                    t === 'dark' ? 'bg-[#020617] border-slate-700' :
                    t === 'gray' ? 'bg-[#475569] border-slate-500' :
                    'bg-[#f8fafc] border-slate-300'
                  }`} />
                  <span className="text-[10px] font-bold capitalize">{t}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Change Password */}
          {token && (
            <section className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Security</h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 ml-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="••••••••"
                  />
                </div>

                {message && (
                  <div className={`p-3 rounded-lg text-xs font-bold ${
                    message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? 'Changing...' : 'Update Password'}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
