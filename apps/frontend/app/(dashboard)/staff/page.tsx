'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Plus, Shield, ShieldOff, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roleId: ''
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users');
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/roles');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiClient.post('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
      setIsOpen(false);
      setFormData({ email: '', password: '', roleId: '' });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.patch(`/users/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Access Control</h1>
          <p className="text-muted-foreground">Manage administrative access and non-teaching staff</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="admin@branch.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Temporary Password</label>
                <Input 
                  type="password" 
                  required 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Assign Role</label>
                <select 
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm bg-background"
                  required
                  value={formData.roleId}
                  onChange={e => setFormData({...formData, roleId: e.target.value})}
                >
                  <option value="">Select Role...</option>
                  {roles?.map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email Address</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Loading staff records...</TableCell>
              </TableRow>
            ) : users?.length ? (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-2 rounded-full">
                        <Users className="h-4 w-4 text-slate-500" />
                      </div>
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                      {user.role?.name || 'UNKNOWN'}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(user.createdAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                        <ShieldOff className="h-4 w-4" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate(user.id)}
                      className={user.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                    >
                      {user.isActive ? 'Deactivate Access' : 'Activate Access'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">No staff found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
