// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: "github" | "google";
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
}

// Design version types
export interface DesignVersion {
  id: string;
  project_id: string;
  version_number: number;
  canvas_data: CanvasData;
  thumbnail?: string;
  created_at: string;
}

// Canvas types
export interface CanvasData {
  elements: CanvasElement[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface CanvasElement {
  id: string;
  type: "rectangle" | "circle" | "arrow" | "text" | "server" | "database" | "cloud" | "api";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  style?: ElementStyle;
  connections?: string[];
}

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
}

// AI Suggestion types
export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  applied?: boolean;
  dismissed?: boolean;
  created_at: string;
}

export type SuggestionType = 
  | "scalability"
  | "security"
  | "performance"
  | "reliability"
  | "cost"
  | "best-practice";

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}
