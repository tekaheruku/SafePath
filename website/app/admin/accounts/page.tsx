'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthContext';
import axios from 'axios';
import UserDetailModal from '../../../components/admin/UserDetailModal';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  banned_until: string | null;
  ban_reason: string | null;
  reports_count: string;
  ratings_count: string;
}

export default function AccountListPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'created_at',
    direction: 'desc'
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'lgu_admin')) {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user, router]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const rolePriority: Record<string, number> = {
    'superadmin': 3,
    'lgu_admin': 2,
    'user': 1
  };

  const processedUsers = React.useMemo(() => {
    let items = [...users].filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (sortConfig !== null) {
      items.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof User];
        let bValue: any = b[sortConfig.key as keyof User];

        // Specific sorting logic
        if (sortConfig.key === 'role') {
          aValue = rolePriority[a.role] || 0;
          bValue = rolePriority[b.role] || 0;
        } else if (sortConfig.key === 'first_name') {
          aValue = a.name.split(' ')[0].toLowerCase();
          bValue = b.name.split(' ')[0].toLowerCase();
        } else if (sortConfig.key === 'last_name') {
          const aParts = a.name.split(' ');
          const bParts = b.name.split(' ');
          aValue = (aParts.length > 1 ? aParts[aParts.length - 1] : '').toLowerCase();
          bValue = (bParts.length > 1 ? bParts[bParts.length - 1] : '').toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [users, search, sortConfig]);

  if (!user || (user.role !== 'superadmin' && user.role !== 'lgu_admin')) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Account Management
            </h1>
            <p className="text-slate-400 mt-1">Manage user access and review community activity</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 flex items-center space-x-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">
                    <div className="flex items-center space-x-4">
                       <span>Name</span>
                       <div className="flex items-center space-x-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); requestSort('first_name'); }} 
                           className={`flex items-center space-x-1 px-1.5 py-0.5 rounded border transition-all ${
                             sortConfig?.key === 'first_name' 
                               ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                               : 'border-slate-700 text-slate-500 hover:text-slate-300'
                           }`}
                           title="Sort by First Name"
                         >
                           <span className="text-[10px]">FN</span>
                           <span className="text-[10px]">{sortConfig?.key === 'first_name' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '▴'}</span>
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); requestSort('last_name'); }} 
                           className={`flex items-center space-x-1 px-1.5 py-0.5 rounded border transition-all ${
                             sortConfig?.key === 'last_name' 
                               ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                               : 'border-slate-700 text-slate-500 hover:text-slate-300'
                           }`}
                           title="Sort by Last Name"
                         >
                           <span className="text-[10px]">LN</span>
                           <span className="text-[10px]">{sortConfig?.key === 'last_name' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '▴'}</span>
                         </button>
                       </div>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer group hover:bg-slate-800/50 transition-colors"
                    onClick={() => requestSort('role')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Role</span>
                      <span className={`text-[10px] transition-colors ${sortConfig?.key === 'role' ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                        {sortConfig?.key === 'role' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '▴'}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer group hover:bg-slate-800/50 transition-colors"
                    onClick={() => requestSort('created_at')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      <span className={`text-[10px] transition-colors ${sortConfig?.key === 'created_at' ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                        {sortConfig?.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '▴'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold">Activity</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-6 h-16 bg-slate-900/50"></td>
                    </tr>
                  ))
                ) : processedUsers.length > 0 ? (
                  processedUsers.map((u) => (
                    <tr 
                      key={u.id} 
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-indigo-500/10 rounded-full flex items-center justify-center font-bold text-indigo-400 border border-indigo-500/20">
                            {u.name[0]}
                          </div>
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                          u.role === 'superadmin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          u.role === 'lgu_admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-1" title="Reports">
                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{u.reports_count}</span>
                          </div>
                          <div className="flex items-center space-x-1" title="Ratings">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <span>{u.ratings_count}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.banned_until && new Date(u.banned_until) > new Date() ? (
                          <span className="flex items-center text-red-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                            Banned
                          </span>
                        ) : (
                          <span className="flex items-center text-emerald-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-500 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onUpdate={fetchUsers}
        />
      )}
    </div>
  );
}
