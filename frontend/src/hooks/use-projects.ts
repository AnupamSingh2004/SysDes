"use client";

import { useState, useCallback } from "react";
import { api, Project } from "@/lib/api";

// Hook for managing projects - uses HTTP-only cookies for auth
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getProjects();
      setProjects(response.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (data: { name: string; description?: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.createProject(data);
        setProjects((prev) => [response.project, ...prev]);
        return response.project;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create project";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await api.deleteProject(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete project";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateProject = useCallback(
    async (projectId: string, data: Partial<Project>) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.updateProject(projectId, data);
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? response.project : p))
        );
        return response.project;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update project";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    deleteProject,
    updateProject,
  };
}
