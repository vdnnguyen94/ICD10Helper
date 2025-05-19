// client/src/pages/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Search, AlertCircle, CheckCircle, Info, Eye, Zap, ListChecks, BrainCog, ChevronRight } from 'lucide-react'; // Added Zap, ListChecks, BrainCog, ChevronRight

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

// Helper component to display individual AI results
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

  if (!result || result.status === 'not_found' || result.codes.length === 0) {
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

// Data for example terminologies
const exampleCategories = [
  {
    title: "Common & External Causes",
    icon: Zap,
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
    icon: ListChecks,
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
    icon: BrainCog,
    color: "text-purple-400",
    terms: [
      "Myelopathy due to displaced cervical intervertebral disc",
      "Chronic kidney disease, stage 3, due to type 2 diabetes mellitus",
      "Acute on chronic systolic congestive heart failure",
      "Postoperative sepsis following abdominal surgery"
    ]
  }
];

// Component for rendering each example card
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


export default function HomePage() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const lookupSectionRef = useRef(null); // Ref for scrolling

  // Query for lookup count
  const { data: countData, loading: countLoading, error: countError } = useQuery(GET_LOOKUP_COUNT);

  // Mutation for incrementing lookup count
  const [incrementCount] = useMutation(INCREMENT_LOOKUP_COUNT, {
    refetchQueries: [{ query: GET_LOOKUP_COUNT }],
  });

  // Mutation for AI lookup
  const [lookupDualAI, { loading: lookupLoading }] = useMutation(LOOKUP_DUAL_AI, {
    onCompleted: (data) => {
      setResults(data.lookupDualAI);
      setError(null);
      incrementCount(); 
    },
    onError: (err) => {
      setError(err.message);
      setResults(null);
      console.error("GraphQL Error:", err);
    },
  });

  const performLookup = (searchTerm) => {
    if (!searchTerm.trim()) {
      setError('Please enter a medical term to search.');
      setResults(null); // Clear previous results if search term is empty
      return;
    }
    setError(null); // Clear previous errors
    setResults(null); // Clear previous results before new search
    lookupDualAI({ variables: { term: searchTerm } });
    if (lookupSectionRef.current) {
      lookupSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performLookup(term);
  };

  const handleExampleTermSelect = (exampleTerm) => {
    setTerm(exampleTerm); // Set the input field with the example term
    performLookup(exampleTerm);
  };
  
  useEffect(() => {
    if (term) setError(null); // Clear error if user starts typing
  }, [term]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-500">
              ICD-10 CA Helper
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Streamline your medical coding with our AI-powered ICD-10 CA lookup tool. Get fast, accurate, and validated results from multiple AI models.
          </p>
        </header>

        {/* Overview/Benefits Section */}
        <section className="mb-16 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-cyan-400 flex items-center">
            <Info size={28} className="mr-3 text-cyan-500" />
            Why Choose ICD-10 CA Helper?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-slate-300">
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">Enhanced Accuracy</h3>
              <p>Leverage the power of leading AI models to find the most precise ICD-10 CA codes for any medical diagnosis.</p>
            </div>
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">Increased Efficiency</h3>
              <p>Save valuable time with rapid lookups, allowing medical coders and healthcare professionals to focus on patient care.</p>
            </div>
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">Dual AI Validation</h3>
              <p>Benefit from comparative results from two distinct AI models (OpenAI & Gemini), offering a robust validation layer for critical coding decisions.</p>
            </div>
            <div className="bg-slate-700/70 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2 text-sky-400">User-Friendly Interface</h3>
              <p>An intuitive and clean design makes navigating and utilizing the tool straightforward for all users.</p>
            </div>
          </div>
        </section>

        {/* Usage Counter Section */}
        <section className="mb-16 text-center">
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
        
        {/* Quick Lookup Examples Section - NEW */}
        <section className="mb-16">
            <h2 className="text-3xl font-semibold mb-8 text-center text-cyan-400 flex items-center justify-center">
                <Zap size={28} className="mr-3 text-cyan-500" />
                Quick Lookup Examples
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
                {exampleCategories.map((category, index) => (
                    <ExampleCard key={index} category={category} onTermSelect={handleExampleTermSelect} />
                ))}
            </div>
        </section>


        {/* Terminology Lookup Section */}
        <section ref={lookupSectionRef} className="mb-12 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-cyan-400 flex items-center">
            <Search size={28} className="mr-3 text-cyan-500" />
            Dual AI ICD-10 CA Code Lookup
          </h2>
          <form onSubmit={handleFormSubmit} className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter medical term (e.g., 'acute myocardial infarction')"
              className="flex-grow w-full sm:w-auto bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {lookupLoading && term ? ( // Show loading only if a term is being searched
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <Search size={20} className="mr-2" /> Check Terminology
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
          
          {/* Conditional rendering for loading state specifically for AI cards */}
          {lookupLoading && (!results || results.length === 0) && (
             <div className="grid md:grid-cols-2 gap-8">
                <AIResultCard result={null} modelName="AI Model 1 (OpenAI GPT-4o)" isLoading={true} />
                <AIResultCard result={null} modelName="AI Model 2 (Gemini Pro)" isLoading={true} />
            </div>
          )}

          {/* Render results only when not loading and results are available */}
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
