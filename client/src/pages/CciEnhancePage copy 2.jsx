// client/src/pages/CciEnhancePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gql, useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { Search, AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp, Activity, SlidersHorizontal, BrainCircuit, Users, Link as LinkIcon } from 'lucide-react';

// --- GraphQL Queries & Mutations ---

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

// 1. Vector Search Query
const VECTOR_SEARCH = gql`
  query CciEnhancedSearch($term: String!) {
    cciEnhancedSearch(term: $term) {
      status
      searchTimeMs
      items {
        code
        description
        includes
        excludes
        codeAlso
        note
        similarityScore
        otherQualifiers {
          code
          description
        }
        allAttributes {
          name
          code
          description
          type
        }
      }
    }
  }
`;

// 2. AI Enhanced Search (OpenAI) Query
const AI_ENHANCED_SEARCH = gql`
  query CciAiEnhancedSearch($term: String!) {
    cciAiEnhancedSearch(term: $term) {
      searchTimeMs
      items {
        code
        description
        includes
        excludes
        codeAlso
        notes
        isChosen
        reasoning
        similarityScore
        appliedQualifier {
          code
          description
        }
        appliedAttributes {
          S { code description }
          L { code description }
          E { code description }
        }
        otherQualifiers {
          code
          approach
          description
          includes
        }
        allAttributes {
          name
          code
          description
          type
        }
      }
    }
  }
`;

// 3. Dual AI Enhanced Search (OpenAI + Gemini) Query [MODIFIED]
// Added full rubric details to both `openai` and `gemini` fields for detailed display.
const DUAL_AI_ENHANCED_SEARCH = gql`
  query CciDualEnhancedSearch($term: String!) {
    cciDualEnhancedSearch(term: $term) {
      searchTimeMsOpenAI
      searchTimeMsGemini
      summary {
        totalCodes
        openaiChosenCount
        geminiChosenCount
        codesAgreed
        codesDisagreed
        fullMatches
        partialMatches
      }
      details {
        code
        chosenByOpenAI
        chosenByGemini
        qualifierMatch
        attributeMatch_S
        attributeMatch_L
        attributeMatch_E
        fullMatch
      }
      openai {
        code
        description
        isChosen
        reasoning
        includes
        excludes
        codeAlso
        notes
        appliedQualifier { code description }
        appliedAttributes {
          S { code description }
          L { code description }
          E { code description }
        }
      }
      gemini {
        code
        description
        isChosen
        reasoning
        includes
        excludes
        codeAlso
        notes
        appliedQualifier { code description }
        appliedAttributes {
          S { code description }
          L { code description }
          E { code description }
        }
      }
    }
  }
`;


// --- Helper Components for Results ---

// Regex to find CCI codes and make them clickable
const cciCodeRegex = /\b(\d+\.[A-Z]{2}\.\d+(?:\.[A-Z0-9]+(?:-[A-Z0-9]+)*)?)\b/g;
const ClickableText = ({ text, className }) => {
  if (!text) return null;
  const parts = text.split(cciCodeRegex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={`/cci-specific-search/${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
};


// Card for a single Vector Search result item
const VectorResultCard = ({ item }) => (
  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-sky-500/50 transition-colors">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-lg font-bold text-sky-400">
            <ClickableText text={item.code} />
        </h3>
        <p className="text-slate-300"><ClickableText text={item.description} /></p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-400">Similarity</p>
        <p className="text-lg font-bold text-sky-300">{(item.similarityScore * 100).toFixed(2)}%</p>
      </div>
    </div>
    {item.note?.length > 0 && (
       <div className="mt-3 text-xs italic text-slate-400 bg-slate-700/50 p-2 rounded">
        <strong>Notes:</strong> <ClickableText text={item.note.join('; ')} />
       </div>
    )}
    {item.includes?.length > 0 && (
       <div className="mt-3 text-xs text-green-300 bg-green-900/30 p-2 rounded">
        <strong>Includes:</strong> <ClickableText text={item.includes.join('; ')} />
       </div>
    )}
    {item.excludes?.length > 0 && (
       <div className="mt-3 text-xs text-red-300 bg-red-900/30 p-2 rounded">
        <strong>Excludes:</strong> <ClickableText text={item.excludes.join('; ')} />
       </div>
    )}
     {item.codeAlso?.length > 0 && (
        <div className="mt-3 text-xs text-sky-300 bg-sky-900/30 p-2 rounded">
            <strong>Code Also:</strong> <ClickableText text={item.codeAlso.join('; ')} />
        </div>
    )}
  </div>
);


// Card for a single AI Enhanced Search result item
const AiEnhancedResultCard = ({ item }) => (
  <div className={`p-4 rounded-lg border transition-colors ${item.isChosen ? 'bg-green-900/30 border-green-500' : 'bg-slate-800 border-slate-700 hover:border-emerald-500/50'}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-emerald-400">
            <ClickableText text={item.code} />
        </h3>
        {item.isChosen && (
            <span className="flex items-center text-sm text-green-300 bg-green-500/20 px-2 py-1 rounded-md">
                <CheckCircle size={16} className="mr-1.5" /> AI Recommended
            </span>
        )}
      </div>
      <p className="text-slate-300 mb-3"><ClickableText text={item.description} /></p>
      
      {item.isChosen && (
        <div className="space-y-3">
            <div className="bg-slate-700/50 p-3 rounded-md">
                <p className="font-semibold text-slate-200 mb-1">AI's Rationale:</p>
                <p className="text-sm italic text-slate-300">"{item.reasoning}"</p>
            </div>
            
            <div className="bg-slate-700/50 p-3 rounded-md">
                <p className="font-semibold text-slate-200 mb-2">Summary of AI Selections</p>
                <div className="space-y-2">
                    {item.appliedQualifier?.code && (
                        <div>
                            <p className="text-sm font-semibold text-slate-400">Applied Qualifier:</p>
                            <p className="text-sm text-slate-300">
                                <span className="font-mono bg-slate-600 px-1.5 py-0.5 rounded text-xs text-sky-300 mr-2">{item.appliedQualifier.code}</span>
                                {item.appliedQualifier.description}
                            </p>
                        </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-400 mb-1">Applied Attributes:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {['S', 'L', 'E'].map(attrKey => (
                              <div key={attrKey}>
                                  <p className="text-xs font-semibold text-slate-400">{ {S: "Status", L: "Location", E: "Extent"}[attrKey] }</p>
                                  {item.appliedAttributes?.[attrKey] ? (
                                      <p className="text-xs text-slate-300">
                                          <span className="font-mono bg-slate-600 px-1 py-0.5 rounded text-xs text-sky-300 mr-1.5">{item.appliedAttributes[attrKey].code}</span>
                                          {item.appliedAttributes[attrKey].description}
                                      </p>
                                  ) : <p className="text-xs text-slate-500">N/A</p>}
                              </div>
                          ))}
                      </div>
                    </div>
                </div>
            </div>

            {/* --- Full Rubric Details Section --- */}
            <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                <h4 className="text-md font-semibold text-slate-200">Full Rubric Details</h4>

                {item.notes?.length > 0 && (
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <p className="font-semibold text-slate-300 mb-1">Notes:</p>
                        <ClickableText text={item.notes.join('; ')} className="text-sm text-slate-300" />
                    </div>
                )}
                {item.includes?.length > 0 && (
                    <div className="bg-green-900/20 p-3 rounded-md">
                        <p className="font-semibold text-green-300 mb-1">Includes:</p>
                         <ClickableText text={item.includes.join('; ')} className="text-sm text-green-400" />
                    </div>
                )}
                {item.excludes?.length > 0 && (
                    <div className="bg-red-900/20 p-3 rounded-md">
                        <p className="font-semibold text-red-300 mb-1">Excludes:</p>
                        <ClickableText text={item.excludes.join('; ')} className="text-sm text-red-400" />
                    </div>
                )}
                {item.codeAlso?.length > 0 && (
                    <div className="bg-sky-900/20 p-3 rounded-md">
                        <p className="font-semibold text-sky-300 mb-1">Code Also:</p>
                         <ClickableText text={item.codeAlso.join('; ')} className="text-sm text-sky-400" />
                    </div>
                )}
            </div>
        </div>
      )}
  </div>
);

// --- NEW: Component to display a single, detailed Dual AI result ---
const DualAiDetailCard = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(item.isChosen); // Chosen items are expanded by default

    const { openAiItem, geminiItem } = item;
    const isChosenByOpenAI = openAiItem?.isChosen;
    const isChosenByGemini = geminiItem?.isChosen;

    const renderRationale = (aiItem, aiName, color) => {
        if (!aiItem?.isChosen) return null;
        return (
            <div className={`bg-slate-700/50 p-3 rounded-md border-l-4 ${color}`}>
                <p className="font-semibold text-slate-200 mb-1">{aiName}'s Rationale:</p>
                <p className="text-sm italic text-slate-300">"{aiItem.reasoning}"</p>
            </div>
        )
    };
    
    // Use description from either AI, preferring the one that chose the code
    const description = (isChosenByOpenAI ? openAiItem.description : geminiItem?.description) || openAiItem?.description;
    const includes = (isChosenByOpenAI ? openAiItem.includes : geminiItem?.includes) || openAiItem?.includes;
    const excludes = (isChosenByOpenAI ? openAiItem.excludes : geminiItem?.excludes) || openAiItem?.excludes;
    const notes = (isChosenByOpenAI ? openAiItem.notes : geminiItem?.notes) || openAiItem?.notes;
    const codeAlso = (isChosenByOpenAI ? openAiItem.codeAlso : geminiItem?.codeAlso) || openAiItem?.codeAlso;

    return (
        <div className={`rounded-lg border transition-colors ${item.isChosen ? 'bg-slate-800 border-purple-500/50' : 'bg-slate-800/60 border-slate-700'}`}>
            <button className="w-full p-4 text-left flex justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <h3 className="text-lg font-bold text-purple-400">
                        <ClickableText text={item.code} />
                    </h3>
                    <p className="text-slate-300 text-sm mt-1"><ClickableText text={description} /></p>
                </div>
                <div className="flex items-center gap-4">
                    {isChosenByOpenAI && <span title="Chosen by OpenAI" className="text-green-400"><CheckCircle /></span>}
                    {isChosenByGemini && <span title="Chosen by Gemini" className="text-blue-400"><CheckCircle /></span>}
                    {isExpanded ? <ChevronUp size={24} className="text-slate-400"/> : <ChevronDown size={24} className="text-slate-400"/>}
                </div>
            </button>
            
            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-4">
                    {/* --- Rationales --- */}
                    <div className="space-y-3">
                       {renderRationale(openAiItem, "OpenAI", "border-green-500")}
                       {renderRationale(geminiItem, "Gemini", "border-blue-500")}
                    </div>
                     
                    {/* --- Rubric Details --- */}
                     <div className="space-y-3">
                         {notes?.length > 0 && (
                            <div className="bg-slate-700/50 p-3 rounded-md">
                                <p className="font-semibold text-slate-300 mb-1">Notes:</p>
                                <ClickableText text={notes.join('; ')} className="text-sm text-slate-300" />
                            </div>
                        )}
                        {includes?.length > 0 && (
                            <div className="bg-green-900/20 p-3 rounded-md">
                                <p className="font-semibold text-green-300 mb-1">Includes:</p>
                                <ClickableText text={includes.join('; ')} className="text-sm text-green-400" />
                            </div>
                        )}
                        {excludes?.length > 0 && (
                            <div className="bg-red-900/20 p-3 rounded-md">
                                <p className="font-semibold text-red-300 mb-1">Excludes:</p>
                                <ClickableText text={excludes.join('; ')} className="text-sm text-red-400" />
                            </div>
                        )}
                        {codeAlso?.length > 0 && (
                            <div className="bg-sky-900/20 p-3 rounded-md">
                                <p className="font-semibold text-sky-300 mb-1">Code Also:</p>
                                <ClickableText text={codeAlso.join('; ')} className="text-sm text-sky-400" />
                            </div>
                        )}
                     </div>
                </div>
            )}
        </div>
    )
}


// Component to display Dual AI comparison results [REVISED]
const DualAiResultView = ({ data }) => {
    const { summary, details, openai, gemini } = data;
    
    // Create maps for easy lookup
    const aiMap = new Map(openai.map(item => [item.code, item]));
    const geminiMap = new Map(gemini.map(item => [item.code, item]));

    // Consolidate all data into a single array for easier rendering
    const allCodes = Array.from(new Set([...openai.map(i => i.code), ...gemini.map(i => i.code)]));

    const combinedResults = allCodes.map(code => {
        const detail = details.find(d => d.code === code) || {};
        const openAiItem = aiMap.get(code);
        const geminiItem = geminiMap.get(code);
        return {
            code,
            isChosen: detail.chosenByOpenAI || detail.chosenByGemini,
            openAiItem,
            geminiItem,
        };
    });

    // Sort to put all chosen items at the top
    combinedResults.sort((a, b) => b.isChosen - a.isChosen);

    return (
        <div className="space-y-8">
            {/* 1. Summary Card */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-2xl font-semibold text-center mb-4 text-purple-400">Dual AI Comparison Summary</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <p className="text-sm text-slate-400">Total Codes Analyzed</p>
                        <p className="text-2xl font-bold text-white">{summary.totalCodes}</p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <p className="text-sm text-slate-400">Recommendations</p>
                        <p className="text-2xl font-bold text-green-400">{summary.codesAgreed}</p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <p className="text-sm text-slate-400">Disagreements</p>
                        <p className="text-2xl font-bold text-yellow-400">{summary.codesDisagreed}</p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-md">
                        <p className="text-sm text-slate-400">Full Matches</p>
                        <p className="text-2xl font-bold text-cyan-400">{summary.fullMatches}</p>
                    </div>
                </div>
            </div>

            {/* 2. Detailed Comparison List */}
            <div>
                 <h3 className="text-xl font-semibold mb-4 text-purple-300">Detailed Breakdown</h3>
                 <div className="space-y-4">
                     {combinedResults.map(item => <DualAiDetailCard key={item.code} item={item} />)}
                 </div>
            </div>
        </div>
    );
};

const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
         <div key={i} className="bg-slate-700 p-4 rounded-lg shadow-lg w-full animate-pulse">
            <div className="h-5 bg-slate-600 rounded w-1/4 mb-3"></div>
            <div className="h-4 bg-slate-600 rounded w-full mb-4"></div>
            <div className="h-8 bg-slate-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
);


// --- Main Page Component ---

export default function CciEnhancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('openai'); // 'vector', 'openai', 'dual'
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const lookupSectionRef = useRef(null);

  const { data: countData } = useQuery(GET_LOOKUP_COUNT);
  const [incrementCount] = useMutation(INCREMENT_LOOKUP_COUNT, {
    refetchQueries: [{ query: GET_LOOKUP_COUNT }],
  });

  // --- Lazy Query Hooks for Search ---

  const onSearchCompleted = (data) => {
    const responseKey = Object.keys(data)[0];
    setResults(data[responseKey]);
    incrementCount();
    if (lookupSectionRef.current) {
      setTimeout(() => {
        lookupSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const onSearchError = (err) => {
    setError(err.message);
    setResults(null);
    console.error("GraphQL Error on CciEnhancePage:", err);
  };

  const [runVectorSearch, { loading: vectorLoading }] = useLazyQuery(VECTOR_SEARCH, {
    onCompleted: onSearchCompleted,
    onError: onSearchError,
  });

  const [runAiSearch, { loading: aiLoading }] = useLazyQuery(AI_ENHANCED_SEARCH, {
    onCompleted: onSearchCompleted,
    onError: onSearchError,
  });

  const [runDualSearch, { loading: dualLoading }] = useLazyQuery(DUAL_AI_ENHANCED_SEARCH, {
    onCompleted: onSearchCompleted,
    onError: onSearchError,
  });
  
  const isLoading = vectorLoading || aiLoading || dualLoading;

  const performLookup = (termToLookup) => {
      if (!termToLookup.trim()) {
        setError('Please enter a search term.');
        setResults(null);
        return;
      }
      setError(null);
      setResults(null);

      const options = { variables: { term: termToLookup } };

      if (searchMode === 'vector') {
        runVectorSearch(options);
      } else if (searchMode === 'openai') {
        runAiSearch(options);
      } else if (searchMode === 'dual') {
        runDualSearch(options);
      }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performLookup(searchTerm);
  };

  const exampleTerms = [
    "Arthrotomy of right knee with total excision of right medial meniscus and patellar shaving",
    "Tetanus booster injection, following puncture of left foot (< 5 cm) on rusty nail, cleansing and suture of injury",
    "Systemic (intravenous –IV) chemotherapy with methotrexate",
    "Patient is brought the cardiac cath room from emergency with a diagnosis of STEMI. No thrombolysis. Coronary angiograms taken; balloon dilation and stent insertion. LAD and Cx coronary arteries, with intracoronary catheter-directed infusion of streptokinase; femoral artery approach."
  ];

  const handleExampleClick = (term) => {
    setSearchTerm(term);
    performLookup(term);
  };
  
  useEffect(() => {
    if (searchTerm) setError(null);
  }, [searchTerm]);

  const renderResults = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (error) return (
        <div className="p-4 bg-red-500/20 text-red-300 border border-red-500 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-3 text-red-400" />{error}
        </div>
    );
    if (!results) return null;
    if (results.status === 'not_found' || !results.items?.length && !results.details?.length) {
        return (
            <div className="p-4 bg-yellow-500/20 text-yellow-300 border border-yellow-500 rounded-lg flex items-center">
                <Info size={20} className="mr-3 text-yellow-400" />No results found for the given term.
            </div>
        );
    }
    
    switch(searchMode) {
        case 'vector':
            return <div className="space-y-4">{results.items.map(item => <VectorResultCard key={item.code} item={item} />)}</div>;
        case 'openai':
            return <div className="space-y-4">{results.items.map(item => <AiEnhancedResultCard key={item.code} item={item} />)}</div>;
        case 'dual':
            return <DualAiResultView data={results} />;
        default:
            return null;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
              Enhanced CCI Search
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mt-2">
            Leverage Vector Search and Generative AI for advanced CCI code discovery and validation.
          </p>
          {countData?.lookupCount && (
            <div className="mt-4 text-sm text-sky-300">
              <Activity size={16} className="inline mr-1" />
              Total Lookups Performed: <span className="font-bold">{countData.lookupCount}</span>
            </div>
          )}
        </header>

        {/* How It Works Section */}
        <section className="mb-12 text-center">
            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-sky-500/10 rounded-full border border-sky-500/30">
                            <Search size={24} className="text-sky-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">1. Initial Vector Search</h3>
                    <p className="text-sm text-slate-300">
                        Our search begins by vectorizing your query to find the most semantically similar rubrics from our CIHI database, returning the top 50 matches.
                    </p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                            <BrainCircuit size={24} className="text-emerald-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">2. AI-Powered Analysis</h3>
                    <p className="text-sm text-slate-300">
                        The AI analyzes the top results, reading rubric details like 'Notes,' 'Includes,' and 'Code Also,' while using 'Excludes' rules to eliminate incorrect codes.
                    </p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-full border border-purple-500/30">
                            <SlidersHorizontal size={24} className="text-purple-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">3. Detailed Coder Review</h3>
                    <p className="text-sm text-slate-300">
                        We return results with detailed documentation, including AI rationale, qualifiers, and attributes, for the Coder to make a final, informed judgment.
                    </p>
                </div>
            </div>
        </section>

        <section ref={lookupSectionRef} className="mb-12 bg-slate-800/50 p-8 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-cyan-300 flex items-center">
            <LinkIcon size={28} className="mr-3 text-cyan-400" />
            Find CCI Code
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Search Mode Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button type="button" onClick={() => setSearchMode('openai')} className={`p-4 rounded-lg border-2 text-left transition-all ${searchMode === 'openai' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <h3 className="font-semibold text-white">AI Enhanced (OpenAI)</h3>
                    <p className="text-xs text-slate-400">Detailed recommendations with qualifiers and attributes.</p>
                </button>
                <button type="button" onClick={() => setSearchMode('dual')} className={`p-4 rounded-lg border-2 text-left transition-all ${searchMode === 'dual' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <h3 className="font-semibold text-white">Dual AI Comparison</h3>
                    <p className="text-xs text-slate-400">Validate results by comparing OpenAI and Gemini models.</p>
                </button>
                <button type="button" onClick={() => setSearchMode('vector')} className={`p-4 rounded-lg border-2 text-left transition-all ${searchMode === 'vector' ? 'border-sky-500 bg-sky-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <h3 className="font-semibold text-white">Vector Search Only</h3>
                    <p className="text-xs text-slate-400">Fast, similarity-based search for initial exploration.</p>
                </button>
            </div>

            {/* Input and Submit */}
            <div className="flex flex-col sm:flex-row gap-4 items-start pt-4">
              <textarea
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter clinical term (e.g., 'endoscopic dilation of esophagus')"
                className="flex-grow w-full sm:w-auto bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors min-h-[80px] resize-y"
                rows="3"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px] h-[80px]"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={20} className="mr-2" /> Search
                  </>
                )}
              </button>
            </div>
            
            {/* Example prompts section */}
            <div className="pt-2">
                <p className="text-sm text-slate-400 mb-3">Or try one of these examples:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exampleTerms.map((term, index) => (
                        <button
                            type="button"
                            key={index}
                            onClick={() => handleExampleClick(term)}
                            title={term}
                            className="text-left text-xs bg-slate-700/50 hover:bg-slate-600/80 border border-slate-600 rounded-md p-3 transition-colors text-slate-300 hover:text-white truncate"
                        >
                            <strong className="text-cyan-400">Example {index + 1}:</strong> {term}
                        </button>
                    ))}
                </div>
            </div>
          </form>

          <div className="mt-8">
            {renderResults()}
          </div>

        </section>
      </div>
    </div>
  );
}