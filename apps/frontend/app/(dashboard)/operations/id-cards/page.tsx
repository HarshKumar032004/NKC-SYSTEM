'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IdCard, Download, Loader2, Users } from 'lucide-react';

export default function IdCardPrintCenterPage() {
  const [studentId, setStudentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

  // For file downloads, it's often easier to use the browser's native capabilities 
  // with a token in an HTTP-only cookie, or fetching as blob and triggering download.
  const handleDownload = async (url: string, filename: string, setLoader: (val: boolean) => void) => {
    setLoader(true);
    setErrorMsg('');
    try {
      // In a real app with HttpOnly cookies, apiClient (Axios) handles credentials automatically.
      // We'll fetch the blob using the shared apiClient.
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate ID card. Ensure the ID is correct.');
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <IdCard className="h-8 w-8 text-primary" />
          ID Card Print Center
        </h1>
        <p className="text-muted-foreground">Generate high-quality PDF identity cards for students and batches.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Single Student Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-slate-500" />
              Single ID Card
            </CardTitle>
            <CardDescription>Generate an ID card for a specific student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student UUID</Label>
              <Input 
                id="studentId" 
                placeholder="Enter Student UUID" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              disabled={!studentId || isGeneratingSingle}
              onClick={() => handleDownload(`/operations/id-cards/student/${studentId}`, `id_card_${studentId}.pdf`, setIsGeneratingSingle)}
            >
              {isGeneratingSingle ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download PDF</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Batch Generation */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              Batch Bulk Generation
            </CardTitle>
            <CardDescription>Generate a combined print-ready A4 PDF for an entire batch. Contains 4 cards per page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchId">Batch UUID</Label>
              <Input 
                id="batchId" 
                placeholder="Enter Batch UUID" 
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
            </div>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
              disabled={!batchId || isGeneratingBulk}
              onClick={() => handleDownload(`/operations/id-cards/batch/${batchId}`, `batch_${batchId}_ids.pdf`, setIsGeneratingBulk)}
            >
              {isGeneratingBulk ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compiling Pages...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Generate Batch PDFs</>
              )}
            </Button>
            
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-md border text-sm text-muted-foreground">
              <p><strong>Print Instructions:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Paper Size: A4 (210 x 297 mm)</li>
                <li>Scale: Actual Size / 100% (Do not fit to page)</li>
                <li>Cut lines are included around each 240x350pt card.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
