import { API_CONFIG } from '../config/api';
import { Storage } from '../utils/storage';

class ApiClient {
  private baseURLs = API_CONFIG.baseURLs;
  private requestTimeout = API_CONFIG.timeout;
  private resolvedBaseURL: string | null = null;

  // Endpoints that don't require authentication
  private publicEndpoints = [
    '/login/start',
    '/login/password',
    '/login/verify',
    '/login/resend',
    '/register/start',
    '/register/resend',
    '/register/complete',
  ];

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isPublicEndpoint = this.publicEndpoints.includes(endpoint);
    const token = isPublicEndpoint ? null : await Storage.getToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await this.fetchWithFallback(endpoint, options, headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          if (!isPublicEndpoint) {
            await Storage.clearAuth();
            throw new Error('Session expired. Please login again.');
          }

          throw new Error(
            errorData.error || errorData.message || 'Invalid credentials or verification code.'
          );
        }
        throw new Error(errorData.error || errorData.message || 'Request failed');
      }

      const data = await response.json();

      return data;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  private async fetchWithFallback(
    endpoint: string,
    options: RequestInit,
    headers: Record<string, string>
  ) {
    const candidateURLs = this.resolvedBaseURL
      ? [this.resolvedBaseURL, ...this.baseURLs.filter((url) => url !== this.resolvedBaseURL)]
      : this.baseURLs;

    let lastError: unknown = null;

    for (const baseURL of candidateURLs) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const response = await fetch(`${baseURL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        this.resolvedBaseURL = baseURL;
        return response;
      } catch (error) {
        console.warn(`API: Failed to reach ${baseURL}${endpoint}`, error);
        lastError = error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('Unable to reach the backend server.');
  }

  // ========================================================================
  // AUTH ENDPOINTS
  // ========================================================================

  async registerStart(data: {
    name: string;
    phone: string;
    password: string;
    city?: string;
  }) {
    return this.request<{ ok: boolean; registration_id: string }>(
      '/register/start',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async registerResend(registrationId: string) {
    return this.request('/register/resend', {
      method: 'POST',
      body: JSON.stringify({ registration_id: registrationId }),
    });
  }

  async registerComplete(registrationId: string, otp: string) {
    const data = await this.request<{
      ok: boolean;
      token: string;
      user: any;
    }>('/register/complete', {
      method: 'POST',
      body: JSON.stringify({ registration_id: registrationId, otp }),
    });

    if (data.token) {
      await Storage.saveToken(data.token);
      await Storage.saveUser(data.user);
    }

    return data;
  }

  async loginStart(phone: string) {
    return this.request<{ ok: boolean; login_id: string }>(
      '/login/start',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }
    );
  }

  async loginResend(loginId: string) {
    return this.request('/login/resend', {
      method: 'POST',
      body: JSON.stringify({ login_id: loginId }),
    });
  }

  async loginVerify(loginId: string, otp: string) {
    const data = await this.request<{
      ok: boolean;
      token: string;
      user: any;
    }>('/login/verify', {
      method: 'POST',
      body: JSON.stringify({ login_id: loginId, otp }),
    });

    if (data.token) {
      await Storage.saveToken(data.token);
      await Storage.saveUser(data.user);
    }

    return data;
  }

  async loginPassword(phone: string, password: string) {
    const data = await this.request<{
      ok: boolean;
      token: string;
      user: any;
    }>('/login/password', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });

    if (data.token) {
      await Storage.saveToken(data.token);
      await Storage.saveUser(data.user);
    }

    return data;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      await Storage.clearAuth();
    }
  }

  // ========================================================================
  // PROFILE ENDPOINTS
  // ========================================================================

  async getProfile() {
    return this.request<{ ok: boolean; user: any }>('/profile');
  }

  async updateProfile(data: {
    name: string;
    city?: string | null;
    daily_goal: number;
    preferred_mode: 'tap' | 'manual';
    privacy_show_initials: boolean;
    privacy_show_city: boolean;
  }) {
    const result = await this.request<{ ok: boolean; user: any }>(
      '/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );

    // Update cached user
    if (result.user) {
      await Storage.saveUser(result.user);
    }

    return result;
  }

  // ========================================================================
  // LOGS ENDPOINTS
  // ========================================================================

  async createLog(daroodTypeId: number, count: number, source: 'tap' | 'manual') {
    return this.request<{ ok: boolean; log: any; today_total: number }>(
      '/logs',
      {
        method: 'POST',
        body: JSON.stringify({
          darood_type_id: daroodTypeId,
          count,
          source,
        }),
      }
    );
  }

  async deleteLog(logId: string) {
    return this.request<{ ok: boolean }>(`/logs/${logId}`, {
      method: 'DELETE',
    });
  }

  // ========================================================================
  // DAROOD TYPES
  // ========================================================================

  async getDaroodTypes() {
    return this.request<{ ok: boolean; types: any[] }>('/darood-types');
  }

  // ========================================================================
  // LEADERBOARD
  // ========================================================================

  async getLeaderboard(
    scope: 'city' | 'global',
    range: 'season' | 'month' | 'week' | 'today',
    city?: string
  ) {
    const params = new URLSearchParams({ scope, range });
    if (city && scope === 'city') {
      params.set('city', city);
    }
    return this.request<{
      ok: boolean;
      items: any[];
      top3: any[];
      your_rank: any;
      meta?: any;
    }>(`/leaderboard?${params.toString()}`);
  }

  // ========================================================================
  // STATS ENDPOINTS
  // ========================================================================

  async getTodayWeekStats() {
    return this.request<{
      ok: boolean;
      today_total: number;
      goal: number;
      week_series: Array<{ total: number }>;
      last_log: { id: string; count: number; at: string } | null;
    }>('/stats/today-week');
  }

  async getStreak() {
    return this.request<{
      ok: boolean;
      current: number;
      longest: number;
    }>('/stats/streak');
  }

  async getSeason() {
    return this.request<{
      ok: boolean;
      your_total: number;
      ends_in_days: number;
      progress_pct: number;
    }>('/stats/season');
  }

  // ========================================================================
  // ADMIN ENDPOINTS
  // ========================================================================

  async getAdminKpis() {
    return this.request<{
      ok: boolean;
      total_users: number;
      active_today: number;
      total_darood: number;
      top_performer: { name: string; total: number } | null;
    }>('/admin/kpi');
  }

  async getAdminLeaderboard(range: 'season' | 'month' | 'week' | 'today' = 'season') {
    return this.request<{
      ok: boolean;
      items: Array<{
        rank: number;
        total: number;
        user: { id: number; name: string; city: string };
      }>;
    }>(`/admin/leaderboard?range=${range}`);
  }

  async getAdminActivity(limit: number = 8) {
    return this.request<{
      ok: boolean;
      items: Array<{
        id: string;
        count: number;
        created_at: string;
        user: { name: string; city: string };
      }>;
    }>(`/admin/activity?limit=${limit}`);
  }

  async getAdminDaroodTypes() {
    return this.request<{
      ok: boolean;
      items: Array<{
        id: number;
        name: string;
        short_desc?: string;
        active: boolean;
        sort_order: number;
        has_text: boolean;
        has_image: boolean;
        image_url?: string;
        content_text?: string;
      }>;
    }>('/admin/darood-types');
  }

  async createAdminDaroodType(data: {
    name: string;
    short_desc?: string;
    active: boolean;
    sort_order: number;
    content_text?: string;
  }) {
    return this.request<{ ok: boolean; item: any }>('/admin/darood-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminDaroodType(
    id: number,
    data: {
      name?: string;
      short_desc?: string;
      active?: boolean;
      sort_order?: number;
      content_text?: string;
    }
  ) {
    return this.request<{ ok: boolean; item: any }>(`/admin/darood-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminDaroodType(id: number) {
    return this.request<{ ok: boolean }>(`/admin/darood-types/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================================================
  // ANNOUNCEMENTS
  // ========================================================================

  async getAnnouncements() {
    return this.request<{
      ok: boolean;
      unread_count: number;
      items: Array<{
        id: number;
        subject: string;
        description: string;
        photo_url?: string | null;
        is_read: boolean;
        published_at?: string;
      }>;
    }>('/announcements');
  }

  async markAnnouncementRead(id: number) {
    return this.request<{ ok: boolean }>(`/announcements/${id}/read`, {
      method: 'POST',
    });
  }

  async getAdminAnnouncements() {
    return this.request<{
      ok: boolean;
      items: Array<{
        id: number;
        subject: string;
        description: string;
        photo_url?: string | null;
        is_active: boolean;
        published_at?: string;
      }>;
    }>('/admin/announcements');
  }

  async createAdminAnnouncement(data: {
    subject: string;
    description: string;
    photo?: { uri: string; name: string; type: string } | null;
  }) {
    const formData = new FormData();
    formData.append('subject', data.subject);
    formData.append('description', data.description);
    if (data.photo) {
      formData.append('photo', data.photo as any);
    }

    return this.request<{ ok: boolean; item: any }>('/admin/announcements', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteAdminAnnouncement(id: number) {
    return this.request<{ ok: boolean }>(`/admin/announcements/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

