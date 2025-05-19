// client/src/App.jsx
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useLocation,
} from 'react-router-dom';
import './index.css';
import Footer from './pages/FooterPage'
import DualLookupPage from './pages/DualLookupPage';
import OutpatientPage from './pages/OutPatientPage';
import InpatientPage from './pages/InPatientPage';
import ContactPage from './pages/ContactPage';

const titles = {
  '/': 'ICD-10 Dual Lookup',
  '/outpatient': 'Outpatient Coding',
  '/inpatient': 'Inpatient Coding',
  '/contact': 'Contact Us',
};

function Header() {
  const { pathname } = useLocation();

}

function NavBar() {
  const linkClasses = ({ isActive }) =>
    `px-3 py-2 font-medium ${
      isActive
        ? 'border-b-2 border-cyan-accent text-white'
        : 'text-gray-400 hover:text-white'
    }`;

  return (
    <nav className="bg-slate-dark px-6 py-3 flex space-x-4">
      <NavLink to="/" end className={linkClasses}>
        Home
      </NavLink>
      <NavLink to="/outpatient" className={linkClasses}>
        Outpatient Coding
      </NavLink>
      <NavLink to="/inpatient" className={linkClasses}>
        Inpatient Coding
      </NavLink>
      <NavLink to="/contact" className={linkClasses}>
        Contact
      </NavLink>
    </nav>
  );
}



export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <Header />
        <main className="flex-1 px-4">
          <Routes>
            <Route path="/" element={<DualLookupPage />} />
            <Route path="/outpatient" element={<OutpatientPage />} />
            <Route path="/inpatient" element={<InpatientPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
