'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loading } from '@/components/ui/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899'];

export default function PerformanceDashboard() {
  const activeBranchId = useAuthStore(s => s.activeBranchId);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/admissions/leads', { params: { branchId: activeBranchId } });
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  if (isLoading) return <Loading variant="page" text="Loading analytics..." />;

  // Process data for charts
  const statusCounts = leads.reduce((acc: any, lead: any) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const funnelData = [
    { name: 'New Leads', value: statusCounts['NEW'] || 0 },
    { name: 'Contacted', value: statusCounts['CONTACTED'] || 0 },
    { name: 'Demo', value: statusCounts['DEMO_SCHEDULED'] || 0 },
    { name: 'Counseled', value: statusCounts['COUNSELED'] || 0 },
    { name: 'Admission', value: statusCounts['ADMISSION_PENDING'] || 0 },
    { name: 'Converted', value: statusCounts['CONVERTED'] || 0 },
  ];

  const sourceCounts = leads.reduce((acc: any, lead: any) => {
    const src = lead.source || 'Unknown';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const sourceData = Object.keys(sourceCounts).map(key => ({
    name: key,
    value: sourceCounts[key]
  }));

  // Counselor Performance
  const counselorMap = leads.reduce((acc: any, lead: any) => {
    const counselor = lead.assignedCounselor?.email || 'Unassigned';
    if (!acc[counselor]) acc[counselor] = { name: counselor, Total: 0, Converted: 0, Lost: 0 };
    acc[counselor].Total += 1;
    if (lead.status === 'CONVERTED') acc[counselor].Converted += 1;
    if (lead.status === 'LOST') acc[counselor].Lost += 1;
    return acc;
  }, {});

  const counselorData = Object.values(counselorMap);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Performance Analytics</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Drop-off rates across stages</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Distribution of inbound channels</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Counselor Performance</CardTitle>
            <CardDescription>Lead handling and conversion ratios per counselor</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counselorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Converted" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Lost" stackId="a" fill="#ef4444" />
                <Bar dataKey="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
