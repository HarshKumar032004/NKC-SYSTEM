'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface TeacherProfile {
  id: string;
  name: string;
  specialization: string | null;
  qualification: string | null;
  joiningDate: string;
  baseSalary: number;
  hourlyRate: number;
  user?: {
    email: string;
    isActive: boolean;
  } | null;
  teacherSubjects: Array<{ subject: { name: string } }>;
  payrollRecords: Array<{
    id: string;
    month: number;
    year: number;
    amountPaid: number;
    bonus: number;
    deductions: number;
    status: string;
    paymentDate: string | null;
  }>;
}

export default function TeacherProfilePage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = use(params);
  
  const [workloadMonth, setWorkloadMonth] = useState(new Date().getMonth() + 1);
  const [workloadYear, setWorkloadYear] = useState(new Date().getFullYear());

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: async () => {
      const { data } = await apiClient.get<TeacherProfile>(`/hr/teachers/${teacherId}`);
      return data;
    },
  });

  const { data: workload } = useQuery({
    queryKey: ['teacher-workload', teacherId, workloadMonth, workloadYear],
    queryFn: async () => {
      const { data } = await apiClient.get(`/hr/teachers/${teacherId}/workload`, {
        params: { month: workloadMonth, year: workloadYear }
      });
      return data;
    },
    enabled: !!teacherId,
  });

  if (isLoading) return <Loading variant="page" text="Loading profile..." />;
  if (!teacher) return <div className="p-8 text-center text-red-500">Teacher not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{teacher.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {teacher.specialization || 'Teacher'}
            {teacher.user?.email && (
              <>
                <span className="text-xs text-slate-400">•</span>
                {teacher.user.email}
              </>
            )}
            <span className="text-xs text-slate-400">•</span>
            Joined {format(new Date(teacher.joiningDate), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Profile</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(teacher.baseSalary / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hourly Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(teacher.hourlyRate / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">per hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacher.teacherSubjects.length}</div>
            <p className="text-xs text-muted-foreground">
              {teacher.teacherSubjects.map(ts => ts.subject.name).join(', ') || 'None assigned'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workload" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="workload">Workload Analytics</TabsTrigger>
          <TabsTrigger value="payroll">Payroll History</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monthly Workload</CardTitle>
                  <CardDescription>Total teaching hours based on Timetable sessions.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <select 
                    className="border rounded px-3 py-1 bg-background"
                    value={workloadMonth}
                    onChange={(e) => setWorkloadMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{format(new Date(2000, m - 1), 'MMMM')}</option>
                    ))}
                  </select>
                  <select 
                    className="border rounded px-3 py-1 bg-background"
                    value={workloadYear}
                    onChange={(e) => setWorkloadYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workload ? (
                <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <Clock className="h-12 w-12 text-primary mb-4" />
                  <div className="text-5xl font-black text-primary">{workload.totalHours} <span className="text-2xl font-semibold text-muted-foreground">hours</span></div>
                  <p className="mt-2 text-sm text-muted-foreground">({workload.totalMinutes} total minutes in {format(new Date(workloadYear, workloadMonth - 1), 'MMMM yyyy')})</p>
                  
                  {teacher.hourlyRate > 0 && (
                    <div className="mt-6 pt-6 border-t w-full max-w-sm text-center">
                      <p className="text-sm font-medium">Estimated Hourly Payout</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ₹{((workload.totalMinutes / 60) * (teacher.hourlyRate / 100)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">Loading workload data...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Records</CardTitle>
              <CardDescription>Historical payout records for this teacher.</CardDescription>
            </CardHeader>
            <CardContent>
              {teacher.payrollRecords.length > 0 ? (
                <div className="border rounded-md divide-y">
                  {teacher.payrollRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${record.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{format(new Date(record.year, record.month - 1), 'MMMM yyyy')}</p>
                          <p className="text-sm text-muted-foreground">
                            Base/Hourly: ₹{(record.amountPaid / 100).toFixed(2)} | 
                            Bonus: ₹{(record.bonus / 100).toFixed(2)} | 
                            Deductions: ₹{(record.deductions / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{((record.amountPaid + record.bonus - record.deductions) / 100).toFixed(2)}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          record.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                          record.status === 'PROCESSED' ? 'bg-blue-100 text-blue-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                  No payroll records found for this teacher.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Timetable Schedule</CardTitle>
              <CardDescription>Weekly recurring schedule for this teacher.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                Schedule grid will be implemented integrating the Timetable module.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
