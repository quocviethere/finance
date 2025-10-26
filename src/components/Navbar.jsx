import React from 'react';
import './Navbar.css';
import { FiList, FiPieChart, FiCalendar } from 'react-icons/fi';
// import Sidebar from './Sidebar'; // Placeholder for future sidebar

function Navbar({ currentView, onChangeView }) {
  return (
    <header className="navbar">
      <h1 className="logo">Finance Tracker</h1>
      <nav className="nav-buttons">
        <button
          className={currentView === 'list' ? 'active' : ''}
          onClick={() => onChangeView('list')}
        >
          <FiList />
        </button>
        <button
          className={currentView === 'stats' ? 'active' : ''}
          onClick={() => onChangeView('stats')}
        >
          <FiPieChart />
        </button>
        <button
          className={currentView === 'calendar' ? 'active' : ''}
          onClick={() => onChangeView('calendar')}
        >
          <FiCalendar />
        </button>
      </nav>
    </header>
  );
}

export default Navbar; 