// client/src/pages/CCILookupPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Search, AlertCircle, CheckCircle, Info, Eye, ChevronRight, EyeOff, Activity, SlidersHorizontal, Syringe } from 'lucide-react'; // Ensure all used icons are here

// GraphQL Queries and Mutations (assuming these are already defined correctly)
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

const LOOKUP_DUAL_CCI = gql`
  mutation LookupDualCCI($term: String!) {
    lookupDualCCI(term: $term) {
      status
      codes {
        cciCode
        description
        notes
        breakdown {
          field1_section { code description }
          field2_anatomySite { code description }
          field3_intervention { code description }
          field4_qualifier1_approachTechnique { code description }
          field5_qualifier2_agentOrDevice { code description }
          field6_qualifier3_tissue { code description }
        }
      }
    }
  }
`;

// CCI-specific example categories (using the common procedure examples)
const cciExampleCategories = [
  {
    title: "Common Surgical Interventions",
    icon: SlidersHorizontal,
    color: "text-green-400",
    terms: [
      "Laparoscopic appendectomy for acute appendicitis",
      "Open repair of right inguinal hernia with synthetic mesh",
      "Laparoscopic cholecystectomy for cholelithiasis with cholecystitis",
      "Total knee arthroplasty, primary, right" 
    ]
  },
  {
    title: "Standard Diagnostic & Therapeutic",
    icon: Syringe,
    color: "text-orange-400",
    terms: [
      "Diagnostic colonoscopy to sigmoid colon",
      "Transfusion of 1 unit packed red blood cells",
      "Insertion of tympanostomy tube, bilateral (myringotomy)",
      "Upper gastrointestinal endoscopy with biopsy of stomach lesion"
    ]
  },
  {
    title: "Common Obstetrical Procedures",
    icon: Activity, // Consider a more specific icon like 'Baby' if available and preferred
    color: "text-pink-400",
    terms: [
        "Low transverse caesarean section for obstructed labour",
        "Spontaneous vaginal delivery with midline episiotomy and repair",
        "Diagnostic hysteroscopy with endometrial biopsy"
    ]
  }
];

// ExampleCard component (assuming it's defined as before)
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

// CCIResultCard component (assuming it's defined as before)
const CCIResultCard = ({ result, modelName, isLoading, isConfidentMatch }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-700 p-6 rounded-lg shadow-lg w-full animate-pulse">
        <div className="h-6 bg-slate-600 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-600 rounded w-full mt-4 mb-2"></div>
        <div className="h-3 bg-slate-600 rounded w-3/4 mb-4"></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="mt-2">
            <div className="h-3 bg-slate-600 rounded w-1/3 mb-1"></div>
            <div className="h-3 bg-slate-600 rounded w-1/2"></div>
          </div>
        ))}
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
        <p className="text-slate-300">No CCI codes found or an error occurred.</p>
        {result && <p className="text-xs text-slate-400 mt-1">Status: {result.status}</p>}
      </div>
    );
  }
  
  const codeItem = result.codes[0]; 
  if (!codeItem) {
     return (
      <div className="bg-slate-700 p-6 rounded-lg shadow-lg w-full">
        <h3 className="text-xl font-semibold text-red-300">{modelName} - Error</h3>
        <p className="text-slate-300">Received status '{result.status}' but no codes found.</p>
      </div>
    );
  }

  const breakdownFields = [
    { label: "Section", data: codeItem.breakdown?.field1_section },
    { label: "Anatomy Site", data: codeItem.breakdown?.field2_anatomySite },
    { label: "Intervention", data: codeItem.breakdown?.field3_intervention },
    { label: "Qualifier 1 (Approach/Technique)", data: codeItem.breakdown?.field4_qualifier1_approachTechnique },
    { label: "Qualifier 2 (Agent or Device)", data: codeItem.breakdown?.field5_qualifier2_agentOrDevice },
    { label: "Qualifier 3 (Tissue)", data: codeItem.breakdown?.field6_qualifier3_tissue },
  ];

  return (
    <div className={`p-6 rounded-lg shadow-2xl w-full border transition-shadow duration-300 ${isConfidentMatch ? "bg-green-900/30 border-green-500 hover:shadow-green-500/40" : "bg-slate-800 border-slate-700 hover:shadow-sky-500/30"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
            {modelName.toLowerCase().includes('openai') ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 mr-3"><path d="M18.29 10.21A5.5 5.5 0 0 0 12 5.5H7.71a5.5 5.5 0 0 0 0 11h4.29a5.5 5.5 0 0 0 5.5-5.5V9.5a1 1 0 0 0-1-1Z"/><path d="M12 16.5a5.5 5.5 0 0 0 5.5-5.5H12Z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mr-3"><path d="M12.545 2.83A10.39 10.39 0 0 0 7.687 21.17a10.393 10.393 0 0 0 13.486-7.077 10.393 10.393 0 0 0-7.077-13.486Z"/><path d="M12.545 2.83A10.39 10.39 0 0 1 17.402 16.09a10.393 10.393 0 0 1-13.486 7.077 10.393 10.393 0 0 1 7.077-13.486Z"/><path d="M12.545 2.83A10.39 10.39 0 0 0 7.687 21.17"/></svg>
            )}
            <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">{modelName}</h3>
        </div>
        {isConfidentMatch && (
          <div className="flex items-center text-sm text-green-400 bg-green-500/20 px-2 py-1 rounded-md">
            <CheckCircle size={16} className="mr-1.5" />
            High Confidence Match
          </div>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-1">Status: <span className={`font-medium ${result.status === 'matched' ? 'text-green-400' : result.status === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>{result.status}</span></p>
      <div className="mb-4 p-4 bg-slate-700/50 rounded-md border border-slate-600">
        <p className="text-xl font-bold text-sky-400 mb-1">{codeItem.cciCode}</p>
        <p className="text-sm text-slate-300 mb-3">{codeItem.description}</p>
        {codeItem.notes && <p className="text-xs text-slate-400 mt-1 italic"><span className="font-semibold">Notes:</span> {codeItem.notes}</p>}
      </div>
      <h4 className="text-md font-semibold text-slate-200 mb-2">Code Breakdown:</h4>
      <div className="space-y-2 text-sm">
        {breakdownFields.map((field, index) => (
          field.data && (field.data.code || field.data.description) ? (
            <div key={index} className="p-2 bg-slate-700/30 rounded">
              <span className="font-semibold text-slate-400">{field.label}: </span>
              <span className="text-slate-300">
                {field.data.code && <span className="font-mono bg-slate-600 px-1.5 py-0.5 rounded text-xs text-sky-300 mr-1">{field.data.code}</span>}
                {field.data.description || "N/A"}
              </span>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};


export default function CCILookupPage() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const lookupSectionRef = useRef(null);

  // New state for dynamic loading messages
  const [loadingMessage, setLoadingMessage] = useState("Searching...");

  const { data: countData, loading: countLoading, error: countError } = useQuery(GET_LOOKUP_COUNT);
  const [incrementCount] = useMutation(INCREMENT_LOOKUP_COUNT, {
    refetchQueries: [{ query: GET_LOOKUP_COUNT }],
  });

  const [lookupDualCCI, { loading: lookupLoading }] = useMutation(LOOKUP_DUAL_CCI, {
    onCompleted: (data) => {
      setResults(data.lookupDualCCI);
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
      console.error("GraphQL Error on CCILookupPage:", err);
    },
  });

  // Effect to cycle through loading messages
  useEffect(() => {
    let messageTimerId;
    if (lookupLoading) {
      const messages = [
        "Engaging AI Procedure Specialists...",
        "Deconstructing Intervention Query...",
        "Accessing CCI Classification...",
        "Validating Procedural Steps...",
        "Synthesizing Code Options...",
        "Cross-Checking with AI Partner...",
        "Preparing Final CCI Suggestions..."
      ];
      let currentMessageIndex = 0;
      setLoadingMessage(messages[currentMessageIndex]); // Set initial message

      const changeMessage = () => {
        currentMessageIndex = (currentMessageIndex + 1) % messages.length;
        setLoadingMessage(messages[currentMessageIndex]);
      };
      // Adjust interval as needed, e.g., 7-10 seconds for potentially long waits
      messageTimerId = setInterval(changeMessage, 12000); 
    } else {
      setLoadingMessage("Searching..."); // Reset to default
    }

    return () => {
      clearInterval(messageTimerId); // Cleanup interval
    };
  }, [lookupLoading]);

  const performLookup = (searchTermToLookup) => {
    if (!searchTermToLookup.trim()) {
      setError('Please enter an intervention or procedure term.');
      setResults(null);
      return;
    }
    setError(null);
    setResults(null);
    lookupDualCCI({ variables: { term: searchTermToLookup } });
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

  const isHighConfidenceMatch = results && results.length === 2 &&
    results[0]?.codes?.[0]?.cciCode &&
    results[0].codes[0].cciCode === results[1]?.codes?.[0]?.cciCode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">
              CCI Intervention Lookup
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mt-2">
            Enter an intervention/procedure or use examples to get AI-powered CCI code suggestions.
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
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-emerald-300 rounded-md text-sm flex items-center mx-auto"
          >
            {showExamples ? <EyeOff size={18} className="mr-2" /> : <Eye size={18} className="mr-2" />}
            {showExamples ? 'Hide Quick Examples' : 'Show Quick Examples'}
          </button>
        </div>

        {showExamples && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center text-emerald-400 flex items-center justify-center">
              <Activity size={24} className="mr-3 text-emerald-500" />
              Quick Lookup Examples (CCI)
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {cciExampleCategories.map((category, index) => (
                <ExampleCard key={index} category={category} onTermSelect={handleExampleTermSelect} />
              ))}
            </div>
          </section>
        )}

        <section ref={lookupSectionRef} className="mb-12 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-emerald-400 flex items-center">
            <Search size={28} className="mr-3 text-emerald-500" />
            Find CCI Code
          </h2>
          <form onSubmit={handleFormSubmit} className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter intervention (e.g., 'laparoscopic appendectomy')"
              className="flex-grow w-full sm:w-auto bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]" // Adjusted min-width for potentially longer text
            >
              {lookupLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loadingMessage} {/* Display dynamic loading message */}
                </>
              ) : (
                <>
                  <Search size={20} className="mr-2" /> Lookup Procedure
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
                <CCIResultCard result={null} modelName="AI Model 1 (OpenAI GPT-4o)" isLoading={true} isConfidentMatch={false} />
                <CCIResultCard result={null} modelName="AI Model 2 (Gemini Pro)" isLoading={true} isConfidentMatch={false} />
            </div>
          )}

          {!lookupLoading && results && Array.isArray(results) && (
            <div className="grid md:grid-cols-2 gap-8">
              <CCIResultCard result={results[0]} modelName="AI Model 1 (OpenAI GPT-4o)" isLoading={false} isConfidentMatch={isHighConfidenceMatch} />
              <CCIResultCard result={results[1]} modelName="AI Model 2 (Gemini Pro)" isLoading={false} isConfidentMatch={isHighConfidenceMatch} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}