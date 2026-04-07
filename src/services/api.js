import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api', // Fallback to local
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling (optional extension point)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

export const fetchAppointments = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/appointments?${params}`);
    return response.data;
};

export default api;
