'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
  const token = useAuthStore(s => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    
    // Only connect if NEXT_PUBLIC_WS_URL is explicitly set and valid, and feature is enabled
    if (!wsUrl || process.env.NEXT_PUBLIC_ENABLE_WS !== 'true' || !token) {
      return;
    }

    // Memoize socket creation to avoid recreating on token refresh
    if (!socketRef.current) {
      socketRef.current = io(wsUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false, // Prevent endless reconnection storms if server is down
      });

      socketRef.current.on('notification.received', (payload) => {
        setNotifications(prev => [payload, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    } else {
      // Update the token without disconnecting
      socketRef.current.auth = { token };
    }
  }, [token]);

  useEffect(() => {
    // Cleanup guard to prevent dangling connections
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const markAllAsRead = () => {
    setUnreadCount(0);
    // In a real app, hit an API endpoint to mark these as read in the database
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-red-600">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No new notifications
            </div>
          ) : (
            notifications.map((n, idx) => (
              <div key={idx} className="p-3 border-b hover:bg-slate-50 cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">{n.title}</span>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
