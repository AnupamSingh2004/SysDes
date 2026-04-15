"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Layers,
  GitBranch,
  Search,
  Download,
  Github,
  Chrome
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 dark:bg-purple-500/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/20 dark:bg-blue-500/20 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-pink-500/10 dark:bg-pink-500/10 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: "2s" }} />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "100px 100px"
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">SysDes</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How it works
              </Link>
              <Link href="https://github.com/AnupamSingh2004/SysDes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                GitHub
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign in
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>

            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              Sketch your ideas.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                Let AI perfect them.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Transform messy whiteboard sketches into professional system architecture
              diagrams with intelligent suggestions and version history.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/login">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 text-base">
                  Start Designing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="https://github.com/AnupamSingh2004/SysDes" target="_blank">
                <Button size="lg" variant="outline" className="border-border hover:bg-accent px-8 h-12 text-base">
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={fadeInUp}
              className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <span>Open Source</span>
              <span className="w-1 h-1 bg-muted-foreground rounded-full" />
              <span>Free to use</span>
              <span className="w-1 h-1 bg-muted-foreground rounded-full" />
              <span>No credit card required</span>
            </motion.div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            className="mt-20 relative"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Browser mockup */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-muted rounded-md px-3 py-1.5 text-xs text-muted-foreground max-w-md mx-auto">
                      sysdes.app/canvas
                    </div>
                  </div>
                </div>

                {/* App preview */}
                <div className="aspect-[16/9] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-border flex items-center justify-center mx-auto mb-4">
                      <Layers className="w-10 h-10 text-purple-400" />
                    </div>
                    <p className="text-muted-foreground text-sm">Interactive demo coming soon...</p>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 opacity-20 blur-2xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-border">
              Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need to
              <br />
              <span className="text-muted-foreground">design better systems</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-border">
              How it works
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              From sketch to diagram
              <br />
              <span className="text-muted-foreground">in seconds</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="text-6xl font-bold text-foreground/5 absolute -top-4 -left-2">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="relative pt-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-border flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to transform your
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                system design workflow?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join developers who are designing better systems with AI assistance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 text-base">
                  <Github className="w-4 h-4 mr-2" />
                  Continue with GitHub
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-border hover:bg-accent px-8 h-12 text-base">
                  <Chrome className="w-4 h-4 mr-2" />
                  Continue with Google
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Layers className="w-3 h-3 text-white" />
              </div>
              <span className="font-medium">SysDes</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with ❤️ by{" "}
              <Link href="https://github.com/AnupamSingh2004" className="text-foreground/70 hover:text-foreground transition-colors">
                Anupam Singh
              </Link>
            </p>
            <div className="flex items-center gap-6">
              <Link href="https://github.com/AnupamSingh2004/SysDes" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature card component
function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="group p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-border transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-purple-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// Features data
const features = [
  {
    icon: Sparkles,
    title: "AI Sketch Recognition",
    description: "Draw freely on the canvas. Our AI understands your messy sketches and extracts components and relationships."
  },
  {
    icon: Zap,
    title: "Instant Diagrams",
    description: "Transform rough sketches into clean, professional architecture diagrams with automatic layout."
  },
  {
    icon: Layers,
    title: "Smart Suggestions",
    description: "Get actionable recommendations for scalability, security, and performance based on best practices."
  },
  {
    icon: GitBranch,
    title: "Version History",
    description: "Every change is saved with full history. Compare versions and understand how your design evolved."
  },
  {
    icon: Search,
    title: "Search Your Designs",
    description: "Query past designs naturally. Find all auth-related architectures or scaling suggestions instantly."
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Download as PNG, SVG, or PDF. Share public links or embed diagrams in your portfolio."
  }
];

// Steps data
const steps = [
  {
    icon: Layers,
    title: "Sketch your architecture",
    description: "Draw boxes, arrows, databases, and services on the infinite canvas. Don't worry about making it perfect."
  },
  {
    icon: Sparkles,
    title: "AI interprets your design",
    description: "Our AI analyzes your sketch, identifies components, and understands the relationships between them."
  },
  {
    icon: Zap,
    title: "Get clean diagrams & insights",
    description: "Receive professional diagrams, improvement suggestions, and store everything in your design history."
  }
];
