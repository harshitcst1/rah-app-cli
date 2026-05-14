export const API_CONFIG = {
  baseURLs: [
    "http://192.168.1.107:8000/api", // Primary: Your Mac's Local IP
    "http://192.168.1.100:8000/api", // Secondary: Your other active interface
  ],
  timeout: 10000, // Reduced timeout so it fails over faster
};