/**
 * Resolves backend URLs for API and Socket.IO.
 * Uses REACT_APP_* env vars when set; otherwise derives host from the browser
 * so LAN devices (e.g. http://10.x.x.x:3000) connect to the same host on port 5000.
 */
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT || '5000';

export const getServerBaseUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
  }
  return `http://localhost:${SERVER_PORT}`;
};

export const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  return `${getServerBaseUrl()}/api`;
};
