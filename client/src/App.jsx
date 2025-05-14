import { useEffect, useState } from 'react';

function App() {
  const [data, setData] = useState('Loading...');

  useEffect(() => {
    fetch(import.meta.env.VITE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            hello
          }
        `
      })
    })
      .then(res => res.json())
      .then(result => setData(result?.data?.hello || 'No data'));
  }, []);

  return (
    <div>
      <h1>Medical Coder Frontend</h1>
      <p>API says: {data}</p>
    </div>
  );
}

export default App;
