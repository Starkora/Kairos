import React from 'react';
import RecuperarPassword from '../components/RecuperarPassword';
import { useNavigate } from 'react-router-dom';

export default function RecuperarPasswordPage() {
  const navigate = useNavigate();
  return <RecuperarPassword onVolver={() => navigate('/login')} />;
}
