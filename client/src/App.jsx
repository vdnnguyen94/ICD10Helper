// client/src/App.jsx
import React from 'react'; // Removed useEffect, useState, useLocation as Header is simplified
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from 'react-router-dom';
import './index.css'; //
import Footer from './pages/FooterPage'; //
// Import the new page components
import HomePage from './pages/HomePage';
import ICD10LookupPage from './pages/ICD10LookupPage';
import CCILookupPage from './pages/CCILookupPage';
import OutpatientPage from './pages/OutPatientPage'; //
import InpatientPage from './pages/InPatientPage'; //
import ContactPage from './pages/ContactPage'; //

// The Header component was defined but not used in the previous App.jsx.
// If you intend to use it, you can re-implement its logic.
// For now, it's simplified or can be removed if not needed.
// function Header() {
//   const { pathname } = useLocation();
//   // Logic for dynamic titles based on pathname was here
// }

function NavBar() { //
  const linkClasses = ({ isActive }) =>
    `px-3 py-2 font-medium rounded-md text-sm transition-colors ${ // Added rounded-md and text-sm for better aesthetics
      isActive
        ? 'bg-sky-600 text-white' // Updated active style for more visibility
        : 'text-slate-300 hover:bg-slate-700 hover:text-white' // Updated hover for better feedback
    }`;

  return (
    <nav className="bg-slate-800 shadow-md px-4 sm:px-6 py-3"> {/* Darker background, shadow, responsive padding */}
      <div className="max-w-5xl mx-auto flex items-center justify-between"> {/* Centered and max-width */}
        {/* Optional: Add a brand/logo here */}
        {/* <div className="text-white font-bold text-xl">MedCode AI</div> */}
        <div className="flex space-x-2 sm:space-x-3"> {/* Responsive spacing */}
          <NavLink to="/" end className={linkClasses}>
            Home
          </NavLink>
          <NavLink to="/icd10-lookup" className={linkClasses}>
            ICD-10 CA Lookup
          </NavLink>
          {/* Placeholder for CCI Lookup link - we'll create this page next */}
          <NavLink to="/cci-lookup" className={linkClasses}>
            CCI Lookup
          </NavLink>
          {/* <NavLink to="/outpatient" className={linkClasses}>
            Outpatient Coding
          </NavLink>
          <NavLink to="/inpatient" className={linkClasses}>
            Inpatient Coding
          </NavLink> */}
          <NavLink to="/contact" className={linkClasses}>
            Contact
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default function App() { //
  return (
    <Router> {/* */}
      <div className="flex flex-col min-h-screen bg-slate-900"> {/* Ensure bg covers full screen */}
        <NavBar /> {/* */}
        {/* <Header />  The Header component is not currently rendering anything or being used. */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8"> {/* Added some padding to main content area */}
          <Routes> {/* */}
            <Route path="/" element={<HomePage />} />
            <Route path="/icd10-lookup" element={<ICD10LookupPage />} />
            {/* Placeholder route for CCI - to be created */}
            <Route path="/cci-lookup" element={<CCILookupPage />} />
            <Route path="/outpatient" element={<OutpatientPage />} /> {/* */}
            <Route path="/inpatient" element={<InpatientPage />} /> {/* */}
            <Route path="/contact" element={<ContactPage />} /> {/* */}
          </Routes>
        </main>
        <Footer /> {/* */}
      </div>
    </Router>
  );
}