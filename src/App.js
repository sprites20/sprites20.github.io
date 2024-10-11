import React from 'react';
import './App.css';
import Chatbox from './Chatbox';
import SideBox from './SideBox';

function App() {
  return (
    <div className="App">
      <div className="main-container">
        <Chatbox />
        <SideBox />
      </div>
    </div>
  );
}

export default App;
