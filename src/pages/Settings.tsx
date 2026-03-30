import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Bell, User, Database, Building2, Mail, Phone, MapPin, Globe, Loader2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../lib/api';
import { supabase } from '../supabase';
import { cn } from '../utils/cn';
import { APP_NAME } from '../constants/branding';

export default function Settings() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phoneNumber: '',
    website: '',
    address: '',
    gstin: '',
    pan: '',
    chaLicenseNumber: '',
    fleetSize: ''
  });

  useEffect(() => {
    apiFetch('/api/users/me')
      .then((data) => {
        setUserData(data);
        setFormData({
          companyName: data.companyName || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          website: data.website || '',
          address: data.address || '',
          gstin: data.gstin || '',
          pan: data.pan || '',
          chaLicenseNumber: data.chaLicenseNumber || '',
          fleetSize: data.fleetSize || '',
        });
      })
      .catch((err) => console.error('Error fetching user data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      const updated = await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          companyName: formData.companyName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          fleetSize: formData.fleetSize || undefined,
        }),
      });
      setUserData({ ...userData, ...updated });
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Account Details</h1>
          <p className="text-slate-500 mt-1">Manage your business profile and contact information.</p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100"
              >
                <Check className="w-4 h-4" />
                Saved Successfully
              </motion.div>
            )}
          </AnimatePresence>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 w-full md:w-auto"
            >
              <Edit2 className="w-5 h-5" />
              Edit Details
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(false)}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all w-full md:w-auto"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{userData?.companyName || `${APP_NAME} User`}</h2>
            <p className="text-slate-500 text-sm mt-1">{userData?.email}</p>
            <div className="mt-6 pt-6 border-t border-slate-50">
              <span className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-bold uppercase tracking-wider">
                Professional Tier
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Organization Information
              </h3>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Company Name</label>
                    <input 
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                    <input 
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Phone Number</label>
                    <input 
                      type="text"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Website</label>
                    <input 
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">GSTIN</label>
                    <input 
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">PAN</label>
                    <input 
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  {userData?.role === 'CHA' && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">CHA License Number</label>
                      <input 
                        type="text"
                        value={formData.chaLicenseNumber}
                        onChange={(e) => setFormData({ ...formData, chaLicenseNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                      />
                    </div>
                  )}
                  {userData?.role === 'Transporter' && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Fleet Size</label>
                      <select
                        value={formData.fleetSize}
                        onChange={(e) => setFormData({ ...formData, fleetSize: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                      >
                        <option value="1-10">1-10 Vehicles</option>
                        <option value="11-50">11-50 Vehicles</option>
                        <option value="50+">50+ Vehicles</option>
                      </select>
                    </div>
                  )}
                  <div className="col-span-full space-y-2">
                    <label className="text-sm font-bold text-slate-700">Address</label>
                    <textarea 
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name</p>
                  <p className="text-slate-900 font-medium">{userData?.companyName || 'Not Provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-slate-900 font-medium">{userData?.email || 'Not Provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                  <p className="text-slate-900 font-medium">{userData?.phoneNumber || 'Not Provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Website</p>
                  <p className="text-slate-900 font-medium">{userData?.website || 'Not Provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">GSTIN</p>
                  <p className="text-slate-900 font-medium">{userData?.gstin || 'Not Provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">PAN</p>
                  <p className="text-slate-900 font-medium">{userData?.pan || 'Not Provided'}</p>
                </div>
                {userData?.role === 'CHA' && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">CHA License Number</p>
                    <p className="text-slate-900 font-medium">{userData?.chaLicenseNumber || 'Not Provided'}</p>
                  </div>
                )}
                {userData?.role === 'Transporter' && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Size</p>
                    <p className="text-slate-900 font-medium">{userData?.fleetSize || 'Not Provided'}</p>
                  </div>
                )}
                <div className="col-span-full space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="text-slate-900 font-medium">{userData?.address || 'Not Provided'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security & Access
            </h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Email Verification</p>
                  <p className="text-xs text-slate-500">Your email is verified and secure.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-accent uppercase tracking-wider">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
