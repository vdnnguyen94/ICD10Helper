// client/src/pages/IcdEnhancePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gql, useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { Search, AlertCircle, CheckCircle, Info, Activity, BrainCircuit, SlidersHorizontal, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
// --- GraphQL Queries for ICD-10-CA ---

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

// 1. For Vector Search Mode
const ICD_VECTOR_SEARCH = gql`
  query IcdVectorSearch($term: String!) { 
    icdVectorSearch(term: $term) {
      status
      searchTimeMs
      items {
        code
        description
        includes
        excludes
        notes
        similarityScore
      }
    }
  }
`;

// 2. For AI Coding Mode
const ICD_AI_FULL_PACKAGE = gql`
  query GetFullCodingPackage($term: String!) {
    getFullCodingPackage(term: $term) {
      processingTimeMs
      summary
      results {
        code
        description
        rationale
        diagnosisType
        diagnosisCluster
        prefix
        includes
        excludes
        notes
      }
    }
  }
`;
// --- Helper Result Components ---

// Renders a single result from the Vector Search
const IcdVectorResultCard = ({ item }) => (
  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-sky-500/50 transition-colors">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-lg font-bold text-sky-400 hover:text-sky-300">
            <Link to={`/icd-block-search/${item.code.substring(0, 3)}`}>
                {item.code}
            </Link>
        </h3>
        <p className="text-slate-300">{item.description}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-400">Similarity</p>
        <p className="text-lg font-bold text-sky-300">{(item.similarityScore * 100).toFixed(2)}%</p>
      </div>
    </div>
    {item.notes?.length > 0 && <div className="mt-3 text-xs italic text-slate-400 bg-slate-700/50 p-2 rounded"><strong>Notes:</strong> {item.notes.join('; ')}</div>}
    {item.includes?.length > 0 && <div className="mt-3 text-xs text-green-300 bg-green-900/30 p-2 rounded"><strong>Includes:</strong> {item.includes.join('; ')}</div>}
    {item.excludes?.length > 0 && <div className="mt-3 text-xs text-red-300 bg-red-900/30 p-2 rounded"><strong>Excludes:</strong> {item.excludes.join('; ')}</div>}
  </div>
);

// Renders a single, final code from the AI Coding package
const IcdFinalResultCard = ({ item, clusterColors }) => {
  const clusterClass = item.diagnosisCluster ? clusterColors[item.diagnosisCluster] || 'border-slate-600' : 'border-slate-600';
  const NotAvailable = () => <span className="italic text-slate-500">Not Available</span>;
  return (
    <div className={`bg-slate-800 p-4 rounded-lg border-l-4 ${clusterClass} border`}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold text-sky-400 hover:text-sky-300">
        <Link to={`/icd-block-search/${item.code.substring(0, 3)}`}>
            {item.code}
        </Link>
        </h3>
        <div className="flex items-center gap-2 text-sm">
          {item.prefix && <span className="font-mono bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-md text-xs">Prefix: {item.prefix}</span>}
          <span className="font-mono bg-sky-400/20 text-sky-300 px-2 py-0.5 rounded-md text-xs">Type: {item.diagnosisType}</span>
          {item.diagnosisCluster && <span className={`font-mono px-2 py-0.5 rounded-md text-xs ${clusterColors[item.diagnosisCluster].replace('border-', 'bg-').replace('500', '400/20')} ${clusterColors[item.diagnosisCluster].replace('border-', 'text-').replace('500', '300')}`}>Cluster: {item.diagnosisCluster}</span>}
        </div>
      </div>
      <p className="text-slate-300 mt-1">{item.description}</p>
      <div className="mt-3 bg-slate-700/50 p-3 rounded-md">
        <p className="font-semibold text-slate-200 mb-1 text-sm">AI's Rationale:</p>
        <p className="text-sm italic text-slate-300">"{item.rationale}"</p>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <div className="italic text-slate-400 bg-slate-700/50 p-2 rounded">
          <strong>Notes:</strong> {item.notes?.length > 0 ? item.notes.join('; ') : <NotAvailable />}
        </div>
        <div className="text-green-300 bg-green-900/30 p-2 rounded">
          <strong>Includes:</strong> {item.includes?.length > 0 ? item.includes.join('; ') : <NotAvailable />}
        </div>
        <div className="text-red-300 bg-red-900/30 p-2 rounded">
          <strong>Excludes:</strong> {item.excludes?.length > 0 ? item.excludes.join('; ') : <NotAvailable />}
        </div>
      </div>
    </div>
  );
};

// Renders the entire AI Coding package (summary + cards)
const IcdFinalPackageView = ({ data }) => {
  const clusterColors = {};
  const colors = ['border-purple-500', 'border-teal-500', 'border-pink-500', 'border-orange-500'];
  let colorIndex = 0;
  data.results.forEach(item => {
    if (item.diagnosisCluster && !clusterColors[item.diagnosisCluster]) {
      clusterColors[item.diagnosisCluster] = colors[colorIndex % colors.length];
      colorIndex++;
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-2xl font-semibold mb-3 text-emerald-300">AI Coding Summary</h3>
        <p className="text-slate-300">{data.summary}</p>
        <p className="text-xs text-slate-400 mt-2">Processing Time: {data.processingTimeMs}ms</p>
      </div>
      <div className="space-y-4">
        {data.results.map(item => <IcdFinalResultCard key={item.code} item={item} clusterColors={clusterColors} />)}
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
         <div key={i} className="bg-slate-700 p-4 rounded-lg w-full animate-pulse">
            <div className="h-5 bg-slate-600 rounded w-1/4 mb-3"></div>
            <div className="h-4 bg-slate-600 rounded w-full mb-4"></div>
            <div className="h-8 bg-slate-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
);

// --- Main Page Component ---
export default function IcdEnhancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('ai'); // 'ai', 'vector'
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const lookupSectionRef = useRef(null);

    useEffect(() => {
        setResults(null);
        setError(null);
    }, [searchMode]);

  const { data: countData } = useQuery(GET_LOOKUP_COUNT);
  const [incrementCount] = useMutation(INCREMENT_LOOKUP_COUNT, { refetchQueries: [{ query: GET_LOOKUP_COUNT }] });

  const onSearchCompleted = (data) => {
    const responseKey = Object.keys(data)[0];
    setResults(data[responseKey]);
    incrementCount();
    if (lookupSectionRef.current) {
      setTimeout(() => { lookupSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    }
  };
  
  const onSearchError = (err) => { setError(err.message); setResults(null); console.error("GraphQL Error:", err); };

  const [runVectorSearch, { loading: vectorLoading }] = useLazyQuery(ICD_VECTOR_SEARCH, { onCompleted: onSearchCompleted, onError: onSearchError });
  const [runAiSearch, { loading: aiLoading }] = useLazyQuery(ICD_AI_FULL_PACKAGE, { onCompleted: onSearchCompleted, onError: onSearchError });
  
  const isLoading = vectorLoading || aiLoading;

  const performLookup = (termToLookup) => {
      if (!termToLookup.trim()) { setError('Please enter a clinical scenario.'); setResults(null); return; }
      setError(null); setResults(null);
      const options = { variables: { term: termToLookup } };
      if (searchMode === 'vector') { runVectorSearch(options); } 
      else if (searchMode === 'ai') { runAiSearch(options); }
  };

  const handleFormSubmit = (e) => { e.preventDefault(); performLookup(searchTerm); };
  
  // Examples from your PowerPoint files
  const exampleTerms = [
    "A 15-year-old hockey player presented to the emergency department with cellulitis of his left elbow. The diagnosis was recorded by the physician as MRSA cellulitis",
    "A homeless person was admitted with pneumonia. Sputum cultures were positive, and the physician recorded the diagnosis on discharge as pneumonia, mycoplasma pneumoniae",
    "Second degree burn thigh from spilled coffee, less than 10% of body surface burned. Patient was drinking coffee at home.",
    "The patient is seen in emergency and admitted to surgery with a diagnosis of right lower quadrant abdominal pain. ?ectopic pregnancy, ?acute salpingitis",
    "Acute gastric ulcer with hematemesis due to (adverse affect) ibuprofen for arthritis.",
    "A 12-year-old boy was observed on the pediatric unit overnight for orchitis complications of mumps"
  ];

  const handleExampleClick = (term) => { setSearchTerm(term); performLookup(term); };
  
  useEffect(() => { if (searchTerm) setError(null); }, [searchTerm]);

  const renderResults = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (error) return <div className="p-4 bg-red-500/20 text-red-300 border border-red-500 rounded-lg flex items-center"><AlertCircle size={20} className="mr-3 text-red-400" />{error}</div>;
    if (!results) return null; // Exit if there are no results at all

    switch(searchMode) {
        case 'vector':
            // --- SAFETY CHECK ---
            // Only render if the 'results' object has the '.items' property.
            if (!results.items) return null; 
            return <div className="space-y-4">{results.items.map(item => <IcdVectorResultCard key={item.code} item={item} />)}</div>;

        case 'ai':
            // --- SAFETY CHECK ---
            // Only render if the 'results' object has the '.results' property.
            if (!results.results) return null;
            return <IcdFinalPackageView data={results} />;
            
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold"><span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Enhanced ICD-10 CA Search</span></h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mt-2">Use AI to generate a full coding package or perform a vector search for diagnoses.</p>
          {countData?.lookupCount && <div className="mt-4 text-sm text-sky-300"><Activity size={16} className="inline mr-1" />Total Lookups Performed: <span className="font-bold">{countData.lookupCount}</span></div>}
        </header>

        <section className="mb-12 text-center">
            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700"><div className="flex justify-center mb-4"><div className="p-3 bg-sky-500/10 rounded-full border border-sky-500/30"><Search size={24} className="text-sky-400" /></div></div><h3 className="text-xl font-bold mb-2 text-white">1. Vector Search</h3><p className="text-sm text-slate-300">Your query is vectorized to find the most semantically similar ICD-10 CA codes from the database.</p></div>
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700"><div className="flex justify-center mb-4"><div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/30"><BrainCircuit size={24} className="text-emerald-400" /></div></div><h3 className="text-xl font-bold mb-2 text-white">2. AI Analysis</h3><p className="text-sm text-slate-300">The AI reviews top results, deconstructs the scenario, and uses tools to find all necessary codes based on CIHI rules.</p></div>
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700"><div className="flex justify-center mb-4"><div className="p-3 bg-teal-500/10 rounded-full border border-teal-500/30"><SlidersHorizontal size={24} className="text-teal-400" /></div></div><h3 className="text-xl font-bold mb-2 text-white">3. Final Package</h3><p className="text-sm text-slate-300">The AI assembles a final package with codes, rationales, and diagnosis types for the coder's final review.</p></div>
            </div>
        </section>

        <section ref={lookupSectionRef} className="mb-12 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-teal-300 flex items-center"><LinkIcon size={28} className="mr-3 text-teal-400" />Find ICD-10 CA Code</h2>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button type="button" onClick={() => setSearchMode('ai')} className={`p-4 rounded-lg border-2 text-left transition-all ${searchMode === 'ai' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'}`}><h3 className="font-semibold text-white">AI Coding (Full Package)</h3><p className="text-xs text-slate-400">Generates a complete, rule-based coding package with rationales.</p></button>
                <button type="button" onClick={() => setSearchMode('vector')} className={`p-4 rounded-lg border-2 text-left transition-all ${searchMode === 'vector' ? 'border-sky-500 bg-sky-500/10' : 'border-slate-600 hover:border-slate-500'}`}><h3 className="font-semibold text-white">Vector Search Only</h3><p className="text-xs text-slate-400">Fast, similarity-based search for initial exploration.</p></button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start pt-4">
              <textarea value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter clinical scenario (e.g., 'cellulitis of left elbow, MRSA')" className="flex-grow w-full sm:w-auto bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors min-h-[80px] resize-y" rows="3"/>
              <button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px] h-[80px]">
                {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Searching...</>) : (<><Search size={20} className="mr-2" /> Search</>)}
              </button>
            </div>
            <div className="pt-2">
                <p className="text-sm text-slate-400 mb-3">Or try one of these examples:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exampleTerms.map((term, index) => (<button type="button" key={index} onClick={() => handleExampleClick(term)} title={term} className="text-left text-xs bg-slate-700/50 hover:bg-slate-600/80 border border-slate-600 rounded-md p-3 transition-colors text-slate-300 hover:text-white truncate"><strong className="text-teal-400">Example {index + 1}:</strong> {term}</button>))}
                </div>
            </div>
          </form>
          <div className="mt-8">{renderResults()}</div>
        </section>
      </div>
    </div>
  );
}