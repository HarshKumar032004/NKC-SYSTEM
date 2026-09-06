'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { format } from 'date-fns';
import { Phone, Mail, MoreVertical, Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableFilter } from '@/components/ui/data-table-filter';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/ui/loading';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const STATUS_COLUMNS = [
  { id: 'NEW', title: 'New Leads' },
  { id: 'CONTACTED', title: 'Contacted' },
  { id: 'DEMO_SCHEDULED', title: 'Demo Scheduled' },
  { id: 'COUNSELED', title: 'Counseled' },
  { id: 'ADMISSION_PENDING', title: 'Admission Pending' },
];

export default function AdmissionsCRMPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [contactMethod, setContactMethod] = useState('PHONE');
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', source: '' });
  const [isListView, setIsListView] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data: leads = [], isLoading, isFetching } = useQuery({
    queryKey: ['leads', activeBranchId, filters],
    queryFn: async () => {
      const res = await apiClient.get('/admissions/leads', { params: { branchId: activeBranchId, ...filters } });
      return res.data;
    },
    enabled: !!activeBranchId,
    placeholderData: keepPreviousData,
  });

  const filterOptions = [
    {
      id: 'status',
      label: 'Status',
      options: STATUS_COLUMNS.map(col => ({ label: col.title, value: col.id }))
    }
  ];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await apiClient.patch(`/admissions/leads/${id}/status`, { status });
    },
    onMutate: async (newLeadStatus) => {
      await queryClient.cancelQueries({ queryKey: ['leads', activeBranchId, filters] });
      const previousLeads = queryClient.getQueryData(['leads', activeBranchId, filters]);

      queryClient.setQueryData(['leads', activeBranchId, filters], (old: any) => {
        if (!old) return [];
        return old.map((lead: any) => 
          lead.id === newLeadStatus.id ? { ...lead, status: newLeadStatus.status } : lead
        );
      });

      return { previousLeads };
    },
    onError: (err, newLeadStatus, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads', activeBranchId, filters], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', activeBranchId] });
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (lead: typeof newLead) => {
      const payload = {
        ...lead,
        email: lead.email ? lead.email : undefined,
        source: lead.source ? lead.source : undefined,
      };
      await apiClient.post('/admissions/leads', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', activeBranchId] });
      setIsNewLeadOpen(false);
      setNewLead({ name: '', phone: '', email: '', source: '' });
      toast.success('Lead created successfully!');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create lead. Please check the inputs.');
    }
  });

  const convertLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/admissions/leads/${id}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', activeBranchId] });
      toast.success('Successfully converted Lead to Student!');
    }
  });

  const logFollowUpMutation = useMutation({
    mutationFn: async ({ id, notes, method }: { id: string, notes: string, method: string }) => {
      await apiClient.post(`/admissions/leads/${id}/follow-up`, {
        notes,
        contactMethod: method
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', activeBranchId] });
      setSelectedLead(null);
      setFollowUpNotes('');
    }
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      updateStatusMutation.mutate({
        id: draggableId,
        status: destination.droppableId
      });
    }
  };

  const getLeadsByStatus = (status: string) => leads.filter((l: any) => l.status === status);

  if (isLoading) return <Loading variant="page" text="Loading CRM..." />;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Admissions Pipeline</h1>
          {isFetching && !isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsListView(!isListView)}>
            {isListView ? 'Board View' : 'List View'}
          </Button>
          <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 w-4 h-4" /> New Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
                  <Input value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone <span className="text-red-500">*</span></label>
                  <Input value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email (optional)</label>
                  <Input type="email" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source (optional)</label>
                  <Input placeholder="e.g. Website, Facebook, Referral" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })} />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createLeadMutation.mutate(newLead)} 
                  disabled={!newLead.name || !newLead.phone || createLeadMutation.isPending}
                  isLoading={createLeadMutation.isPending}
                >
                  Create Lead
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="shrink-0">
        <DataTableFilter 
          searchPlaceholder="Search leads by name, email or phone..."
          filters={filterOptions}
          onFilterChange={setFilters}
        />
      </div>

      <div className="flex-1 overflow-x-auto">
        {isListView ? (
          <div className="bg-white dark:bg-slate-900 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      No leads found.
                    </TableCell>
                  </TableRow>
                ) : leads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_COLUMNS.find(c => c.id === lead.status)?.title || lead.status}</Badge>
                    </TableCell>
                    <TableCell>{lead.source || '-'}</TableCell>
                    <TableCell>{format(new Date(lead.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLead(lead)}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        {selectedLead?.id === lead.id && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Follow-up: {lead.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-left block">Contact Method</label>
                                <Select value={contactMethod} onValueChange={setContactMethod}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PHONE">Phone Call</SelectItem>
                                    <SelectItem value="EMAIL">Email</SelectItem>
                                    <SelectItem value="IN_PERSON">In Person</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-left block">Notes</label>
                                <Textarea 
                                  placeholder="What was discussed?" 
                                  value={followUpNotes} 
                                  onChange={(e) => setFollowUpNotes(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                {lead.status === 'ADMISSION_PENDING' && (
                                  <Button 
                                    variant="default" 
                                    className="mr-auto bg-green-600 hover:bg-green-700" 
                                    onClick={() => {
                                      const params = new URLSearchParams({
                                        leadId: lead.id,
                                        name: lead.name,
                                        phone: lead.phone,
                                        email: lead.email || '',
                                      });
                                      router.push(`/students/new?${params.toString()}`);
                                    }}
                                  >
                                    Enroll Student
                                  </Button>
                                )}
                                <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
                                <Button onClick={() => logFollowUpMutation.mutate({ id: lead.id, notes: followUpNotes, method: contactMethod })}>
                                  Save Follow-up
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 pb-4 min-w-max">
              {STATUS_COLUMNS.map(column => (
                <div key={column.id} className="w-[300px] flex flex-col bg-slate-50 dark:bg-slate-900 rounded-lg p-3 shrink-0 border">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary">{getLeadsByStatus(column.id).length}</Badge>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                    >
                      {getLeadsByStatus(column.id).map((lead: any, index: number) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style }}
                            >
                              <Card className={`shadow-sm border transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="font-medium text-sm">{lead.name}</div>
                                    
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => setSelectedLead(lead)}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      {selectedLead?.id === lead.id && (
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Follow-up: {lead.name}</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Contact Method</label>
                                              <Select value={contactMethod} onValueChange={setContactMethod}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="PHONE">Phone Call</SelectItem>
                                                  <SelectItem value="EMAIL">Email</SelectItem>
                                                  <SelectItem value="IN_PERSON">In Person</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Notes</label>
                                              <Textarea 
                                                value={followUpNotes} 
                                                onChange={e => setFollowUpNotes(e.target.value)} 
                                                placeholder="Discussed pricing..." 
                                                rows={4} 
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                              {lead.status === 'ADMISSION_PENDING' && (
                                                <Button 
                                                  variant="default" 
                                                  className="mr-auto bg-green-600 hover:bg-green-700" 
                                                  onClick={() => {
                                                    const params = new URLSearchParams({
                                                      leadId: lead.id,
                                                      name: lead.name,
                                                      phone: lead.phone,
                                                      email: lead.email || '',
                                                    });
                                                    router.push(`/students/new?${params.toString()}`);
                                                  }}
                                                >
                                                  Enroll Student
                                                </Button>
                                              )}
                                              <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
                                              <Button onClick={() => logFollowUpMutation.mutate({ id: lead.id, notes: followUpNotes, method: contactMethod })}>
                                                Save Follow-up
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      )}
                                    </Dialog>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3" /> {lead.phone}
                                  </div>
                                  
                                  {lead.followUps?.length > 0 && (
                                    <div className="mt-3 pt-2 border-t text-[11px] text-muted-foreground line-clamp-2">
                                      <span className="font-medium">Last touch:</span> {lead.followUps[0].notes}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
        )}
      </div>
    </div>
  );
}
