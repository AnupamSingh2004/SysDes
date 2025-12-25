"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Layers, 
  MoreHorizontal,
  Clock,
  Trash2,
  ExternalLink,
  FolderOpen,
  LogOut,
  Settings,
  User,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/providers/auth-provider";
import { useProjects } from "@/hooks/use-projects";
import { Project } from "@/lib/api";

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { projects, isLoading, error, fetchProjects, createProject, deleteProject } = useProjects();

  // Fetch projects on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchProjects();
    }
  }, [isAuthenticated, authLoading, fetchProjects]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      const project = await createProject({ 
        name: newProjectName, 
        description: newProjectDescription || undefined 
      });
      setIsCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      // Navigate to the new project's canvas
      router.push(`/canvas/${project.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(projectId);
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Subtle background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[128px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">SysDes</span>
            </Link>

            <div className="flex items-center gap-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111111] border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>Create new project</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Start a new system design project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project name</Label>
                      <Input
                        id="name"
                        placeholder="My awesome architecture"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <textarea
                        id="description"
                        placeholder="Brief description of your system design..."
                        value={newProjectDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewProjectDescription(e.target.value)}
                        className="flex w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="text-gray-400 hover:text-white"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateProject}
                      className="bg-white text-black hover:bg-gray-200"
                      disabled={isCreating || !newProjectName.trim()}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create project"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-purple-500/20 text-purple-400">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#111111] border-white/10 text-white">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <Link href="/settings">
                    <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={() => logout()}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Your Projects</h1>
            <p className="text-gray-400">Create and manage your system designs</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && projects.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchProjects} variant="outline">
              Try again
            </Button>
          </div>
        )}

        {/* Projects grid */}
        {!isLoading && !error && filteredProjects.length > 0 ? (
          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {/* New project card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <Link href="/canvas/new">
                <div className="group h-full min-h-[200px] rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/50 bg-white/[0.02] hover:bg-purple-500/5 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-purple-500/20 flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <p className="text-gray-400 group-hover:text-white font-medium transition-colors">
                    New Project
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Project cards */}
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <ProjectCard project={project} onDelete={handleDeleteProject} />
              </motion.div>
            ))}
          </motion.div>
        ) : !isLoading && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery 
                ? "Try a different search term" 
                : "Create your first project to get started"
              }
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-white text-black hover:bg-gray-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Project card component
function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  return (
    <div className="group relative h-full rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 overflow-hidden">
      <Link href={`/canvas/${project.id}`}>
        {/* Thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
          <Layers className="w-10 h-10 text-purple-400/50" />
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold mb-1 group-hover:text-purple-400 transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {project.description || "No description"}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(project.updated_at)}
          </div>
        </div>
      </Link>

      {/* Actions dropdown */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 bg-black/50 hover:bg-black/80 backdrop-blur-sm"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111111] border-white/10 text-white">
            <DropdownMenuItem 
              className="text-gray-300 focus:text-white focus:bg-white/5"
              onClick={() => window.open(`/canvas/${project.id}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in new tab
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
