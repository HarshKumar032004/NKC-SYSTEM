'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Download, FileText, UserCircle, Activity, History, Upload, BarChart } from 'lucide-react';
import { useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loading } from '@/components/ui/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('Aadhar Card');

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await apiClient.get(`/students/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const res = await apiClient.get<{ downloadUrl: string }>(`/students/${id}/documents/${documentId}/download-url`);
      
      const link = document.createElement('a');
      link.href = res.data.downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download document', error);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { data } = await apiClient.post(`/students/${id}/upload-url`, {
        fileName: `${uploadDocType} - ${file.name}`,
        mimeType: file.type,
        sizeBytes: file.size
      });

      await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['student', id] });
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Please ensure it is a valid format and size.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) return <Loading variant="page" text="Loading student profile..." />;
  if (!student) return <div className="p-8 text-red-500">Student not found</div>;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6">
      
      {/* Header Summary */}
      <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-lg border">
        <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="Student" className="h-full w-full object-cover" />
          ) : (
            <UserCircle className="h-12 w-12 text-slate-400" />
          )}
        </div>
        <div className="flex-1 flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{student.firstName} {student.lastName}</h1>
            <p className="text-muted-foreground font-mono">{student.enrollmentNumber}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant={student.status === 'ENROLLED' ? 'default' : 'secondary'}>{student.status}</Badge>
              <Badge variant="outline">{student.gender}</Badge>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={`/students/${student.id}/edit`}>
              Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
          <TabsTrigger value="overview"><UserCircle className="w-4 h-4 mr-2"/> Overview</TabsTrigger>
          <TabsTrigger value="enrollments"><Activity className="w-4 h-4 mr-2"/> Enrollments</TabsTrigger>
          <TabsTrigger value="exams"><BarChart className="w-4 h-4 mr-2"/> Exams</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2"/> Documents</TabsTrigger>
          <TabsTrigger value="audit"><History className="w-4 h-4 mr-2"/> Audit Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">DOB</span>
                  <span className="font-medium">{new Date(student.dob).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Blood Group</span>
                  <span className="font-medium">{student.bloodGroup || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-right max-w-[250px]">{student.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-right">{student.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-right">{student.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Aadhar Number</span>
                  <span className="font-medium text-right">{student.aadharNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Admission Date</span>
                  <span className="font-medium text-right">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Previous School</span>
                  <span className="font-medium text-right">{student.previousSchool || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Finance & Hostel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Payment Type</span>
                    <span className="font-medium text-right">{student.paymentType === 'LUMP_SUM' ? 'Lump Sum' : 'Installments'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-right">{student.discountPercent || 0}%</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-muted-foreground">Hosteler</span>
                    <span className="font-medium text-right">{student.isHosteler ? 'Yes' : 'No'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
              <CardHeader>
                <CardTitle>Primary Guardian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {student.guardians?.map((g: any) => (
                  <div key={g.id} className="mb-4 last:mb-0">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{g.name} ({g.relationship})</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{g.phone}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="enrollments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Allocations</CardTitle>
              <CardDescription>Current and past enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              {student.enrollments?.map((e: any) => (
                <div key={e.id} className="flex justify-between items-center p-4 border rounded-md mb-2">
                  <div>
                    <h4 className="font-medium">{e.batch?.name || 'Unknown Batch'}</h4>
                    <p className="text-sm text-muted-foreground">Enrolled: {new Date(e.enrolledAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={e.status === 'ACTIVE' ? 'default' : 'secondary'}>{e.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exam Performance</CardTitle>
              <CardDescription>Percentage score across all recorded exams</CardDescription>
            </CardHeader>
            <CardContent>
              {student.examResults && student.examResults.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={
                      // Group by exam to show one point per exam
                      Object.values(student.examResults.reduce((acc: any, curr: any) => {
                        if (!acc[curr.examId]) {
                          acc[curr.examId] = {
                            name: curr.exam.name,
                            date: curr.exam.examDate,
                            totalObtained: 0,
                            totalMax: 0,
                          };
                        }
                        acc[curr.examId].totalObtained += curr.marksObtained;
                        acc[curr.examId].totalMax += curr.subject.maxMarks;
                        return acc;
                      }, {})).map((exam: any) => ({
                        name: exam.name,
                        percentage: (exam.totalObtained / exam.totalMax) * 100
                      }))
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Score']} />
                      <Line type="monotone" dataKey="percentage" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No exam performance data available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Max Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.examResults?.map((result: any) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.exam?.name}</TableCell>
                      <TableCell>{result.subject?.name}</TableCell>
                      <TableCell>{result.marksObtained}</TableCell>
                      <TableCell>{result.subject?.maxMarks}</TableCell>
                    </TableRow>
                  ))}
                  {(!student.examResults || student.examResults.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-8 text-slate-500">
                        No exam results recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Secure Document Vault</CardTitle>
                <CardDescription>Identity and academic records synced with R2</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                    <SelectItem value="10th Marksheet">10th Marksheet</SelectItem>
                    <SelectItem value="12th Marksheet">12th Marksheet</SelectItem>
                    <SelectItem value="Transfer Certificate">Transfer Certificate (TC)</SelectItem>
                    <SelectItem value="Migration Certificate">Migration Certificate</SelectItem>
                    <SelectItem value="Character Certificate">Character Certificate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleUpload} 
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                />
              </div>
            </CardHeader>
            <CardContent>
              {student.documents?.length > 0 ? (
                <div className="grid gap-3">
                  {student.documents.map((doc: any) => (
                    <div key={doc.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">{(doc.sizeBytes / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(doc.id, doc.fileName)}>
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents found in the vault.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Append-only ledger of profile modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {student.auditHistory?.map((audit: any) => (
                  <div key={audit.id} className="text-sm border-l-2 border-primary pl-4 py-1">
                    <p className="font-medium">{audit.action} <span className="text-muted-foreground font-normal">by {audit.user?.email || 'System'}</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(audit.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
