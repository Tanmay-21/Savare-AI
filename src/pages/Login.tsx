import React, { useState } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/api';
import {
  Truck,
  LogIn,
  AlertCircle,
  Mail,
  Lock,
  Building2,
  FileText,
  CheckCircle2,
  Phone,
  MapPin,
  Upload,
  UserCircle2,
  ChevronRight,
  ArrowLeft,
  Clock,
  HardHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_LOGO_URL, APP_NAME } from '../constants/branding';

type Role = 'CHA' | 'Transporter';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [signupData, setSignupData] = useState({
    companyName: '',
    phoneNumber: '',
    gstin: '',
    pan: '',
    address: '',
    chaLicenseNumber: '',
    fleetSize: '1-10' as '1-10' | '11-50' | '50+'
  });

  const handleDemoSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { access_token, refresh_token } = await apiFetch<{ access_token: string; refresh_token: string }>('/api/auth/demo', { method: 'POST' });
      await supabase.auth.setSession({ access_token, refresh_token });
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setError(null);
  };

  const handleBackToRole = () => {
    setSelectedRole(null);
    setError(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !selectedRole) return;

    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Validate signup fields
        if (!signupData.companyName || !signupData.gstin || !signupData.pan || !signupData.address) {
          throw new Error('Please fill all required fields.');
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('Sign-up failed. Please try again.');

        // Create user profile via API
        await apiFetch('/api/users/register', {
          method: 'POST',
          body: JSON.stringify({
            role: selectedRole,
            company_name: signupData.companyName,
            phone_number: signupData.phoneNumber,
            gstin: signupData.gstin.toUpperCase(),
            pan: signupData.pan.toUpperCase(),
            address: signupData.address,
            ...(selectedRole === 'CHA'
              ? { cha_license_number: signupData.chaLicenseNumber }
              : { fleet_size: signupData.fleetSize }),
          }),
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else if (err.message?.includes('User already registered')) {
        setError('Email already in use. Try logging in.');
      } else if (err.message?.includes('Password should be')) {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 flex items-center justify-center mb-6">
              <img
                src={APP_LOGO_URL}
                alt={APP_NAME}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-4xl font-black text-primary tracking-tighter uppercase italic">{APP_NAME}</h1>
            <p className="text-zinc-500 mt-3 text-center font-medium">
              {!selectedRole ? 'Choose your role to get started' :
               isLogin ? `Login as ${selectedRole}` : `Apply for ${selectedRole} Verification`}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8 p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-start gap-3 text-red-600 text-sm font-medium"
            >
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-base">Error</p>
                <p className="leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => handleRoleSelect('CHA')}
                    className="group p-8 bg-zinc-50 border-2 border-transparent hover:border-primary hover:bg-white rounded-[2rem] transition-all text-left flex flex-col items-start gap-4 shadow-sm hover:shadow-xl"
                  >
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">CHA</h3>
                      <p className="text-sm text-zinc-500 mt-1">Custom House Agent. Manage documentation and clearances.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-primary group-hover:translate-x-1 transition-all ml-auto" />
                  </button>

                  <button
                    onClick={() => handleRoleSelect('Transporter')}
                    className="group p-8 bg-zinc-50 border-2 border-transparent hover:border-accent hover:bg-white rounded-[2rem] transition-all text-left flex flex-col items-start gap-4 shadow-sm hover:shadow-xl"
                  >
                    <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                      <Truck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Transporter</h3>
                      <p className="text-sm text-zinc-500 mt-1">Fleet Owner. Provide vehicles and manage logistics.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-accent group-hover:translate-x-1 transition-all ml-auto" />
                  </button>
                </div>

                <div className="pt-6 border-t border-zinc-100">
                  <button
                    onClick={handleDemoSignIn}
                    disabled={loading}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-3 disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <UserCircle2 className="w-5 h-5" />
                    )}
                    Continue as Guest (Demo Mode)
                  </button>
                  <p className="text-center text-[10px] text-zinc-400 mt-3 font-medium">
                    No account required for testing. All features available in demo mode.
                  </p>
                </div>
              </motion.div>
            ) : selectedRole === 'CHA' ? (
              <motion.div
                key="cha-coming-soon"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 group">
                  <HardHat className="w-10 h-10 text-primary group-hover:rotate-12 transition-transform duration-300" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase italic">
                  Coming Soon
                </h2>

                <p className="text-slate-500 mb-10 leading-relaxed font-medium max-w-md mx-auto">
                  We are currently building the specialized module for Custom House Agents (CHA).
                  Stay tuned for the launch of our digital clearance platform!
                </p>

                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                  <button
                    onClick={handleBackToRole}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Role Selection
                  </button>
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    Expected Launch: Q3 2026
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={handleBackToRole}
                  className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors font-bold text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change Role
                </button>

                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!isLogin && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Company Name</label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                              type="text"
                              placeholder="Legal Entity Name"
                              value={signupData.companyName}
                              onChange={(e) => setSignupData({ ...signupData, companyName: e.target.value })}
                              className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all"
                              required={!isLogin}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={signupData.phoneNumber}
                              onChange={(e) => setSignupData({ ...signupData, phoneNumber: e.target.value })}
                              className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Work Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all"
                          required
                        />
                      </div>
                    </div>

                    {!isLogin && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">GSTIN (Tax ID)</label>
                          <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                              type="text"
                              placeholder="22AAAAA0000A1Z5"
                              value={signupData.gstin}
                              onChange={(e) => setSignupData({ ...signupData, gstin: e.target.value.toUpperCase() })}
                              className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all"
                              required={!isLogin}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Company PAN</label>
                          <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                              type="text"
                              placeholder="ABCDE1234F"
                              value={signupData.pan}
                              onChange={(e) => setSignupData({ ...signupData, pan: e.target.value.toUpperCase() })}
                              className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all"
                              required={!isLogin}
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Registered Address</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-4 w-5 h-5 text-zinc-400" />
                            <textarea
                              placeholder="Full registered office address"
                              value={signupData.address}
                              onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                              className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all min-h-[100px] resize-none"
                              required={!isLogin}
                            />
                          </div>
                        </div>

                        {/* CHA onboarding form fields reserved for when CHA signup ships */}
                        <div className="space-y-2">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Fleet Size</label>
                          <select
                            value={signupData.fleetSize}
                            onChange={(e) => setSignupData({ ...signupData, fleetSize: e.target.value as any })}
                            className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all appearance-none font-medium"
                            required={!isLogin}
                          >
                            <option value="1-10">1-10 Vehicles</option>
                            <option value="11-50">11-50 Vehicles</option>
                            <option value="50+">50+ Vehicles</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <button
                            type="button"
                            className="w-full flex items-center justify-center gap-3 p-6 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group"
                          >
                            <Upload className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
                            <div className="text-left">
                              <p className="font-bold text-zinc-900 group-hover:text-primary transition-colors">Upload KYC & License Documents</p>
                              <p className="text-xs text-zinc-500">PDF, JPG or PNG (Max 10MB)</p>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 ${
                      selectedRole === 'CHA' ? 'bg-primary shadow-primary/20 hover:bg-primary/90' : 'bg-accent shadow-accent/20 hover:bg-accent/90'
                    }`}
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {isLogin ? <LogIn className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isLogin ? 'Login' : 'Submit for Verification'}
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(!isLogin); setError(null); }}
                      className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      {isLogin ? (
                        <>Don't have an account? <span className="text-primary underline">Create one here</span></>
                      ) : (
                        <>Already verified? <span className="text-primary underline">Login here</span></>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 pt-8 border-t border-zinc-50 text-center">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              Secure B2B Logistics Marketplace • {APP_NAME} India
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
