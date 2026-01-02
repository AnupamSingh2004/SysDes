"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Github, Chrome, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loginWithGitHub, loginWithGoogle } = useAuthContext();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-between p-12 border-r border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-xl">SysDes</span>
        </Link>

        <div>
          <motion.blockquote 
            className="text-2xl font-medium leading-relaxed mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            &quot;SysDes transformed how I approach system design. 
            What used to take hours now takes minutes.&quot;
          </motion.blockquote>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-gray-400">— A Happy Developer</p>
          </motion.div>
        </div>

        <p className="text-sm text-gray-600">
        </p>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">SysDes</span>
            </Link>
          </div>

          {/* Back link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-gray-400">
              Sign in to continue to SysDes
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={loginWithGitHub}
              className="w-full h-12 bg-white text-black hover:bg-gray-200 text-base font-medium"
            >
              <Github className="w-5 h-5 mr-3" />
              Continue with GitHub
            </Button>

            <Button 
              onClick={loginWithGoogle}
              variant="outline"
              className="w-full h-12 border-white/10 hover:bg-white/5 text-base font-medium"
            >
              <Chrome className="w-5 h-5 mr-3" />
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <Separator className="bg-white/10" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0a] px-4 text-sm text-gray-500">
              or
            </span>
          </div>

          {/* Demo mode */}
          <Link href="/dashboard">
            <Button 
              variant="ghost" 
              className="w-full h-12 text-gray-400 hover:text-white hover:bg-white/5"
            >
              Try demo mode (no sign in required)
            </Button>
          </Link>

          {/* Terms */}
          <p className="mt-8 text-center text-sm text-gray-500">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-gray-400 hover:text-white underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-gray-400 hover:text-white underline underline-offset-4">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
