import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignUp from './components/SignUp';
import Boards from './components/Boards';
import Board from './components/Board';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/boards"
          element={
            <PrivateRoute>
              <Boards />
            </PrivateRoute>
          }
        />
        <Route
          path="/board/:boardId"
          element={
            <PrivateRoute>
              <Board />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App; 