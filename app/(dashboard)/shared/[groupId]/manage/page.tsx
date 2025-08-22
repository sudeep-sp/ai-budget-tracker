"use client";

import React, { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  Crown,
  Shield,
  User,
  Mail,
  Copy,
  Check,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import InviteMemberDialog from "@/components/InviteMemberDialog";

interface ManageGroupPageProps {
  params: Promise<{ groupId: string }>;
}

export default function ManageGroupPage({ params }: ManageGroupPageProps) {
  const { groupId } = use(params);
  const router = useRouter();

  const queryClient = useQueryClient();

  // State for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });

  const groupQuery = useQuery({
    queryKey: ["expense-group", groupId],
    queryFn: () => fetch(`/api/groups/${groupId}`).then((res) => res.json()),
  });

  const membersQuery = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () =>
      fetch(`/api/groups/${groupId}/members`).then((res) => res.json()),
  });

  const invitationsQuery = useQuery({
    queryKey: ["group-invitations", groupId],
    queryFn: () =>
      fetch(`/api/groups/${groupId}/invitations`).then((res) => res.json()),
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(
        `/api/groups/${groupId}/members/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Member removed successfully");
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  const { mutate: deleteGroup, isPending: isDeletingGroup } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete group");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Group deleted successfully");
      router.push("/shared"); // Redirect to shared expenses main page
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete group");
    },
  });

  const { mutate: updateGroup, isPending: isUpdatingGroup } = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update group");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Group updated successfully");
      queryClient.invalidateQueries({ queryKey: ["expense-group", groupId] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update group");
    },
  });

  const group = groupQuery.data;
  const members = membersQuery.data || [];

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invitation link copied to clipboard!");
  };

  const handleEditGroup = () => {
    if (group) {
      setEditForm({
        name: group.name || "",
        description: group.description || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateGroup = () => {
    if (editForm.name.trim()) {
      updateGroup({
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
    } else {
      toast.error("Group name is required");
    }
  };

  if (groupQuery.isError || membersQuery.isError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Failed to load group data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <SkeletonWrapper
        isLoading={groupQuery.isLoading || membersQuery.isLoading}
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link href={`/shared/${groupId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Group
              </Button>
            </Link>

            <InviteMemberDialog
              groupId={groupId}
              groupName={group?.name}
              triggerButton={
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Invite Member</span>
                </Button>
              }
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Group</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {group?.name} - Members, settings, and invitations
            </p>
          </div>
        </div>

        {/* Group Members */}
        <Card>
          <CardHeader>
            <CardTitle>Group Members ({members.length})</CardTitle>
            <CardDescription>
              Manage who has access to this expense group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 md:p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {member.role === "owner" && (
                        <Crown className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                      )}
                      {member.role === "admin" && (
                        <Shield className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                      )}
                      {member.role === "member" && (
                        <User className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h4 className="font-semibold text-sm md:text-base truncate">
                          {member.name}
                        </h4>
                        <Badge
                          variant={
                            member.role === "owner" ? "default" : "secondary"
                          }
                          className="self-start"
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-xs md:text-sm text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>

                    {member.role !== "owner" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.name} from
                              this group? They will lose access to all group
                              expenses and data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMember(member.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitationsQuery.data && invitationsQuery.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations ({invitationsQuery.data.length})
              </CardTitle>
              <CardDescription>
                People who have been invited but haven&apos;t joined yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitationsQuery.data.map((invitation: any) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">
                        {invitation.email}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Invited{" "}
                        {new Date(invitation.createdAt).toLocaleDateString()} •
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const inviteLink = `${window.location.origin}/invite/${invitation.token}`;
                          navigator.clipboard.writeText(inviteLink);
                          toast.success("Invitation link copied!");
                        }}
                      >
                        📋{" "}
                        <span className="hidden sm:inline ml-1">Copy Link</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const inviteLink = `${window.location.origin}/invite/${invitation.token}`;
                          const message = `Hi! You've been invited to join "${group?.name}" expense group.\n\nClick this link to accept: ${inviteLink}\n\n(You must be signed in to accept the invitation)`;

                          if (navigator.share) {
                            navigator.share({
                              title: `Join ${group?.name} expense group`,
                              text: message,
                            });
                          } else {
                            navigator.clipboard.writeText(message);
                            toast.success(
                              "Invitation message copied to clipboard!"
                            );
                          }
                        }}
                      >
                        📤 <span className="hidden sm:inline ml-1">Share</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Settings
            </CardTitle>
            <CardDescription>
              Configure group preferences and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="mb-2 block text-sm">Group Name</Label>
                <Input value={group?.name || ""} readOnly />
              </div>
              <div>
                <Label className="mb-2 block text-sm">Currency</Label>
                <Input value={group?.currency || ""} readOnly />
              </div>
            </div>

            <div className="mb-6">
              <Label className="mb-2 block text-sm">Description</Label>
              <Input value={group?.description || "No description"} readOnly />
            </div>

            <div className="text-xs md:text-sm text-muted-foreground space-y-1">
              <p>
                • Group created on{" "}
                {group?.createdAt
                  ? new Date(group.createdAt).toLocaleDateString()
                  : "Unknown"}
              </p>
              <p>
                • Last updated{" "}
                {group?.updatedAt
                  ? new Date(group.updatedAt).toLocaleDateString()
                  : "Unknown"}
              </p>
              <p>• Total expenses: {group?._count?.expenses || 0}</p>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleEditGroup}
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Group Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Group Settings</DialogTitle>
                  <DialogDescription>
                    Update your group name and description.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="groupName" className="mb-2 block">
                      Group Name
                    </Label>
                    <Input
                      id="groupName"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="Enter group name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupDescription" className="mb-2 block">
                      Description
                    </Label>
                    <Textarea
                      id="groupDescription"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter group description (optional)"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateGroup}
                    disabled={isUpdatingGroup || !editForm.name.trim()}
                  >
                    {isUpdatingGroup ? "Updating..." : "Update Group"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that will affect all group members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the group, remove all expenses, and revoke access for all
                    members.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteGroup()}
                    disabled={isDeletingGroup}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {isDeletingGroup ? "Deleting..." : "Delete Group Forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </SkeletonWrapper>
    </div>
  );
}
