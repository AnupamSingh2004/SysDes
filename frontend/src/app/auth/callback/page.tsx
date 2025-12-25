"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Layers } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      // Handle error - redirect to login with error message
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      // Store the token
      localStorage.setItem("auth_token", token);
      
      // Redirect to dashboard
      router.push("/dashboard");
    } else {
      // No token, redirect to login
      router.push("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
          <Layers className="w-8 h-8 text-white" />
        </div>
        
        <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
        
        <h1 className="text-xl font-semibold mb-2">Signing you in...</h1>
        <p className="text-gray-400">Please wait while we complete authentication</p>
      </div>
    </div>
  );
}
