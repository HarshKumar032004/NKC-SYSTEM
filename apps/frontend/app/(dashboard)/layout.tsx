'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import {
  LayoutDashboard, LogOut, Settings, Users, GraduationCap,
  Building2, MapPin, TrendingUp, UserCheck, Package, UserPlus,
  CalendarCheck, ClipboardList, CreditCard, Calendar, Wrench,
  ChevronDown,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarInset,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { NotificationBell } from '@/components/notifications/NotificationBell';

// ── Navigation groups ──────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/',        icon: LayoutDashboard },
      { name: 'Reports',   href: '/reports', icon: TrendingUp },
    ],
  },
  {
    label: 'Academics',
    items: [
      { name: 'Admissions', href: '/admissions', icon: UserPlus },
      { name: 'Students',   href: '/students',   icon: GraduationCap },
      { name: 'Attendance', href: '/attendance',  icon: CalendarCheck },
      { name: 'Exams',      href: '/exams',       icon: ClipboardList },
      { name: 'Batches',    href: '/batches',     icon: Building2 },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Fees & Payments', href: '/fees', icon: CreditCard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Timetable', href: '/timetable',            icon: Calendar },
      { name: 'Rooms',     href: '/rooms',                icon: Building2 },
      { name: 'Inventory', href: '/operations/inventory', icon: Package },
      { name: 'Branches',  href: '/branches',             icon: Building2 },
    ],
  },
  {
    label: 'Human Resources',
    items: [
      { name: 'Staff & Access', href: '/staff',       icon: Users },
      { name: 'HR & Payroll',   href: '/hr',          icon: UserCheck },
      { name: 'Maintenance',    href: '/maintenance',  icon: Wrench },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

// ── Breadcrumb helper ──────────────────────────────────────────────────────
function getPageLabel(pathname: string): string {
  const segMap: Record<string, string> = {
    '': 'Dashboard',
    'admissions': 'Admissions',
    'students': 'Students',
    'attendance': 'Attendance',
    'exams': 'Exams',
    'fees': 'Fees',
    'timetable': 'Timetable',
    'reports': 'Reports',
    'staff': 'Staff & Access',
    'hr': 'HR & Payroll',
    'operations': 'Operations',
    'maintenance': 'Maintenance',
    'settings': 'Settings',
    'branches': 'Branches',
    'rooms': 'Rooms',
    'batches': 'Batches',
    'new': 'New',
    'edit': 'Edit',
  };
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return 'Dashboard';
  return segMap[segs[segs.length - 1]] ?? segs[segs.length - 1];
}

function getParentLabel(pathname: string): { label: string; href: string } | null {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length <= 1) return null;
  const segMap: Record<string, string> = {
    'students': 'Students', 'exams': 'Exams', 'fees': 'Fees',
    'admissions': 'Admissions', 'branches': 'Branches',
    'operations': 'Operations', 'hr': 'HR & Payroll',
  };
  return { label: segMap[segs[0]] ?? segs[0], href: `/${segs[0]}` };
}

// ── Layout ─────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, activeBranchId, setBranchId, logout } = useAuthStore();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try { await apiClient.post('/auth/logout'); } catch { /* silent */ }
    await logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  useEffect(() => {
    apiClient.get('/branches').then(res => {
      setBranches(res.data);
      if (res.data.length > 0 && !activeBranchId) setBranchId(res.data[0].id);
    }).catch(console.error);
  }, []);

  const parent = getParentLabel(pathname);
  const pageLabel = getPageLabel(pathname);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full mesh-bg">

        {/* ── SIDEBAR ── */}
        <Sidebar variant="sidebar" className="border-r border-slate-200">

          {/* Logo */}
          <SidebarHeader className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 leading-tight">NKC IMS</span>
                <span className="text-[10px] text-slate-400 leading-tight">Management System</span>
              </div>
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="px-2 py-3">
            {NAV_GROUPS.map((group) => (
              <SidebarGroup key={group.label} className="mb-1">
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1.5 mb-0.5">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive =
                        item.href === '/'
                          ? pathname === '/'
                          : pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.name}
                            className={cn(
                              // Base — same height, smooth transition
                              'relative text-sm transition-colors duration-100 rounded-md w-full',
                              isActive
                                // Active: indigo tint + flush left border via negative margin
                                ? [
                                    'bg-indigo-50 text-indigo-700 font-medium',
                                    // Flush border: extend left past the px-2 padding to sidebar edge
                                    '-ml-2 pl-4 pr-2 rounded-l-none',
                                    'border-l-2 border-indigo-600',
                                  ].join(' ')
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                          >
                            <Link href={item.href} prefetch={false} className="flex items-center gap-2.5 px-2 py-1.5 text-sm">
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* User Footer */}
          <SidebarFooter className="border-t border-slate-200 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 w-full rounded-lg p-2 hover:bg-slate-100 transition-colors text-left focus:outline-none">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                    {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-medium text-slate-900 truncate leading-tight">
                    {user?.email ?? 'User'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight capitalize">
                    {user?.role?.toLowerCase().replace('_', ' ') ?? 'Guest'}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-slate-500 font-normal">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-transparent flex flex-col min-w-0">
        <div className="flex-1 flex flex-col h-[100vh] min-h-[100vh]">
          {/* Top Header - Modern Glassmorphic */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/40 glass-panel px-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle */}
              <SidebarTrigger
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md p-1.5 transition-colors"
                aria-label="Toggle sidebar"
              />

              {/* Breadcrumb */}
              <div className="hidden md:block">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="/"
                        className="text-slate-500 hover:text-slate-900 text-sm transition-colors"
                      >
                        Home
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {parent && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            href={parent.href}
                            className="text-slate-500 hover:text-slate-900 text-sm transition-colors"
                          >
                            {parent.label}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      </>
                    )}
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-slate-900 text-sm font-medium">
                        {pageLabel}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>

            <div className="flex items-center gap-2">

              {/* Branch Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none"
                  aria-label="Switch branch"
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="max-w-[120px] truncate">
                    {branches.find(b => b.id === activeBranchId)?.name ?? 'Select Branch'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Switch Branch</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {branches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => setBranchId(branch.id)}
                      className={
                        activeBranchId === branch.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : ''
                      }
                    >
                      {branch.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notification Bell */}
              <NotificationBell />

              {/* User Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8 border border-slate-200">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
                    {user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
