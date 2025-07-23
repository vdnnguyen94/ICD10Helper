// client/src/pages/CciSpecificSearchPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gql, useLazyQuery } from '@apollo/client';
import { Search, AlertCircle, Info, Loader, BookOpen, ListTree, Syringe } from 'lucide-react';

// GraphQL query to search for a CCI code
const CCI_SEARCH_BY_CODE = gql`
  query cciSearchByCode($code: String!) {
    cciSearchByCode(code: $code) {
      status
      items {
        code
        description
        includes
        excludes
        codeAlso
        note
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

// Regex to find and link CCI codes within text
const cciCodeRegex = /\b(\d+\.[A-Z]{2}\.\d+(?:\.[A-Z0-9]+(?:-[A-Z0-9]+)*)?)\b/g;

// Component to render text with clickable CCI codes
const ClickableText = ({ textArray }) => {
  if (!textArray || textArray.length === 0) return null;

  return (
    <ul className="list-disc list-inside space-y-1">
      {textArray.map((text, index) => {
        const parts = text.split(cciCodeRegex);
        return (
          <li key={index}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <a
                  key={i}
                  href={`/cci-specific-search/${part}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline font-mono"
                >
                  {part}
                </a>
              ) : (
                part
              )
            )}
          </li>
        );
      })}
    </ul>
  );
};

// Component to display the search results
const ResultDisplay = ({ data }) => {
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="p-4 bg-yellow-500/20 text-yellow-300 border border-yellow-500 rounded-lg flex items-center">
        <Info size={20} className="mr-3 text-yellow-400" />
        No rubric found for this code. Please check the code and try again.
      </div>
    );
  }

  const item = data.items[0];

  const renderAttributes = (domain) => {
    const attributesForDomain = item.allAttributes.filter(a => a.name === domain);
    if (attributesForDomain.length === 0) return null;
    
    const domainName = { S: "Status", L: "Location", E: "Extent" }[domain];
    const type = attributesForDomain[0].type;

    return (
        <div>
            <h4 className="text-lg font-semibold text-slate-300 mb-2">{domainName} ({domain}) - <span className="italic text-slate-400 text-sm">{type}</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {attributesForDomain.map(attr => (
                    <div key={attr.code} className="text-xs p-2 rounded bg-slate-600/50">
                        <p className="flex items-center">
                            <span className="font-mono bg-slate-500 text-sky-300 px-1.5 py-0.5 rounded mr-2">{attr.code}</span>
                            <span className="text-slate-300">{attr.description}</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
        {/* Main Info */}
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 font-mono">{item.code}</h2>
            <p className="text-xl text-slate-200 mt-1">{item.description}</p>
        </div>

        {/* Notes, Includes, Excludes, Code Also */}
        <div className="space-y-4">
             {item.note?.length > 0 && (
               <div className="text-sm text-slate-300 bg-slate-700/50 p-3 rounded-md">
                <strong className="text-slate-100">Notes:</strong>
                <ClickableText textArray={item.note} />
               </div>
            )}
            {item.includes?.length > 0 && (
               <div className="text-sm text-green-300 bg-green-900/30 p-3 rounded-md">
                <strong className="text-green-200">Includes:</strong>
                <ClickableText textArray={item.includes} />
               </div>
            )}
            {item.excludes?.length > 0 && (
               <div className="text-sm text-red-300 bg-red-900/30 p-3 rounded-md">
                <strong className="text-red-200">Excludes:</strong>
                <ClickableText textArray={item.excludes} />
               </div>
            )}
            {item.codeAlso?.length > 0 && (
               <div className="text-sm text-sky-300 bg-sky-900/30 p-3 rounded-md">
                <strong className="text-sky-200">Code Also:</strong>
                <ClickableText textArray={item.codeAlso} />
               </div>
            )}
        </div>

        {/* Qualifiers */}
        {item.otherQualifiers?.length > 0 && (
            <div>
                <h3 className="text-2xl font-semibold mb-3 text-white flex items-center"><ListTree size={22} className="mr-2 text-cyan-400" />Available Qualifiers</h3>
                <div className="space-y-2">
                    {item.otherQualifiers.map(q => (
                        <div key={q.code} className="p-3 bg-slate-700/60 rounded-lg">
                            <p className="font-mono text-cyan-300">{q.code}</p>
                            <p className="text-slate-300">{q.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Attributes */}
        {item.allAttributes?.length > 0 && (
            <div>
                 <h3 className="text-2xl font-semibold mb-4 text-white flex items-center"><Syringe size={22} className="mr-2 text-cyan-400" />Available Attributes</h3>
                 <div className="space-y-4">
                    {renderAttributes('S')}
                    {renderAttributes('L')}
                    {renderAttributes('E')}
                 </div>
            </div>
        )}
    </div>
  );
};

export default function CciSpecificSearchPage() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState(urlCode || '');
  const [error, setError] = useState('');

  const [runSearch, { loading, data, error: queryError }] = useLazyQuery(CCI_SEARCH_BY_CODE, {
    onCompleted: (result) => {
        if (result.cciSearchByCode.status === 'not_found') {
            setError(`No rubric found for code "${inputValue}".`);
        } else {
            setError('');
        }
    },
    onError: (err) => {
        setError(err.message);
    }
  });

  // Effect to run search if code exists in URL on page load
  useEffect(() => {
    if (urlCode) {
      setInputValue(urlCode);
      handleSearch(urlCode);
    }
  }, [urlCode]);

  const handleSearch = (codeToSearch) => {
    const codeRegex = /^\d+\.[A-Z]{2}\.\d+(?:\.[A-Z0-9]+)?$/;
    if (!codeRegex.test(codeToSearch)) {
      setError(`"${codeToSearch}" is not a valid CCI code format.`);
      return;
    }
    setError('');
    runSearch({ variables: { code: codeToSearch } });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputValue) {
      navigate(`/cci-specific-search/${inputValue}`);
      handleSearch(inputValue);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <header className="text-center mb-10">
            <h1 className="text-4xl font-extrabold flex items-center justify-center">
                <BookOpen size={36} className="mr-3 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400"/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
                CCI Rubric Lookup
                </span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto mt-2">
                Enter a specific CCI code to view its complete rubric details.
            </p>
        </header>

        <section className="mb-8 bg-slate-800/50 p-6 rounded-xl shadow-2xl border border-slate-700">
            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                placeholder="e.g., 3.IP.10.VX"
                className="flex-grow bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <Loader className="animate-spin mr-2" /> : <Search size={20} className="mr-2" />}
                Search
              </button>
            </form>
            {error && !loading && (
                 <div className="mt-4 p-3 bg-red-500/20 text-red-300 border border-red-500 rounded-lg flex items-center text-sm">
                    <AlertCircle size={18} className="mr-2 text-red-400" />{error}
                </div>
            )}
        </section>

        <section>
            {loading && (
                <div className="flex justify-center items-center p-8">
                    <Loader size={40} className="text-cyan-400 animate-spin" />
                    <p className="ml-4 text-lg">Loading Rubric...</p>
                </div>
            )}
            {queryError && !loading && (
                 <div className="p-4 bg-red-500/20 text-red-300 border border-red-500 rounded-lg flex items-center">
                    <AlertCircle size={20} className="mr-3 text-red-400" />
                    <strong>An error occurred:</strong> {queryError.message}
                </div>
            )}
            {data && !loading && !error && <ResultDisplay data={data.cciSearchByCode} />}
        </section>

      </div>
    </div>
  );
}