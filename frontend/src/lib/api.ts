const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // If token provided explicitly, use Authorization header
    // Otherwise, rely on HTTP-only cookies (credentials: include)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Important: Send cookies with requests
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async health() {
    return this.request<{ status: string; version: string }>('/health');
  }

  // ==================== Auth ====================
  
  // Get current user (uses HTTP-only cookie automatically)
  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  // Refresh tokens
  async refreshTokens() {
    return this.request<{ user: User; tokens: TokenPair }>('/auth/refresh', {
      method: 'POST',
    });
  }

  // Logout (clears cookies on backend)
  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  // Get OAuth URLs (for redirecting to providers)
  getGitHubAuthUrl() {
    return `${this.baseUrl}/auth/github`;
  }

  getGoogleAuthUrl() {
    return `${this.baseUrl}/auth/google`;
  }

  // ==================== Projects ====================
  
  async getProjects() {
    // Backend returns { projects: [...], total: number }
    return this.request<{ projects: Project[]; total: number }>('/projects');
  }

  async getProject(id: string) {
    // Backend returns the project directly
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string }) {
    // Backend returns the project directly
    const project = await this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { project };
  }

  async updateProject(id: string, data: Partial<Project>) {
    // Backend returns the project directly
    const project = await this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { project };
  }

  async deleteProject(id: string) {
    // Backend returns 204 No Content
    await fetch(`${this.baseUrl}/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return { success: true };
  }

  // Design versions
  async getVersions(projectId: string) {
    return this.request<{ versions: DesignVersion[] }>(`/projects/${projectId}/versions`);
  }

  async createVersion(projectId: string, data: { canvas_data: object; thumbnail?: string }) {
    return this.request<{ version: DesignVersion }>(`/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // AI Analysis
  async analyzeDesign(projectId: string, canvasData: object) {
    return this.request<{ suggestions: Suggestion[] }>(`/ai/analyze`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, canvas_data: canvasData }),
    });
  }
}

// ==================== Types ====================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignVersion {
  id: string;
  project_id: string;
  version_number: number;
  canvas_data: object;
  thumbnail?: string;
  created_at: string;
}

export interface Suggestion {
  id: string;
  type: 'scalability' | 'security' | 'performance' | 'reliability' | 'cost';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
