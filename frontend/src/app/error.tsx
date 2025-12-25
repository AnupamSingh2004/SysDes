"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Layers, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Layers className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          An unexpected error occurred. Our team has been notified 
          and we are working on a fix.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button 
            onClick={reset}
            className="bg-white text-black hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
          <Link href="/">
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <Home className="w-4 h-4 mr-2" />
              Go home
            </Button>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-gray-600">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
