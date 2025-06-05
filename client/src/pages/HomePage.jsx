// client/src/pages/HomePage.jsx
import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
// Corrected import: Added ChevronRight
import { Info, Eye, FileText, Stethoscope, ChevronRight } from 'lucide-react';

// GraphQL Query for lookup count
const GET_LOOKUP_COUNT = gql`
  query GetLookupCount {
    lookupCount
  }
`;

export default function HomePage() {
  // Query for lookup count
  const { data: countData, loading: countLoading, error: countError } = useQuery(GET_LOOKUP_COUNT);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-500">
              Medical Coding AI Assistant
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Streamline your medical coding with our AI-powered lookup tool. Get fast, accurate, and validated results from multiple AI models for both ICD-10 CA (diagnoses) and CCI (medical procedures).
          </p>
        </header>

        {/* Overview/Benefits Section */}
        <section className="mb-16 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-cyan-400 flex items-center">
            <Info size={28} className="mr-3 text-cyan-500" />
            Why Choose This Assistant?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-slate-300">
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">Enhanced Accuracy</h3>
              <p>Leverage leading AI models to find precise ICD-10 CA and CCI codes.</p>
            </div>
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">Increased Efficiency</h3>
              <p>Save valuable time with rapid lookups, focusing more on patient care and less on manual searches.</p>
            </div>
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">Dual AI Validation</h3>
              <p>Benefit from comparative results from two distinct AI models, offering a robust validation layer.</p>
            </div>
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">User-Friendly Interface</h3>
              <p>An intuitive design makes navigating and utilizing the tool straightforward for all users.</p>
            </div>
          </div>
        </section>

        {/* Usage Counter Section */}
        <section className="mb-12 text-center">
            <div className="inline-flex items-center bg-gradient-to-r from-sky-500 to-cyan-500 text-white py-4 px-8 rounded-lg shadow-xl">
                <Eye size={32} className="mr-4" />
                <div>
                    <p className="text-lg font-medium">Total Lookups Performed:</p>
                    {countLoading && <p className="text-3xl font-bold animate-pulse">Loading...</p>}
                    {countError && <p className="text-red-300 text-sm">Error loading count</p>}
                    {countData && !countLoading && !countError && (
                        <p className="text-4xl font-bold">{countData.lookupCount}</p>
                    )}
                </div>
            </div>
        </section>
        
        {/* Navigation Links to Lookup Tools */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-semibold mb-8 text-cyan-400">
            Begin Your Search
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* ICD-10 CA Link/Card */}
            <Link to="/icd10-lookup" className="group block bg-slate-800 hover:bg-slate-700/80 p-8 rounded-xl shadow-xl border border-slate-700 hover:border-teal-500 transition-all duration-300 transform hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <FileText size={48} className="mb-4 text-teal-400 group-hover:text-teal-300 transition-colors" />
                <h3 className="text-2xl font-semibold text-white mb-2">Diagnostic Coding</h3>
                <p className="text-slate-300 mb-4">Find ICD-10 CA codes for medical diagnoses using our dual AI lookup tool.</p>
                <span className="inline-flex items-center justify-center px-6 py-3 font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-lg group-hover:from-teal-600 group-hover:to-emerald-700 transition-colors">
                  Go to ICD-10 CA Lookup
                  <ChevronRight size={20} className="ml-2 -mr-1" />
                </span>
              </div>
            </Link>

            {/* CCI Link/Card */}
            <Link to="/cci-lookup" className="group block bg-slate-800 hover:bg-slate-700/80 p-8 rounded-xl shadow-xl border border-slate-700 hover:border-sky-500 transition-all duration-300 transform hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <Stethoscope size={48} className="mb-4 text-sky-400 group-hover:text-sky-300 transition-colors" />
                <h3 className="text-2xl font-semibold text-white mb-2">Medical Procedure Coding</h3>
                <p className="text-slate-300 mb-4">Find CCI codes for medical interventions and procedures with AI assistance.</p>
                <span className="inline-flex items-center justify-center px-6 py-3 font-medium text-white bg-gradient-to-r from-sky-500 to-cyan-600 rounded-lg group-hover:from-sky-600 group-hover:to-cyan-700 transition-colors">
                  Go to CCI Lookup
                  <ChevronRight size={20} className="ml-2 -mr-1" />
                </span>
              </div>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}