// client/src/pages/DualLookupPage.jsx
import React, { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import "./DualLookupPage.css";

const LOOKUP_DUAL = gql`
  mutation LookupDual($term: String!) {
    lookupDualAI(term: $term) {
      openAI {
        codes { code type description notes }
        status
      }
      gemini {
        codes { code type description notes }
        status
      }
    }
  }
`;

const GET_COUNT = gql`
  query GetCount {
    lookupCount
  }
`;

const INC_COUNT = gql`
  mutation IncCount {
    incrementLookupCount
  }
`;

export default function DualLookupPage() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState("");

  const { data: countData, refetch: refetchCount } = useQuery(GET_COUNT);
  const [runLookup, { loading, error }] = useMutation(LOOKUP_DUAL, {
  onError(graphQLErrors, networkError) {
    console.group("✖️ lookupDualAI Error");
    console.log({ graphQLErrors, networkError });
    console.groupEnd();
  }
});
  const [incCount] = useMutation(INC_COUNT);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const { data } = await runLookup({ variables: { term } });
    setResults(data.lookupDualAI);
    await incCount();
    refetchCount();
  };

  const terminology = {
    "Easy Code": ["Headache", "Fever", "Sprain", "Burn", "Fracture"],
    "NEC Code": [
      "Skin lesion, NEC",
      "Joint disorder, NEC",
      "Cardiac anomaly, NEC",
      "Respiratory disorder, NEC",
      "Neurological disorder, NEC",
    ],
    "Complex Code": [
      "Myelopathy due to displaced cervical intervertebral disc",
    ],
  };

  return (
    <div className="dual-lookup-page">
      <h1>ICD-10-CA Helper</h1>

      <section className="overview">
        <h2>Overview</h2>
        <ul>
          <li>
            <strong>AI-powered dual-model lookup:</strong> OpenAI GPT-4o & Google
            Gemini 2.5 Pro
          </li>
          <li>
            <strong>Cross-validation:</strong> Comparing two AIs boosts confidence
            & accuracy versus a single model
          </li>
          <li>
            <strong>Time-saver:</strong> Instant ICD-10-CA suggestions instead of
            manual searches
          </li>
          <li>
            <strong>EHR-ready:</strong> Integrate via GraphQL or REST APIs
          </li>
        </ul>
      </section>

      <section className="terminology">
        <h2>Terminology Examples</h2>
        {Object.entries(terminology).map(([category, terms]) => (
          <div key={category}>
            <h3>{category}</h3>
            <ul>
              {terms.map((t) => (
                <li key={t}>
                  {t}{" "}
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(t)}
                  >
                    {copied === t ? "✔️" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <form className="lookup-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter diagnosis term..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Looking up…" : "Lookup"}
        </button>
      </form>

      {results && (
        <section className="results">
          <h2>Results for “{term}”</h2>
          <div className="ai-block">
            <h3>OpenAI GPT-4o ({results.openAI.status})</h3>
            <pre>{JSON.stringify(results.openAI.codes, null, 2)}</pre>
          </div>
          <div className="ai-block">
            <h3>Google Gemini 2.5 Pro ({results.gemini.status})</h3>
            <pre>{JSON.stringify(results.gemini.codes, null, 2)}</pre>
          </div>
          <div className="counter">
            Total lookups: <strong>{countData?.lookupCount}</strong>
          </div>
        </section>
      )}
    </div>
  );
}
