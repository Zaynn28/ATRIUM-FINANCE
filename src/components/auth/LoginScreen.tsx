/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  UserCheck,
  KeyRound,
  RotateCw,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from '../../services/firebase';
import { api } from '../../services/api';
import { SystemUser, UserRoleDefinition, AccessControlState } from '../../types';

interface LoginScreenProps {
  onLoginSuccess: (user: SystemUser, role: UserRoleDefinition, state: AccessControlState) => void;
  registeredUsers: SystemUser[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  registeredUsers,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'email' | 'quick-select'>('email');

  // Direct login verification against backend RBAC registry
  const handleVerifyEmail = async (targetEmail: string, targetPassword?: string, isGoogleOAuth = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyUser({
        email: targetEmail,
        password: targetPassword,
        isGoogleOAuth,
      });
      if (result.authorized) {
        onLoginSuccess(result.user, result.role, result.state);
      } else {
        setError('Akses ditolak: Email atau kata sandi tidak sesuai.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login. Pastikan email dan kata sandi Anda benar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Masukkan alamat email corporate Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Masukkan kata sandi (password) akun Anda.');
      return;
    }
    await handleVerifyEmail(email.trim(), password.trim(), false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userEmail = res.user.email;
      if (!userEmail) {
        throw new Error('Tidak dapat memperoleh email dari akun Google.');
      }
      await handleVerifyEmail(userEmail, undefined, true);
    } catch (err: any) {
      // In preview iframe, popups might require fallback
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setError('Popup terblokir oleh peramban/iframe. Silakan gunakan opsi masukan email dan kata sandi di bawah.');
      } else {
        setError(err.message || 'Gagal melakukan otentikasi dengan Google.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950 -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-extrabold text-lg shadow-xl shadow-emerald-950/40 font-mono mb-3">
            AMG
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 uppercase">
            AMG <span className="text-slate-600 font-light">/</span> Atrium Finance
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wide uppercase">
            Double-Entry Hotel ERP &bull; USALI 12th Revised Edition
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Portal Masuk Karyawan & Controller
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hanya email yang telah disetujui Administrator yang dapat mengakses.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
              RBAC PROTECTED
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Akses Ditolak</span>
                <span className="text-[11px] text-rose-300 leading-relaxed block">{error}</span>
              </div>
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk dengan Google (Akun Terdaftar)</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              Atau masukkan email terdaftar
            </span>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Alamat Email Kantor:
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: laluzayen@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Kata Sandi (Password):
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Dikelola Controller
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Kata sandi dapat disetel atau diganti melalui panel Administrator.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Buka Sistem Keuangan AMG</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Authorized Personas Showcase for easy access testing */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Email Resmi Terdaftar Saat Ini:
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {registeredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password || 'AtriumHotel2026!');
                    handleVerifyEmail(u.email, u.password || 'AtriumHotel2026!', false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-left transition-colors group"
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                        {u.name}
                      </span>
                      {u.email === 'laluzayen@gmail.com' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                      {u.email}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                    Masuk →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Notice Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px] text-slate-500 font-mono">
            Keamanan Berlapis &bull; Role-Based Access Control (RBAC) &bull; Audit Trail Aktif
          </p>
          <p className="text-[10px] text-slate-600">
            Untuk mendaftarkan staf baru atau mengubah modul yang dapat diakses, buka menu <strong>Pillar 8: Administration</strong> setelah login.
          </p>
        </div>
      </div>
    </div>
  );
};
