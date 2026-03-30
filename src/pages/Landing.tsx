import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Shield, Clock, BarChart3, ArrowRight, CheckCircle2, Globe, Zap, Database, Activity, Lock, Users, Search, IndianRupee, HardHat, FileCheck, Cpu, MapPin } from 'lucide-react';
import { APP_LOGO_URL, APP_NAME } from '../constants/branding';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary selection:text-white">
      {/* Status Bar */}
      <div className="bg-primary text-white py-2.5 px-6 text-center text-xs font-bold tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          UPDATE: Phase 1 Operational. Transporters can now register for Digital LR and Driver Payout.
        </span>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src={APP_LOGO_URL} 
                alt={APP_NAME} 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight uppercase">{APP_NAME}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#home" className="hover:text-primary transition-colors">Home</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#about" className="hover:text-primary transition-colors">About Us</a>
            <Link to="/legal" className="hover:text-primary transition-colors">Legal</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Sign In</Link>
            <Link to="/login" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-primary/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative px-6 pt-24 pb-32 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-slate-50 rounded-bl-[10rem] opacity-50" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
              Phase 1 is Live Now
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]">
              Transporter <br />
              <span className="text-primary">Digitalization</span> <br />
              is Here.
            </h1>
            <p className="text-xl text-slate-500 max-w-xl leading-relaxed">
              We have successfully digitized the core of truck logistics. Transporters can now move away from manual registers and error-prone reporting with our fully operational ERP.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/login" className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                Start Digitizing Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/legal" className="w-full sm:w-auto bg-white text-slate-900 border-2 border-slate-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                View Compliance
              </Link>
            </div>
            <div className="flex items-center gap-8 pt-8 border-t border-slate-100">
              <div>
                <p className="text-2xl font-black text-slate-900">Live</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transporter ERP</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">Active</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Driver Payout</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">Ready</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digital LRs</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 relative z-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <FileCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Digital LR System</p>
                      <p className="text-xs text-slate-500">Instant Receipt Generation</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Live</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <IndianRupee className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Driver Payouts</p>
                      <p className="text-xs text-slate-500">No-OTP Wallet Transfers</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">Active</span>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Annexure Status</p>
                    <p className="text-sm font-black text-slate-900">100% Accurate</p>
                  </div>
                  <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full rounded-full" />
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">Automated movement reports for error-free billing</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Phase 1 Features Grid */}
      <section id="features" className="py-32 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-100">
              Operational Now
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Phase 1: The Digital Transporter</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Move away from manual registers. Our core truck logistics module is live and ready to power your fleet.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FileCheck className="w-8 h-8" />,
                title: "Instant LR Generation",
                desc: "Create professional Lorry Receipts digitally in seconds. Eliminate manual errors and spelling mistakes.",
                badge: "Live Now"
              },
              {
                icon: <Database className="w-8 h-8" />,
                title: "Automated Annexures",
                desc: "Generate movement reports automatically to ensure 100% accuracy in billing and prevent disputes.",
                badge: "Live Now"
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Expense Management",
                desc: "Track every trip expense, fuel refill, and toll in a single digital ledger with complete transparency.",
                badge: "Live Now"
              },
              {
                icon: <IndianRupee className="w-8 h-8" />,
                title: "Driver Payouts",
                desc: "Use our API-linked wallet to pay drivers instantly via UPI without the friction of per-transaction OTPs.",
                badge: "Live Now"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
                <div className="absolute top-6 right-6">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                    {feature.badge}
                  </span>
                </div>
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
            The Evolution
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Our Roadmap</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">We are building a complete ecosystem. From manual chaos to digital precision.</p>
        </div>

        <div className="space-y-12">
          {[
            {
              phase: "Phase 1",
              status: "Active",
              title: "Transporter ERP & Wallets",
              desc: "Full digitization of truck logistics, LR generation, and automated driver payouts.",
              color: "bg-emerald-500",
              textColor: "text-emerald-600",
              bgColor: "bg-emerald-50",
              borderColor: "border-emerald-100"
            },
            {
              phase: "Phase 2",
              status: "Coming Soon",
              title: "CHA Onboarding & Marketplace",
              desc: "Opening the portal for Customs House Agents and launching the open container marketplace.",
              color: "bg-primary",
              textColor: "text-primary",
              bgColor: "bg-primary/5",
              borderColor: "border-primary/10"
            },
            {
              phase: "Phase 3",
              status: "In Development",
              title: "Live Tracking & Efficiency Analytics",
              desc: "IoT-based tracking to eliminate detention disputes and provide deep insights into driver efficiency.",
              color: "bg-slate-400",
              textColor: "text-slate-500",
              bgColor: "bg-slate-50",
              borderColor: "border-slate-100"
            }
          ].map((item, i) => (
            <div key={i} className={`flex flex-col md:flex-row items-center gap-8 p-8 rounded-[3rem] border ${item.borderColor} ${item.bgColor} relative overflow-hidden`}>
              <div className={`w-24 h-24 shrink-0 rounded-[2rem] ${item.color} flex flex-col items-center justify-center text-white`}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{item.phase.split(' ')[0]}</span>
                <span className="text-3xl font-black">{item.phase.split(' ')[1]}</span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                  <h3 className="text-2xl font-black text-slate-900">{item.title}</h3>
                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${item.borderColor} ${item.textColor} bg-white w-fit mx-auto md:mx-0`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">{item.desc}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 opacity-10">
                  <ArrowRight className="w-32 h-32" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* About Us Section (Philosophy) */}
      <section id="about" className="py-32 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              Our Philosophy
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              We aren't here to stand between you and your <span className="text-primary">partners.</span>
            </h2>
            <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
              <p>
                We are here to provide the digital highway. Unlike traditional brokers, **{APP_NAME}** is a pure-play infrastructure network. We provide the marketplace for CHAs to find reliable wheels and for Transporters to keep their fleet in constant motion—without the manual follow-ups, WhatsApp clutter, or paperwork delays.
              </p>
              <p>
                Our mission is focused on **Reducing the Cost of Time**. For the CHA, that means eliminating "Container Hold" fees at the yard. For the Transporter, it means ending "Idle Vehicles" waiting for orders.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold">Automated KYC</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold">Instant Payouts</span>
              </div>
            </div>
          </div>
          <div className="relative group">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                  <Users className="w-8 h-8 text-primary mb-4" />
                  <p className="text-2xl font-black">500+</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verified CHAs</p>
                </div>
                <div className="bg-primary p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20">
                  <Truck className="w-8 h-8 text-white mb-4" />
                  <p className="text-2xl font-black">2k+</p>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Active Fleet</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                  <Globe className="w-8 h-8 text-primary mb-4" />
                  <p className="text-2xl font-black">15+</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Major Ports</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                  <Lock className="w-8 h-8 text-primary mb-4" />
                  <p className="text-2xl font-black">100%</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Legal Shield</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-2 space-y-8">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl p-1">
                <img 
                  src={APP_LOGO_URL} 
                  alt={APP_NAME} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-2xl font-black tracking-tight uppercase">{APP_NAME}</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Digitizing the backbone of India's trade. Connecting CHAs and Transporters through a high-trust, legally fortified technology ecosystem.
            </p>
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8">Platform</h4>
            <ul className="space-y-4 text-slate-400 text-sm font-bold">
              <li><Link to="/login" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Transporter App</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">CHA Dashboard</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Driver Payouts</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8">Legal</h4>
            <ul className="space-y-4 text-slate-400 text-sm font-bold">
              <li><Link to="/legal#terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal#privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal#grievance" className="hover:text-white transition-colors">Grievance Redressal</Link></li>
              <li><Link to="/legal" className="hover:text-white transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-20 mt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-500 text-xs font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} {APP_NAME} Technologies (Private Limited). All rights reserved.</p>
          <p>Made with Precision in India</p>
        </div>
      </footer>
    </div>
  );
}
