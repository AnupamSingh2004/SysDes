// Environment variables
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  appName: "SysDes",
  appDescription: "AI-Powered System Design Tool",
  githubRepo: "https://github.com/AnupamSingh2004/SysDes",
  author: {
    name: "Anupam Singh",
    github: "https://github.com/AnupamSingh2004",
  },
} as const;
