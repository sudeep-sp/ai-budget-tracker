"use client";

import React from "react";
import { Bell, Check, Clock, Users, X, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

export default function NotificationButton() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return empty array
          return [];
        }
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/delete-all", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete all notifications");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications deleted");
    },
  });

  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ notificationId, accept }: { notificationId: string; accept: boolean }) => {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification?.data) {
        throw new Error("Invalid invitation notification");
      }

      const invitationData = JSON.parse(notification.data);
      const response = await fetch(`/api/invitations/${invitationData.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to process invitation";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON (like HTML from redirect), use status text
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Mark notification as read
      await markAsReadMutation.mutateAsync(notificationId);
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.accept) {
        toast.success("Successfully joined the group! 🎉");
      } else {
        toast.success("Invitation declined");
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process invitation");
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_reminder":
        return <Bell className="h-4 w-4 text-orange-500" />;
      case "group_invitation":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "activity":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleInvitationResponse = (notificationId: string, accept: boolean) => {
    respondToInvitationMutation.mutate({ notificationId, accept });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="h-6 text-xs"
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAllNotificationsMutation.mutate()}
                disabled={deleteAllNotificationsMutation.isPending}
                className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete all
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <ScrollArea className="h-80">
            {recentNotifications.map((notification) => (
              <div key={notification.id} className="p-3 border-b last:border-b-0">
                <div
                  className={`cursor-pointer ${!notification.isRead ? "bg-muted/50 rounded-sm p-2 -m-2" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                          disabled={deleteNotificationMutation.isPending}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                      
                      {notification.type === "group_invitation" && !notification.isRead && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvitationResponse(notification.id, true);
                            }}
                            disabled={respondToInvitationMutation.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvitationResponse(notification.id, false);
                            }}
                            disabled={respondToInvitationMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
        
        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center">
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}