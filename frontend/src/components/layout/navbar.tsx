"use client";

import Link from "next/link";
import { Logo } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, User, Settings, LogOut } from "lucide-react";
import { useAuthContext } from "@/providers/auth-provider";

interface NavbarProps {
  showNewProject?: boolean;
  onNewProject?: () => void;
}

export function Navbar({ showNewProject = true, onNewProject }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuthContext();

  return (
    <nav className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Logo size="md" href="/dashboard" />

          <div className="flex items-center gap-4">
            {showNewProject && (
              <Button
                size="sm"
                className="bg-white text-black hover:bg-gray-200"
                onClick={onNewProject}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            )}

            {isAuthenticated ? (
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
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#111111] border-white/10 text-white"
                >
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
                    onClick={logout}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    Sign in
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
