"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Layers, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <Layers className="w-10 h-10 text-purple-400" />
        </div>

        <h1 className="text-8xl font-bold text-white/10 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Sorry, we could not find the page you are looking for. 
          It might have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button className="bg-white text-black hover:bg-gray-200">
              <Home className="w-4 h-4 mr-2" />
              Go home
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="border-white/10 hover:bg-white/5"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
