"use client";

interface AnimatedBackgroundProps {
  variant?: "default" | "subtle" | "error";
}

const variants = {
  default: [
    { color: "bg-purple-500/20", position: "top-1/4 left-1/4", size: "w-[500px] h-[500px]", delay: "0s" },
    { color: "bg-blue-500/20", position: "bottom-1/4 right-1/4", size: "w-[400px] h-[400px]", delay: "1s" },
    { color: "bg-pink-500/10", position: "top-1/2 left-1/2", size: "w-[300px] h-[300px]", delay: "2s" },
  ],
  subtle: [
    { color: "bg-purple-500/5", position: "top-0 right-0", size: "w-[600px] h-[600px]", delay: "0s" },
    { color: "bg-blue-500/5", position: "bottom-0 left-0", size: "w-[400px] h-[400px]", delay: "1s" },
  ],
  error: [
    { color: "bg-red-500/10", position: "top-1/4 left-1/4", size: "w-[500px] h-[500px]", delay: "0s" },
    { color: "bg-orange-500/10", position: "bottom-1/4 right-1/4", size: "w-[400px] h-[400px]", delay: "1s" },
  ],
};

export function AnimatedBackground({ variant = "default" }: AnimatedBackgroundProps) {
  const orbs = variants[variant];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {orbs.map((orb, index) => (
        <div
          key={index}
          className={`absolute ${orb.position} ${orb.size} ${orb.color} rounded-full blur-[128px] animate-pulse-glow`}
          style={{ animationDelay: orb.delay }}
        />
      ))}

      {/* Grid pattern - only for default variant */}
      {variant === "default" && (
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
        />
      )}
    </div>
  );
}
