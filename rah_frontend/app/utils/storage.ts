import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@rah_auth_token';
const USER_KEY = '@rah_user';
const API_BASE_URL_KEY = '@rah_api_base_url';

export const Storage = {
  // Token management
  async saveToken(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async removeToken() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  // User data
  async saveUser(user: any) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  async removeUser() {
    await AsyncStorage.removeItem(USER_KEY);
  },

  // Clear all auth data
  async clearAuth() {
    if (typeof AsyncStorage.removeMany === "function") {
      await AsyncStorage.removeMany([TOKEN_KEY, USER_KEY]);
      return;
    }

    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  },

  // API host cache
  async saveApiBaseUrl(baseUrl: string) {
    await AsyncStorage.setItem(API_BASE_URL_KEY, baseUrl);
  },

  async getApiBaseUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(API_BASE_URL_KEY);
  },

  async removeApiBaseUrl() {
    await AsyncStorage.removeItem(API_BASE_URL_KEY);
  },
};

