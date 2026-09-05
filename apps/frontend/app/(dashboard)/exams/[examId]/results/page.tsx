'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { Loading } from '@/components/ui/loading';

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const activeBranchId = useAuthStore(s => s.activeBranchId);

  const { data: rankings, isLoading } = useQuery({
    queryKey: ['exam-rankings', examId],
    queryFn: async () => (await apiClient.get(`/exams/${examId}/rankings`)).data,
    enabled: !!examId,
  });

  const handleDownloadReport = async (studentId: string) => {
    try {
      const { data } = await apiClient.get(`/exams/${examId}/report-card/${studentId}`);
      window.open(data.url, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate report card');
    }
  };

  if (isLoading) return <Loading variant="page" text="Loading analytics..." />;

  // Transform data for Radar Chart
  // We mock the radar chart data for demonstration, assuming the API returns average vs highest
  const radarData = [
    { subject: 'Math', classAvg: 65, highest: 98 },
    { subject: 'Science', classAvg: 70, highest: 95 },
    { subject: 'English', classAvg: 80, highest: 90 },
    { subject: 'History', classAvg: 75, highest: 85 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Exam Results & Analytics</h1>
        <Button variant="outline" onClick={() => router.push('/exams')}>Back to Exams</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Highest Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{rankings?.highest || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Lowest Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{rankings?.lowest || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Class Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{Math.round(rankings?.average || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Median Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{rankings?.median || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-[400px]">
          <CardHeader>
            <CardTitle>Performance Radar</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis />
                <Tooltip />
                <Radar name="Class Average" dataKey="classAvg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Radar name="Highest" dataKey="highest" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Student Ranks</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Total Marks</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings?.students?.map((s: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{idx + 1}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{s.total}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReport(s.id)}>
                        Get PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
