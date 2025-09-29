// client/src/pages/ContactPage.jsx
import React from 'react';
import { Mail, Briefcase, GraduationCap, Phone, User, Globe, Code } from 'lucide-react';

// --- UPDATED WITH NEW EDUCATION & EXPERIENCE ---
const contactInfo = {
  name: "Van Nguyen",
  title: "VoIP Application Engineer | Health Tech Developer",
  experience: "Software Developer, HD Telecommunications",
  education: [
    "Health System Management, Fanshawe College",
    "Software Engineering Technologist, Centennial College"
  ],
  personalEmail: "vdnnguyen94@gmail.com",
  schoolEmail: "v_nguyen251275@fanshaweonline.ca",
  phone: "519-902-4060",
  portfolio: "https://www.vannguyen.dev/", 
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
            Contact Information
          </span>
        </h1>
        <p className="text-lg text-slate-300 mt-2">
          Feel free to reach out for collaboration or inquiries.
        </p>
      </header>

      <div className="bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
        <div className="flex flex-col md:flex-row items-center">
          {/* Left side with Name and Title */}
          <div className="md:w-1/2 text-center md:text-left mb-8 md:mb-0 space-y-2">
            <h2 className="text-3xl font-bold text-white flex items-center justify-center md:justify-start">
              <User size={28} className="mr-3 text-cyan-400" />
              {contactInfo.name}
            </h2>
            <p className="text-md text-slate-300 flex items-center justify-center md:justify-start">
              <Code size={16} className="mr-2 text-slate-400" />
              {contactInfo.title}
            </p>
            {/* --- NEW: Current Experience Section --- */}
            <p className="text-md text-slate-300 flex items-center justify-center md:justify-start">
              <Briefcase size={16} className="mr-2 text-slate-400" />
              {contactInfo.experience}
            </p>
            {/* --- UPDATED: Education Section --- */}
            {contactInfo.education.map((edu, index) => (
              <p key={index} className="text-md text-slate-300 flex items-center justify-center md:justify-start">
                <GraduationCap size={16} className="mr-2 text-slate-400" />
                {edu}
              </p>
            ))}
          </div>

          {/* Right side with Contact Details */}
          <div className="md:w-1/2 md:pl-8 space-y-4">
            <a href={`mailto:${contactInfo.personalEmail}`} className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <Mail size={20} className="mr-4 text-sky-400" />
              <div>
                <p className="font-semibold text-white">Personal Email</p>
                <p className="text-sm text-slate-300">{contactInfo.personalEmail}</p>
              </div>
            </a>
            <a href={`mailto:${contactInfo.schoolEmail}`} className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <GraduationCap size={20} className="mr-4 text-sky-400" />
              <div>
                <p className="font-semibold text-white">Fanshawe Email</p>
                <p className="text-sm text-slate-300">{contactInfo.schoolEmail}</p>
              </div>
            </a>
            <a href={`tel:${contactInfo.phone}`} className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <Phone size={20} className="mr-4 text-sky-400" />
              <div>
                <p className="font-semibold text-white">Phone</p>
                <p className="text-sm text-slate-300">{contactInfo.phone}</p>
              </div>
            </a>
            <a href={contactInfo.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <Globe size={20} className="mr-4 text-sky-400" />
              <div>
                <p className="font-semibold text-white">Web Portfolio</p>
                <p className="text-sm text-slate-300">{contactInfo.portfolio}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}