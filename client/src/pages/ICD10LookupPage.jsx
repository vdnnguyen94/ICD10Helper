// client/src/pages/ICD10LookupPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
// Corrected import: Added ListChecks
import { Search, AlertCircle, CheckCircle, Info, Eye, ChevronRight, ListCollapse, ListTree, EyeOff, ListChecks } from 'lucide-react';

// GraphQL Queries and Mutations
const GET_LOOKUP_COUNT = gql`
  query GetLookupCount {
    lookupCount
  }
`;

const INCREMENT_LOOKUP_COUNT = gql`
  mutation IncrementLookupCount {
    incrementLookupCount
  }
`;

const LOOKUP_DUAL_AI = gql`
  mutation LookupDualAI($term: String!) {
    lookupDualAI(term: $term) {
      codes {
        code
        type
        description
        notes
      }
      status
    }
  }
`;

// Data for example terminologies - moved here
const exampleCategories = [
  {
    title: "Common & External Causes",
    icon: ListTree, // Changed icon for variety
    color: "text-yellow-400",
    terms: [
      "Poisoning by Paracetamol, intentional self-harm",
      "Fall from balcony",
      "Struck by falling object",
      "Burn, second degree, of forearm"
    ]
  },
  {
    title: "NEC & Specific Conditions",
    icon: ListChecks, // This icon is now correctly imported
    color: "text-blue-400",
    terms: [
      "Pneumonia due to Klebsiella pneumoniae",
      "Viral gastroenteritis, unspecified",
      "Anemia in neoplastic disease (NEC)",
      "Urinary tract infection, site not specified"
    ]
  },
  {
    title: "Complex Terminology",
    icon: ListCollapse, // Changed icon
    color: "text-purple-400",
    terms: [
      "Myelopathy due to displaced cervical intervertebral disc",
      "Chronic kidney disease, stage 3, due to type 2 diabetes mellitus",
      "Acute on chronic systolic congestive heart failure",
      "Postoperative sepsis following abdominal surgery"
    ]
  }
];

// Component for rendering each example card - moved here
const ExampleCard = ({ category, onTermSelect }) => {
  const IconComponent = category.icon;
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700 hover:shadow-lg hover:border-slate-600 transition-all duration-300 flex flex-col">
      <div className="flex items-center mb-4">
        <IconComponent size={24} className={`${category.color} mr-3`} />
        <h3 className={`text-xl font-semibold ${category.color}`}>{category.title}</h3>
      </div>
      <ul className="space-y-3 flex-grow">
        {category.terms.map((term, index) => (
          <li key={index} className="text-sm text-slate-300 flex justify-between items-center">
            <span>{term}</span>
            <button
              onClick={() => onTermSelect(term)}
              className={`ml-2 p-2 rounded-md ${category.color.replace('text-', 'bg-')}/20 hover:${category.color.replace('text-', 'bg-')}/40 transition-colors`}
              title={`Lookup: ${term}`}
            >
              <ChevronRight size={18} className={category.color} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};


// Helper component to display individual AI results (same as before)
const AIResultCard = ({ result, modelName, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-700 p-6 rounded-lg shadow-lg w-full animate-pulse">
        <div className="h-6 bg-slate-600 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-600 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-slate-600 rounded w-3/4"></div>
      </div>
    );
  }

  if (!result || result.status === 'not_found' || !result.codes || result.codes.length === 0) {
    return (
      <div className="bg-slate-700 p-6 rounded-lg shadow-lg w-full">
        <div className="flex items-center mb-3">
          <AlertCircle className="text-red-400 mr-2" size={24} />
          <h3 className="text-xl font-semibold text-red-300">{modelName}</h3>
        </div>
        <p className="text-slate-300">No codes found or an error occurred.</p>
        {result && <p className="text-xs text-slate-400 mt-1">Status: {result.status}</p>}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-2xl w-full border border-slate-700 hover:shadow-cyan-500/30 transition-shadow duration-300">
      <div className="flex items-center mb-4">
        {modelName.toLowerCase().includes('openai') ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 mr-3"><path d="M18.29 10.21A5.5 5.5 0 0 0 12 5.5H7.71a5.5 5.5 0 0 0 0 11h4.29a5.5 5.5 0 0 0 5.5-5.5V9.5a1 1 0 0 0-1-1Z"/><path d="M12 16.5a5.5 5.5 0 0 0 5.5-5.5H12Z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mr-3"><path d="M12.545 2.83A10.39 10.39 0 0 0 7.687 21.17a10.393 10.393 0 0 0 13.486-7.077 10.393 10.393 0 0 0-7.077-13.486Z"/><path d="M12.545 2.83A10.39 10.39 0 0 1 17.402 16.09a10.393 10.393 0 0 1-13.486 7.077 10.393 10.393 0 0 1 7.077-13.486Z"/><path d="M12.545 2.83A10.39 10.39 0 0 0 7.687 21.17"/></svg>
        )}
        <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">{modelName}</h3>
      </div>
      {result.status === 'matched' && <CheckCircle className="text-green-500 mb-2" size={20} />}
      {result.status === 'partial' && <Info className="text-yellow-500 mb-2" size={20} />}
      <p className="text-sm text-slate-400 mb-3">Status: <span className={`font-medium ${result.status === 'matched' ? 'text-green-400' : result.status === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>{result.status}</span></p>
      {result.codes.map((codeItem, index) => (
        <div key={index} className="mb-4 p-4 bg-slate-700/50 rounded-md border border-slate-600">
          <p className="text-lg font-bold text-cyan-400">{codeItem.code}</p>
          <p className="text-sm text-slate-300 capitalize"><span className="font-semibold">Type:</span> {codeItem.type}</p>
          <p className="text-sm text-slate-300"><span className="font-semibold">Description:</span> {codeItem.description}</p>
          {codeItem.notes && <p className="text-xs text-slate-400 mt-1"><span className="font-semibold">Notes:</span> {codeItem.notes}</p>}
        </div>
      ))}
    </div>
  );
};

export default function ICD10LookupPage() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showExamples, setShowExamples] = useState(true); // State for example visibility
  const lookupSectionRef = useRef(null); // To scroll to results

  const { data: countData, loading: countLoading, error: countError } = useQuery(GET_LOOKUP_COUNT);
  const [incrementCount] = useMutation(INCREMENT_LOOKUP_COUNT, {
    refetchQueries: [{ query: GET_LOOKUP_COUNT }],
  });

  const [lookupDualAI, { loading: lookupLoading }] = useMutation(LOOKUP_DUAL_AI, {
    onCompleted: (data) => {
      setResults(data.lookupDualAI);
      setError(null);
      incrementCount(); 
      if (lookupSectionRef.current) {
         setTimeout(() => { 
            lookupSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    },
    onError: (err) => {
      setError(err.message);
      setResults(null);
      console.error("GraphQL Error on ICD10LookupPage:", err);
    },
  });

  const performLookup = (searchTermToLookup) => {
    if (!searchTermToLookup.trim()) {
      setError('Please enter a medical term to search for ICD-10 CA codes.');
      setResults(null);
      return;
    }
    setError(null);
    setResults(null); 
    lookupDualAI({ variables: { term: searchTermToLookup } });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performLookup(term);
  };

  const handleExampleTermSelect = (exampleTerm) => {
    setTerm(exampleTerm); 
    performLookup(exampleTerm); 
  };
  
  useEffect(() => {
    if (term && error) setError(null);
  }, [term, error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-500">
              ICD-10 CA Diagnosis Lookup
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mt-2">
            Enter a diagnosis term or use the examples to get AI-powered ICD-10 CA code suggestions.
          </p>
            {!countLoading && countData && (
                <div className="mt-4 text-sm text-sky-300">
                    <Eye size={16} className="inline mr-1" />
                    Total Lookups Performed: <span className="font-bold">{countData.lookupCount}</span>
                </div>
            )}
            {countError && <p className="text-xs text-red-400 mt-1">Could not load lookup count.</p>}
        </header>

        <div className="mb-6 text-center">
            <button
                onClick={() => setShowExamples(!showExamples)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sky-300 rounded-md text-sm flex items-center mx-auto"
            >
                {showExamples ? <EyeOff size={18} className="mr-2" /> : <Eye size={18} className="mr-2" />}
                {showExamples ? 'Hide Quick Examples' : 'Show Quick Examples'}
            </button>
        </div>

        {showExamples && (
            <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-6 text-center text-teal-400 flex items-center justify-center">
                    <ListTree size={24} className="mr-3 text-teal-500" /> {/* This was ListTree, could be Zap or another as well if preferred */}
                    Quick Lookup Examples (ICD-10 CA)
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {exampleCategories.map((category, index) => (
                        <ExampleCard key={index} category={category} onTermSelect={handleExampleTermSelect} />
                    ))}
                </div>
            </section>
        )}

        <section ref={lookupSectionRef} className="mb-12 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-teal-400 flex items-center">
            <Search size={28} className="mr-3 text-teal-500" />
            Find ICD-10 CA Code
          </h2>
          <form onSubmit={handleFormSubmit} className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter diagnosis (e.g., 'acute myocardial infarction')"
              className="flex-grow w-full sm:w-auto bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {lookupLoading ? ( 
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <Search size={20} className="mr-2" /> Lookup Diagnosis
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 text-red-300 border border-red-500 rounded-lg flex items-center">
              <AlertCircle size={20} className="mr-3 text-red-400" />
              {error}
            </div>
          )}
          
          {lookupLoading && (!results || results.length === 0) && (
             <div className="grid md:grid-cols-2 gap-8">
                <AIResultCard result={null} modelName="AI Model 1 (OpenAI GPT-4o)" isLoading={true} />
                <AIResultCard result={null} modelName="AI Model 2 (Gemini Pro)" isLoading={true} />
            </div>
          )}

          {!lookupLoading && results && Array.isArray(results) && (
            <div className="grid md:grid-cols-2 gap-8">
              <AIResultCard result={results[0]} modelName="AI Model 1 (OpenAI GPT-4o)" isLoading={false} />
              <AIResultCard result={results[1]} modelName="AI Model 2 (Gemini Pro)" isLoading={false} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}