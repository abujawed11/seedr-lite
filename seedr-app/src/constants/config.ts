// Reads from .env.local or .env.production automatically.
// To switch environments, just change which .env file is active
// or set EXPO_PUBLIC_API_BASE_URL in your environment.
//
// Local dev:   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.7:5002  (.env.local)
// Production:  EXPO_PUBLIC_API_BASE_URL=https://mypeercloud.in   (.env.production)

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://mypeercloud.in';
