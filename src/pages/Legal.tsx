import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Scale, FileText, UserCheck, Mail, ArrowLeft, Building2, Gavel } from 'lucide-react';
import { APP_LOGO_URL, APP_NAME } from '../constants/branding';

export default function Legal() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src={APP_LOGO_URL} 
                alt={APP_NAME} 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight uppercase">{APP_NAME}</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-slate-900 mb-4">Legal & Compliance Framework</h1>
          <p className="text-slate-500 text-lg">Our commitment to transparency, security, and Indian IT Law compliance.</p>
        </div>

        <div className="space-y-12">
          {/* Terms & Conditions */}
          <section id="terms" className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Gavel className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Terms & Conditions</h2>
            </div>
            
            <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 mb-8">
                <p className="font-bold text-primary mb-2">Intermediary Status (IT Act 2000)</p>
                <p className="text-sm italic">
                  "The Company is not a 'Common Carrier' under the Carriage by Road Act, 2007. Its role is limited to being a technology service provider and an **Intermediary under Section 79 of the Information Technology Act, 2000**."
                </p>
              </div>

              <p>
                By accessing or using the {APP_NAME} platform, you agree to be bound by these Terms. Our platform acts as a digital bridge connecting Custom House Agents (CHAs) and Transporters.
              </p>

              <h3 className="text-lg font-bold text-slate-900 mt-8">1. Limitation of Liability</h3>
              <p>
                As an Intermediary, {APP_NAME} Technologies (Private Limited) is not liable for any cargo theft, accidents, delays, or driver behavior. We do not own, operate, or control the vehicles listed on the platform. 
              </p>
              <p className="font-bold text-slate-900">
                Total liability of the Company for any claim arising out of a transaction is strictly capped at the Platform Fee charged for that specific transaction.
              </p>

              <h3 className="text-lg font-bold text-slate-900 mt-8">2. Mutual Indemnification</h3>
              <p>
                Users agree to indemnify and hold harmless the Company from any claims, damages, or losses arising from their use of the platform, violation of these terms, or infringement of any third-party rights.
              </p>

              <h3 className="text-lg font-bold text-slate-900 mt-8">3. KYC & Verification</h3>
              <p>
                Users are responsible for providing accurate GSTIN, PAN, and License details. The Company performs automated due diligence but does not guarantee the absolute accuracy of third-party data.
              </p>
            </div>
          </section>

          {/* Privacy Policy */}
          <section id="privacy" className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Privacy Policy (DPDP Act 2023)</h2>
            </div>
            
            <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
              <p>
                In compliance with the **Digital Personal Data Protection (DPDP) Act, 2023**, we are committed to protecting your business and personal data.
              </p>

              <h3 className="text-lg font-bold text-slate-900 mt-8">1. Data Collection & Purpose</h3>
              <p>
                We collect essential business identifiers including GSTIN, PAN, and Bank Account details. This data is used solely for the purpose of identity verification and facilitating secure financial settlements.
              </p>

              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8">
                <p className="font-bold text-emerald-900 mb-2">Automated Escrow-style Verification</p>
                <p className="text-sm">
                  We utilize "Penny Drop" verification to validate bank accounts instantly, ensuring that driver payouts and transporter settlements are directed to legitimate, verified entities.
                </p>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-8">2. Data Security</h3>
              <p>
                All sensitive data is encrypted at rest and in transit. We maintain an API-first architecture with strict access controls to prevent unauthorized data exposure.
              </p>
            </div>
          </section>

          {/* Grievance Redressal */}
          <section id="grievance" className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Grievance Redressal</h2>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <p className="text-slate-600 mb-6">
                In accordance with the Information Technology Act 2000 and rules made there under, the name and contact details of the Grievance Officer are provided below:
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grievance Officer</p>
                    <p className="text-slate-900 font-bold">Legal Compliance Dept.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Mail className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                    <p className="text-slate-900 font-bold">legal@savare.com</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-20 pt-10 border-t border-slate-200 text-center text-slate-400 text-sm">
          © {new Date().getFullYear()} {APP_NAME} Technologies (Private Limited). All rights reserved. Registered in India.
        </footer>
      </div>
    </div>
  );
}
