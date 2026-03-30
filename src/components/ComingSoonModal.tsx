import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, X, Clock } from 'lucide-react';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  logoUrl?: string;
}

export default function ComingSoonModal({ 
  isOpen, 
  onClose, 
  title = "Coming Soon", 
  description = "We are currently building the internal transporter module for CHAs. Stay tuned for updates!",
  logoUrl
}: ComingSoonModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 text-center overflow-hidden"
          >
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />

            <div className="relative">
              {logoUrl ? (
                <div className="w-24 h-24 flex items-center justify-center mx-auto mb-8">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 group">
                  <HardHat className="w-10 h-10 text-primary group-hover:rotate-12 transition-transform duration-300" />
                </div>
              )}
              
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase italic">
                {title}
              </h2>
              
              <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                {description}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Understood
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  Expected Launch: Q3 2026
                </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
