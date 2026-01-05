"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Layers, CheckCircle2, XCircle } from "lucide-react";
import { useAuthContext } from "@/providers/auth-provider";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuthContext();

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get("error");
      const provider = searchParams.get("provider");
      const token = searchParams.get("token");

      if (error) {
        // Handle error - redirect to login with error message
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error)}`);
        }, 1500);
        return;
      }

      // If token is in URL (cross-domain auth), store it in localStorage
      if (token) {
        localStorage.setItem("auth_token", token);
      }

      // OAuth was successful - cookies are already set by backend
      // Now fetch the user data to update the auth context
      if (provider) {
        try {
          await refreshUser();
          // Small delay to show success state
          setTimeout(() => {
            router.push("/dashboard");
          }, 1000);
        } catch {
          router.push("/login?error=auth_failed");
        }
      } else {
        router.push("/login");
      }
    };

    handleCallback();
  }, [router, searchParams, refreshUser]);

  const error = searchParams.get("error");
  const provider = searchParams.get("provider");

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
        
        {error ? (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Authentication Failed</h1>
            <p className="text-gray-400">Redirecting you back to login...</p>
          </>
        ) : provider ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-4 animate-pulse" />
            <h1 className="text-xl font-semibold mb-2">Welcome to SysDes!</h1>
            <p className="text-gray-400">Redirecting to your dashboard...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Signing you in...</h1>
            <p className="text-gray-400">Please wait while we complete authentication</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
