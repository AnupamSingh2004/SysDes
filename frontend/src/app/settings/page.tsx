"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Bell,
  Palette,
  Shield,
  Key,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Logo } from "@/components/shared";
import { AnimatedBackground } from "@/components/shared";
import { useAuthContext } from "@/providers/auth-provider";

type SettingsTab = "profile" | "appearance" | "notifications" | "security";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { user } = useAuthContext();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AnimatedBackground variant="subtle" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Logo size="md" href="/dashboard" />
            <span className="text-gray-500">/</span>
            <h1 className="text-lg font-medium">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-56 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "profile" && (
                <ProfileSettings user={user} />
              )}
              {activeTab === "appearance" && (
                <AppearanceSettings theme={theme} setTheme={setTheme} />
              )}
              {activeTab === "notifications" && (
                <NotificationSettings />
              )}
              {activeTab === "security" && (
                <SecuritySettings
                  isDeleteDialogOpen={isDeleteDialogOpen}
                  setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                />
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileSettings({ user }: { user: { name: string; email: string; avatar_url: string } | null }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Profile</h2>
        <p className="text-sm text-gray-400">Manage your public profile information</p>
      </div>

      <Separator className="bg-white/10" />

      {/* Avatar section */}
      <div className="flex items-center gap-6">
        <Avatar className="w-20 h-20">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xl">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">
            Change avatar
          </Button>
          <p className="text-xs text-gray-500 mt-2">JPG, PNG, or GIF. Max 2MB.</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            defaultValue={user?.name || ""}
            className="bg-white/5 border-white/10 focus:border-purple-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue={user?.email || ""}
            disabled
            className="bg-white/5 border-white/10 text-gray-500"
          />
          <p className="text-xs text-gray-500">Email is managed through your OAuth provider</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
          />
        </div>

        <Button className="bg-white text-black hover:bg-gray-200">
          Save changes
        </Button>
      </div>
    </div>
  );
}

function AppearanceSettings({
  theme,
  setTheme,
}: {
  theme: "dark" | "light" | "system";
  setTheme: (theme: "dark" | "light" | "system") => void;
}) {
  const themes = [
    { id: "light" as const, label: "Light", icon: Sun },
    { id: "dark" as const, label: "Dark", icon: Moon },
    { id: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-gray-400">Customize how SysDes looks on your device</p>
      </div>

      <Separator className="bg-white/10" />

      {/* Theme selector */}
      <div className="space-y-4">
        <Label>Theme</Label>
        <div className="grid grid-cols-3 gap-3 max-w-md">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative p-4 rounded-lg border transition-all ${
                theme === t.id
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-white/10 hover:border-white/20 bg-white/[0.02]"
              }`}
            >
              <t.icon className={`w-5 h-5 mx-auto mb-2 ${
                theme === t.id ? "text-purple-400" : "text-gray-400"
              }`} />
              <span className="text-sm">{t.label}</span>
              {theme === t.id && (
                <Check className="absolute top-2 right-2 w-4 h-4 text-purple-400" />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Currently, only dark mode is available. Light mode coming soon!
        </p>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Notifications</h2>
        <p className="text-sm text-gray-400">Configure how you receive notifications</p>
      </div>

      <Separator className="bg-white/10" />

      <div className="space-y-4 max-w-md">
        <NotificationToggle
          label="Email notifications"
          description="Receive updates about your projects via email"
          defaultChecked={true}
        />
        <NotificationToggle
          label="AI suggestions"
          description="Get notified when AI has new suggestions for your designs"
          defaultChecked={true}
        />
        <NotificationToggle
          label="Product updates"
          description="Hear about new features and improvements"
          defaultChecked={false}
        />
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-white/[0.02]">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-purple-500" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SecuritySettings({
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
}: {
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Security</h2>
        <p className="text-sm text-gray-400">Manage your account security and data</p>
      </div>

      <Separator className="bg-white/10" />

      {/* Connected accounts */}
      <div className="space-y-4">
        <Label>Connected accounts</Label>
        <div className="space-y-3 max-w-md">
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#24292e] flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">GitHub</p>
                <p className="text-xs text-gray-500">Connected</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Danger zone */}
      <div className="space-y-4">
        <Label className="text-red-400">Danger zone</Label>
        <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 max-w-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Delete account</p>
              <p className="text-xs text-gray-500">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111111] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Delete account</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Are you sure you want to delete your account? This will permanently remove all your
                    projects, designs, and data. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive">
                    Delete my account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
