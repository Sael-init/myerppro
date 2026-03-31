// src/api/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para el Token (Migrado de tu config.js de React)
apiClient.interceptors.request.use((config) => {
    const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IjEwMDYiLCJuYmYiOjE3NjczNzUzMjEsImV4cCI6MTc5ODkxMTQ0MSwiaXNzIjoiZ2VzdGlvblhjb3JlLkFQSSIsImF1ZCI6Imdlc3Rpb25YY29yZS5DbGllbnRlcyJ9.G3B0pAsbsesQMdAz2ZTvPFPv6MXzY76dnFgF5LvaP9k"; // Luego lo moveremos a una cookie o estado
    if (TOKEN) {
        config.headers.Authorization = `Bearer ${TOKEN}`;
    }
    return config;
});

export default apiClient;