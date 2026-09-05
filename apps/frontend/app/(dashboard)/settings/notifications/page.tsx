'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function NotificationSettingsPage() {
  const [templates, setTemplates] = useState([
    {
      id: '1',
      code: 'FEE_DUE_REMINDER',
      channel: 'SMS',
      subject: '',
      bodyTemplate: 'Reminder: Fee installment of {{amount_due}} is due on {{due_date}} for {{student_name}}. Please pay to avoid late fees.',
    },
    {
      id: '2',
      code: 'STUDENT_ABSENT_ALERT',
      channel: 'WHATSAPP',
      subject: '',
      bodyTemplate: 'Dear Guardian, this is to inform you that {{student_name}} was marked ABSENT on {{date}}. Please contact the institute.',
    },
    {
      id: '3',
      code: 'EXAM_RESULT_PUBLISHED',
      channel: 'EMAIL',
      subject: 'Exam Results for {{exam_name}} are now available',
      bodyTemplate: 'Hello, the results for {{exam_name}} have been published. {{student_name}} scored {{total_marks}}. Please log in to download the full report card.',
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(templates[0]);
  const [isEditing, setIsEditing] = useState(false);

  const availableVariables = ['{{student_name}}', '{{amount_due}}', '{{due_date}}', '{{date}}', '{{exam_name}}', '{{total_marks}}'];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Templates</h1>
          <p className="text-sm text-slate-500">Manage automated message templates across WhatsApp, SMS, and Email.</p>
        </div>
        <Button onClick={() => alert('Create new template placeholder')}>Create Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Template List */}
        <div className="col-span-1 border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
          <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 font-semibold">
            Active Templates
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {templates.map(t => (
              <div 
                key={t.id} 
                className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${selectedTemplate?.id === t.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                onClick={() => { setSelectedTemplate(t); setIsEditing(false); }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{t.code.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className="text-[10px]">{t.channel}</Badge>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{t.bodyTemplate}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Edit Template: {selectedTemplate.code}</span>
                  {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>}
                </CardTitle>
                <CardDescription>Configure the message payload for {selectedTemplate.channel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Code</Label>
                    <Input value={selectedTemplate.code} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Channel</Label>
                    <Select disabled={!isEditing} value={selectedTemplate.channel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="IN_APP">In-App Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedTemplate.channel === 'EMAIL' && (
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input 
                      disabled={!isEditing} 
                      defaultValue={selectedTemplate.subject} 
                      placeholder="e.g. Action Required" 
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Message Body</Label>
                  </div>
                  <Textarea 
                    className="min-h-[150px] font-mono text-sm" 
                    disabled={!isEditing}
                    defaultValue={selectedTemplate.bodyTemplate} 
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    <span className="block mb-1 font-semibold">Available Variables:</span>
                    <div className="flex flex-wrap gap-2">
                      {availableVariables.map(v => (
                        <code key={v} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{v}</code>
                      ))}
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={() => { alert('Saved successfully'); setIsEditing(false); }}>Save Changes</Button>
                  </div>
                )}

              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg border-dashed text-slate-500">
              Select a template to view details
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
