/**
 * Icon Picker - Popup beside toolbar (Eraser.io style)
 * No backdrop, positioned next to the toolbar button
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronRight, X, Database, MessageSquare, Cloud, Server, Network, HardDrive, Shield, MoreHorizontal } from "lucide-react";
import { systemIcons, iconCategories, IconCategory, SystemIcon } from "@/lib/icons/system-icons";

interface IconPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectIcon: (iconId: string) => void;
    selectedIconId?: string;
    anchorPosition?: { top: number; left: number };
}

// Category icons and descriptions
const categoryMeta: Record<IconCategory, { icon: React.ReactNode; description: string }> = {
    database: { icon: <Database size={18} />, description: "SQL, NoSQL, and cache databases" },
    messaging: { icon: <MessageSquare size={18} />, description: "Queues and event streaming" },
    cloud: { icon: <Cloud size={18} />, description: "AWS, Azure, GCP, and containers" },
    compute: { icon: <Server size={18} />, description: "Servers, APIs, and functions" },
    networking: { icon: <Network size={18} />, description: "Load balancers and gateways" },
    storage: { icon: <HardDrive size={18} />, description: "Object and file storage" },
    security: { icon: <Shield size={18} />, description: "Auth and security services" },
    other: { icon: <MoreHorizontal size={18} />, description: "General purpose icons" },
};

export function IconPicker({ isOpen, onClose, onSelectIcon, selectedIconId, anchorPosition }: IconPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategory, setExpandedCategory] = useState<IconCategory | null>(null);
    const [mounted, setMounted] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // For portal rendering
    useEffect(() => {
        setMounted(true);
    }, []);

    // Focus search on open
    useEffect(() => {
        if (isOpen && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 100);
        }
        // Reset state when opening
        if (isOpen) {
            setSearchQuery("");
            setExpandedCategory(null);
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    // Filter icons by search
    const searchResults = useMemo(() => {
        if (!searchQuery) return null;
        const q = searchQuery.toLowerCase();
        return systemIcons.filter(
            icon => icon.name.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    // Get icons for expanded category
    const categoryIcons = useMemo(() => {
        if (!expandedCategory) return [];
        return systemIcons.filter(icon => icon.category === expandedCategory);
    }, [expandedCategory]);

    if (!isOpen || !mounted) return null;

    const handleSelectIcon = (iconId: string) => {
        onSelectIcon(iconId);
    };

    // Position next to toolbar
    const position = anchorPosition || { top: 80, left: 70 };

    const modalContent = (
        <div
            ref={popupRef}
            className="fixed bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            style={{
                top: position.top,
                left: position.left,
                width: '340px',
                maxHeight: 'calc(100vh - 100px)',
                zIndex: 9999,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                <h2 className="text-sm font-semibold text-white">System Icons</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                    <X size={16} className="text-zinc-400" />
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-zinc-800">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search icon..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setExpandedCategory(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto" style={{ maxHeight: '350px' }}>
                {searchQuery && searchResults ? (
                    // Search Results
                    <div className="p-3">
                        <p className="text-xs text-zinc-500 mb-2">{searchResults.length} results</p>
                        {searchResults.length > 0 ? (
                            <div className="grid grid-cols-5 gap-2">
                                {searchResults.map(icon => (
                                    <IconButton
                                        key={icon.id}
                                        icon={icon}
                                        isSelected={selectedIconId === icon.id}
                                        onClick={() => handleSelectIcon(icon.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-zinc-500 text-sm">
                                No icons found
                            </div>
                        )}
                    </div>
                ) : expandedCategory ? (
                    // Expanded Category View
                    <div>
                        {/* Back button */}
                        <button
                            onClick={() => setExpandedCategory(null)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-xs text-zinc-400 hover:bg-zinc-800 border-b border-zinc-800"
                        >
                            <ChevronRight size={14} className="rotate-180" />
                            <span>All Categories</span>
                        </button>

                        {/* Icons grid */}
                        <div className="p-3">
                            <div className="grid grid-cols-5 gap-2">
                                {categoryIcons.map(icon => (
                                    <IconButton
                                        key={icon.id}
                                        icon={icon}
                                        isSelected={selectedIconId === icon.id}
                                        onClick={() => handleSelectIcon(icon.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    // Category List
                    <div className="py-1">
                        {iconCategories.map(category => {
                            const count = systemIcons.filter(i => i.category === category.id).length;
                            const meta = categoryMeta[category.id];
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setExpandedCategory(category.id)}
                                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-zinc-800 transition-colors"
                                >
                                    <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                                        {meta.icon}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-white">{category.label}</p>
                                        <p className="text-xs text-zinc-500">{count} icons</p>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-600" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-800/30">
                <p className="text-[10px] text-zinc-500 text-center">Select icon, then click canvas to place</p>
            </div>
        </div>
    );

    // Use portal to render at document body level
    return createPortal(modalContent, document.body);
}

interface IconButtonProps {
    icon: SystemIcon;
    isSelected: boolean;
    onClick: () => void;
}

function IconButton({ icon, isSelected, onClick }: IconButtonProps) {
    return (
        <button
            onClick={onClick}
            title={icon.name}
            className={`
        w-full aspect-square rounded-lg transition-all flex items-center justify-center
        ${isSelected
                    ? "bg-blue-500/30 ring-2 ring-blue-500"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }
      `}
        >
            <svg
                viewBox={icon.viewBox}
                className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-white'}`}
                dangerouslySetInnerHTML={{ __html: icon.svg }}
            />
        </button>
    );
}

// Export for use in toolbar
export { systemIcons, getIconById } from "@/lib/icons/system-icons";
