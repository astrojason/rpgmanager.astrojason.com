"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  UsersIcon,
  CogIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  {
    id: "overview",
    name: "Dashboard",
    href: "/admin",
    icon: HomeIcon,
    description: "Admin overview",
    section: "main"
  },
  {
    id: "npcs",
    name: "NPCs",
    href: "/admin/data/npcs",
    icon: UserGroupIcon,
    description: "Non-Player Characters",
    section: "data"
  },
  {
    id: "pcs",
    name: "Player Characters",
    href: "/admin/data/pcs",
    icon: UsersIcon,
    description: "Player Characters",
    section: "data"
  },
  {
    id: "factions",
    name: "Factions",
    href: "/admin/data/factions",
    icon: ShieldCheckIcon,
    description: "Organizations & Guilds",
    section: "data"
  },
  {
    id: "quests",
    name: "Quests",
    href: "/admin/data/quests",
    icon: ClipboardDocumentListIcon,
    description: "Campaign Quests",
    section: "data"
  },
  {
    id: "locations",
    name: "Locations",
    href: "/admin/data/locations",
    icon: MapPinIcon,
    description: "Locations & Maps",
    section: "data"
  },
  {
    id: "timeline",
    name: "Timeline",
    href: "/admin/data/timeline",
    icon: ClockIcon,
    description: "Timeline Events",
    section: "data"
  },
  {
    id: "calendar",
    name: "Calendar",
    href: "/admin/data/calendar",
    icon: CalendarIcon,
    description: "World calendar",
    section: "tools"
  },
  {
    id: "recaps",
    name: "Session Recaps",
    href: "/admin/data/recaps",
    icon: DocumentTextIcon,
    description: "Session summaries",
    section: "tools"
  },
  {
    id: "user-management",
    name: "User Management",
    href: "/admin/users",
    icon: CogIcon,
    description: "Manage user roles",
    section: "tools"
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const role = tokenResult.claims.role as string || null;
          setUserRole(role);
        } catch (error) {
          console.error('Error checking user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to access the admin panel.
          </p>
          <Link 
            href="/auth"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has admin role
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Admin privileges required to access this area.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Current role: {userRole || 'No role assigned'}
          </p>
          <Link 
            href="/campaign"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Campaign
          </Link>
        </div>
      </div>
    );
  }

  // Render admin layout
  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-gray-900 dark:text-white">
                RPG Manager Admin
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                Admin
              </span>
              <Link 
                href="/campaign"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Back to Campaign
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Admin Navigation Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <nav className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Admin Tools
            </h3>
            
            {/* Dashboard */}
            <div className="mb-6">
              {adminNavItems
                .filter(item => item.section === "main")
                .map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>

            {/* Data Management */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Data Management
              </h4>
              <ul className="space-y-1">
                {adminNavItems
                  .filter(item => item.section === "data")
                  .map((item) => {
                    const IconComponent = item.icon;
                    const isActive = pathname === item.href;
                    
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-3" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Admin Tools */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Administration
              </h4>
              <ul className="space-y-1">
                {adminNavItems
                  .filter(item => item.section === "tools")
                  .map((item) => {
                    const IconComponent = item.icon;
                    const isActive = pathname === item.href;
                    
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-3" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
