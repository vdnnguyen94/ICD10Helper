// client/src/pages/IcdBlockSearchPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gql, useLazyQuery } from '@apollo/client';
import { Search, AlertCircle, Info, Loader, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';

// --- QUERIES ---
const GET_ICD_ABOVE = gql`
  query GetIcdAbove($code: String!) {
    getIcdAbove(code: $code) { code description includes excludes notes }
  }
`;
const GET_ICD_BELOW = gql`
  query GetIcdBelow($code: String!) {
    getIcdBelow(code: $code) { code description includes excludes notes }
  }
`;
// --- Use the NEW Smart Search Query ---
const SMART_SEARCH_CONTEXT = gql`
  query SmartSearchContext($code: String!) {
    smartSearchContext(code: $code) {
      code
      description
      includes
      excludes
      notes
    }
  }
`;

// --- NEW Detailed Result Card Component ---
const DetailedCodeCard = ({ item }) => {
    const NotAvailable = () => <span className="italic text-slate-500">Not Available</span>;

    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
            <div>
                <p className="font-mono text-cyan-400 font-bold text-lg">{item.code}</p>
                <p className="text-slate-200">{item.description}</p>
            </div>
            <div className="space-y-2 text-xs">
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


export default function IcdBlockSearchPage() {
  const { code: urlCode } = useParams();
  const [searchTerm, setSearchTerm] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [displayedCodes, setDisplayedCodes] = useState([]);

  // --- Update to use the new smart search query ---
  const [runSearch, { loading, error: queryError, data }] = useLazyQuery(SMART_SEARCH_CONTEXT, {
    onCompleted: (data) => {
        setDisplayedCodes(data.smartSearchContext);
        if (data.smartSearchContext.length > 0 && data.smartSearchContext[0].code !== searchTerm.toUpperCase()) {
            setError(`Code "${searchTerm.toUpperCase()}" not found. Showing closest match: ${data.smartSearchContext[0].code}`);
        } else {
            setError('');
        }
    },
    onError: (err) => {
        setError(err.message);
        setDisplayedCodes([]); // Clear previous results on error
    }
  });

  const [loadAbove, { loading: loadingAbove }] = useLazyQuery(GET_ICD_ABOVE, {
    onCompleted: (data) => setDisplayedCodes(current => [...data.getIcdAbove, ...current]),
    fetchPolicy: 'network-only'
  });
  const [loadBelow, { loading: loadingBelow }] = useLazyQuery(GET_ICD_BELOW, {
    onCompleted: (data) => setDisplayedCodes(current => [...current, ...data.getIcdBelow]),
    fetchPolicy: 'network-only'
  });
  
  useEffect(() => {
    if (urlCode) {
      handleSearch(urlCode);
    }
  }, [urlCode]);

  const handleSearch = (codeToSearch) => {
    const code = (codeToSearch || searchTerm).toUpperCase();
    if (!code) {
      setError('A code is required to search.');
      return;
    }
    runSearch({ variables: { code } });
  };

  const handleFormSubmit = (e) => { e.preventDefault(); handleSearch(); };
  const handleLoadAbove = () => displayedCodes.length > 0 && loadAbove({ variables: { code: displayedCodes[0].code } });
  const handleLoadBelow = () => displayedCodes.length > 0 && loadBelow({ variables: { code: displayedCodes[displayedCodes.length - 1].code } });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold flex items-center justify-center">
            <BookOpen size={36} className="mr-3 text-cyan-400"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
              ICD-10 CA Smart Search
            </span>
        </h1>
        <p className="text-lg text-slate-300 max-w-xl mx-auto mt-2">
            Enter a specific code to view its context. If not found, the closest match will be shown.
        </p>
      </header>

      <section className="mb-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter a single code (e.g., J44.9)"
                className="flex-grow bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-cyan-500 font-mono"
              />
              <button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center">
                {loading ? <Loader className="animate-spin mr-2" /> : <Search size={20} className="mr-2" />}
                Smart Search
              </button>
          </form>
           {/* Display GraphQL errors (like invalid format) in red, and informational "not found" messages in yellow */}
          {queryError && !loading && (
            <div className="mt-4 p-3 bg-red-500/20 text-red-300 border border-red-500 rounded-lg text-sm flex items-center">
              <AlertCircle size={18} className="mr-2" />{queryError.message}
            </div>
          )}
          {error && !queryError && !loading && (
             <div className="mt-4 p-3 bg-yellow-500/20 text-yellow-300 border border-yellow-500 rounded-lg text-sm flex items-center">
              <Info size={18} className="mr-2" />{error}
            </div>
          )}
      </section>

      <section>
          {loading && <div className="flex justify-center p-8"><Loader size={40} className="text-cyan-400 animate-spin" /></div>}
          {displayedCodes.length > 0 && (
              <div className="space-y-4">
                  <button onClick={handleLoadAbove} disabled={loadingAbove} className="w-full flex justify-center items-center py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-md text-sm text-sky-300">
                      {loadingAbove ? <Loader size={16} className="animate-spin" /> : <ChevronUp size={16} className="mr-2" />} Load 30 Above
                  </button>
                  
                  {displayedCodes.map(item => <DetailedCodeCard key={item.code} item={item} />)}

                  <button onClick={handleLoadBelow} disabled={loadingBelow} className="w-full flex justify-center items-center py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-md text-sm text-sky-300">
                    {loadingBelow ? <Loader size={16} className="animate-spin" /> : <ChevronDown size={16} className="mr-2" />} Load 30 Below
                  </button>
              </div>
          )}
      </section>
    </div>
  );
}