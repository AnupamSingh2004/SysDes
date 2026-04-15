"use client";

import { Layers } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}

const sizeClasses = {
  sm: { container: "w-6 h-6 rounded-md", icon: "w-3 h-3", text: "text-base" },
  md: { container: "w-8 h-8 rounded-lg", icon: "w-4 h-4", text: "text-lg" },
  lg: { container: "w-10 h-10 rounded-xl", icon: "w-5 h-5", text: "text-xl" },
};

export function Logo({ size = "md", showText = true, href = "/" }: LogoProps) {
  const classes = sizeClasses[size];

  const content = (
    <div className="flex items-center gap-2">
      <div
        className={`${classes.container} bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center`}
      >
        <Layers className={`${classes.icon} text-white`} />
      </div>
      {showText && (
        <span className={`font-semibold ${classes.text}`}>SysDes</span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-2">
        {content}
      </Link>
    );
  }

  return content;
}
