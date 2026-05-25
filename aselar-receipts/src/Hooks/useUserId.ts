// hooks/useUserId.ts
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api'; // Adjust
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true // Auto-sends cookies
});

export const useUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await api.get<{ id: string }>('/me'); // Cookie-validated
        setUserId(res.data.id);
      } catch (error) {
        console.error('Fetch userId failed:', error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          navigate('/sign-in', { replace: true });
        }
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, [navigate]);

  return { userId, loading };
};