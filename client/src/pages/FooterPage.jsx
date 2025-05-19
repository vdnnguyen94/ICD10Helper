// client/src/pages/FooterPage.jsx
import React, { useEffect, useState } from 'react';
import { gql, useApolloClient } from '@apollo/client'; // Import useApolloClient

// GraphQL Query to get the hello message
const GET_HELLO = gql`
  query GetHello {
    hello
  }
`;

const FooterPage = () => {
  const [developerName, setDeveloperName] = useState('Your Name'); // Default name
  const currentYear = new Date().getFullYear();
  const client = useApolloClient(); // Get Apollo Client instance

  useEffect(() => {
    const fetchName = async () => {
      try {
        // Use Apollo Client to fetch data
        const { data } = await client.query({
          query: GET_HELLO,
        });
        
        if (data && data.hello) {
          // Extract the name "VAN NGUYEN" from "Hello from VAN NGUYEN NestJS API"
          const fullMessage = data.hello;
          const parts = fullMessage.split('from ');
          if (parts.length > 1) {
            const nameAndApi = parts[1];
            const nameOnly = nameAndApi.split(' NestJS API')[0];
            if (nameOnly) {
              setDeveloperName(nameOnly.trim());
            } else {
              // Fallback if parsing fails but hello message exists
              setDeveloperName("Van Nguyen (Fallback)"); 
            }
          } else {
             // Fallback if "from " is not found
            setDeveloperName("Van Nguyen (Parsing Error)");
          }
        }
      } catch (error) {
        console.error('Error fetching developer name:', error);
        // Keep default or set a specific error name if preferred
        setDeveloperName('Van Nguyen (API Error)'); 
      }
    };

    fetchName();
  }, [client]); // Add client to dependency array

  return (
    <footer className="bg-slate-800 text-slate-400 py-6 shadow-inner mt-auto border-t border-slate-700">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">
          &copy; {currentYear} ICD-10 CA Helper by {developerName}. All Rights Reserved.
        </p>
        <p className="text-xs mt-1">
          Developed for Health System Management, Fanshawe College.
        </p>
        {/* You can add more links or information here if needed, for example:
          <div className="mt-2">
            <a href="/privacy-policy" className="text-slate-500 hover:text-sky-400 text-xs mx-2">Privacy Policy</a>
            <span className="text-slate-600">|</span>
            <a href="/terms-of-service" className="text-slate-500 hover:text-sky-400 text-xs mx-2">Terms of Service</a>
          </div>
        */}
      </div>
    </footer>
  );
};

export default FooterPage;
