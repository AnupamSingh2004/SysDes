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

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
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

  // Auth
  async getMe(token: string) {
    return this.request<{ user: { id: string; email: string; name: string; avatar_url: string } }>('/auth/me', { token });
  }

  // Projects
  async getProjects(token: string) {
    return this.request<{ projects: Project[] }>('/projects', { token });
  }

  async getProject(id: string, token: string) {
    return this.request<{ project: Project }>(`/projects/${id}`, { token });
  }

  async createProject(data: { name: string; description?: string }, token: string) {
    return this.request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateProject(id: string, data: Partial<Project>, token: string) {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteProject(id: string, token: string) {
    return this.request<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // Design versions
  async getVersions(projectId: string, token: string) {
    return this.request<{ versions: DesignVersion[] }>(`/projects/${projectId}/versions`, { token });
  }

  async createVersion(projectId: string, data: { canvas_data: object; thumbnail?: string }, token: string) {
    return this.request<{ version: DesignVersion }>(`/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  // AI Analysis
  async analyzeDesign(projectId: string, canvasData: object, token: string) {
    return this.request<{ suggestions: Suggestion[] }>(`/ai/analyze`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, canvas_data: canvasData }),
      token,
    });
  }
}

// Types
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
