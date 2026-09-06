'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { DownloadCloud, TrendingUp, Users, CheckCircle, Activity } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';

export default function ReportsDashboard() {
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => (await apiClient.get('/reports/kpis')).data,
  });

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      await apiClient.post('/reports/export', { type });
      // The socket notification will handle the download link
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <Loading variant="page" text="Loading Analytics..." />;

  // Mock data for visualizations if DB is empty
  const financialData = kpis?.financialSummary?.length ? kpis.financialSummary : [
    { month: 'Jan', total_collected: 4000 },
    { month: 'Feb', total_collected: 3000 },
    { month: 'Mar', total_collected: 5000 },
    { month: 'Apr', total_collected: 4500 },
    { month: 'May', total_collected: 6000 },
  ];

  const funnelData = kpis?.academicFunnel?.length ? kpis.academicFunnel : [
    { name: 'Organic Search', value: 400 },
    { name: 'Referral', value: 300 },
    { name: 'Social Media', value: 300 },
    { name: 'Walk-in', value: 200 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const attendanceData = kpis?.attendanceTrends?.length ? kpis.attendanceTrends : [
    { week: 'W1', present: 95, absent: 5 },
    { week: 'W2', present: 90, absent: 10 },
    { week: 'W3', present: 92, absent: 8 },
    { week: 'W4', present: 88, absent: 12 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">Real-time performance metrics and data exports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('FINANCIAL')} disabled={exporting === 'FINANCIAL'}>
            <DownloadCloud className="w-4 h-4 mr-2" />
            {exporting === 'FINANCIAL' ? 'Exporting...' : 'Export Financials'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('ACADEMIC')} disabled={exporting === 'ACADEMIC'}>
            <DownloadCloud className="w-4 h-4 mr-2" />
            {exporting === 'ACADEMIC' ? 'Export Academics' : 'Export Academics'}
          </Button>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (MTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹24,500</div>
            <p className="text-xs text-slate-500">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+1,240</div>
            <p className="text-xs text-slate-500">Across 15 active batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lead Conversion</CardTitle>
            <CheckCircle className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28.5%</div>
            <p className="text-xs text-slate-500">Last 30 days average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-slate-500">Healthy status</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Collection</CardTitle>
            <CardDescription>Monthly aggregated fee transactions</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="total_collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources Pie */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Lead Sources Funnel</CardTitle>
            <CardDescription>Distribution of prospective student acquisition</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={funnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {funnelData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Line Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Batch Attendance Trends</CardTitle>
            <CardDescription>Weekly aggregated student presence vs absence</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
