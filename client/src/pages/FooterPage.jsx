// client/src/components/Footer.jsx
import React, { useEffect, useState } from 'react';

const Footer = () => {
  const [name, setName] = useState('');

  useEffect(() => {
    fetch(import.meta.env.VITE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `{ hello }` }),
    })
      .then(res => res.json())
      .then(res => setName(res.data?.hello || ''))
      .catch(() => setName(''));
  }, []);

  return (
    <footer className="bg-slate-dark text-gray-400 text-center py-4 mt-auto">
      <div>
        Hello, I&apos;m {name} | Health System Management, Fanshawe College | Software Developer
      </div>
    </footer>
  );
};

export default Footer;
