"use client";

import { useState, useCallback } from "react";
import { Project } from "@/types";
import { api } from "@/lib/api";

export function useProjects(token: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getProjects(token);
      setProjects(response.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const createProject = useCallback(
    async (data: { name: string; description?: string }) => {
      if (!token) throw new Error("Not authenticated");

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.createProject(data, token);
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
    [token]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!token) throw new Error("Not authenticated");

      setIsLoading(true);
      setError(null);

      try {
        await api.deleteProject(projectId, token);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete project";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const updateProject = useCallback(
    async (projectId: string, data: Partial<Project>) => {
      if (!token) throw new Error("Not authenticated");

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.updateProject(projectId, data, token);
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
    [token]
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
