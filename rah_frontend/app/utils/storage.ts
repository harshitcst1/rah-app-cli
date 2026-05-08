import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@rah_auth_token';
const USER_KEY = '@rah_user';

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
};

