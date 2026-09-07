'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import {
  Users, IndianRupee, Bell, AlertTriangle, Calendar,
  GraduationCap, Clock, ArrowUpRight, ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { KpiCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/ui/kpi-card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Greeting helper ──────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Section Header ────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-700 mb-3">{children}</h2>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const activeBranchId = useAuthStore(s => s.activeBranchId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-kpis', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/kpis', {
        params: { branchId: activeBranchId }
      });
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
        <KpiCardSkeleton count={4} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="lg:col-span-3 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to load dashboard</h3>
        <p className="text-sm text-slate-500 mb-4">There was an error fetching the data.</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const { realtime } = data ?? {};

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header — greeting + date */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[1.125rem] font-semibold text-slate-900 leading-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Students"
          value={realtime?.totalStudents ?? 0}
          description="Currently enrolled"
          icon={Users}
          accentColor="bg-indigo-50 text-indigo-600"
        />
        <KpiCard
          title="Active Leads"
          value={realtime?.activeLeads ?? 0}
          description="New & contacted"
          icon={GraduationCap}
          accentColor="bg-sky-50 text-sky-600"
        />
        <KpiCard
          title="Revenue This Month"
          value={`₹${((realtime?.revenueThisMonth ?? 0)).toLocaleString('en-IN')}`}
          description="From paid fee invoices"
          icon={IndianRupee}
          accentColor="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title="Today's Classes"
          value={realtime?.todayClasses?.length ?? 0}
          description="Scheduled sessions"
          icon={Calendar}
          accentColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

        {/* ── LEFT (4/7) ── */}
        <div className="flex flex-col gap-6 lg:col-span-4">

          {/* Today's Schedule */}
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Today's Schedule</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Timetable sessions for today</CardDescription>
                </div>
                <Link href="/timetable" className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 font-medium">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {realtime?.todayClasses && realtime.todayClasses.length > 0 ? (
                realtime.todayClasses.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 p-2 rounded-lg w-16 shrink-0 text-center">
                      <Clock className="h-3.5 w-3.5 mb-0.5" />
                      <span className="text-xs font-semibold">{session.startTime?.slice(0, 5)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-slate-900 truncate">{session.batch?.name}</h4>
                      <p className="text-xs text-slate-500 truncate">
                        {session.teacher?.firstName} {session.teacher?.lastName}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0">
                      {session.room?.name ?? 'No Room'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Calendar className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No classes today</p>
                  <p className="text-xs text-slate-400 mt-0.5">Enjoy your free day!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Exams */}
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Upcoming Exams</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Next 3 scheduled exams</CardDescription>
                </div>
                <Link href="/exams" className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 font-medium">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {realtime?.upcomingExams && realtime.upcomingExams.length > 0 ? (
                realtime.upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm text-slate-900 truncate">{exam.name}</h4>
                      <p className="text-xs text-slate-500">
                        {new Date(exam.examDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge variant="info" className="ml-3 shrink-0">{exam.batch?.name}</Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <ClipboardList className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No upcoming exams</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <Link href="/exams" className="text-indigo-600 hover:underline">Schedule one →</Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT (3/7) ── */}
        <div className="flex flex-col gap-6 lg:col-span-3">

          {/* Pending Fee Alerts */}
          <Card className="border-red-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Pending Fee Alerts
                  </CardTitle>
                  <CardDescription className="text-xs text-red-500/80 mt-0.5">
                    Highest overdue invoices
                  </CardDescription>
                </div>
                <Link href="/fees" className="text-xs text-red-600 hover:underline flex items-center gap-0.5 font-medium">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              {realtime?.pendingFees && realtime.pendingFees.length > 0 ? (
                realtime.pendingFees.map((fee: any) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${fee.studentId}`}
                        className="font-medium text-sm text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                      >
                        {fee.student?.firstName} {fee.student?.lastName}
                      </Link>
                      <p className="text-[11px] text-slate-400">
                        Due: {new Date(fee.dueDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <span className="font-semibold text-sm text-red-600 ml-3 shrink-0">
                      ₹{(fee.amount / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                    <IndianRupee className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">All fees cleared!</p>
                  <p className="text-xs text-slate-400">No pending overdue invoices.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Admissions */}
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  Recent Admissions
                </CardTitle>
                <Link href="/students" className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 font-medium">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              {realtime?.recentAdmissions && realtime.recentAdmissions.length > 0 ? (
                realtime.recentAdmissions.map((student: any) => (
                  <div key={student.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium text-sm text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                      <p className="text-[11px] text-slate-400 font-mono">{student.enrollmentNumber}</p>
                    </div>
                    <Badge variant="secondary" className="ml-3 shrink-0 text-[10px]">
                      {student.enrollments?.[0]?.batch?.name ?? 'No Batch'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <GraduationCap className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No recent admissions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notice Board */}
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-amber-500" />
                Notice Board
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {realtime?.recentNotices && realtime.recentNotices.length > 0 ? (
                realtime.recentNotices.map((notice: any) => (
                  <div
                    key={notice.id}
                    className="p-3 rounded-lg border border-amber-100 bg-amber-50/50"
                  >
                    <h4 className="font-medium text-sm text-slate-800">{notice.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notice.body}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <Bell className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No active notices</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


