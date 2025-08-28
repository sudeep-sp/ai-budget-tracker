"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteMemberDialogProps {
  groupId: string;
  groupName?: string;
  triggerButton?: React.ReactNode;
}

export default function InviteMemberDialog({
  groupId,
  groupName,
  triggerButton,
}: InviteMemberDialogProps) {
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"member" | "admin">(
    "member"
  );
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);

  const queryClient = useQueryClient();

  const { mutate: inviteMember, isPending: isInviting } = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || error.error || "Failed to send invitation"
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(
        <div>
          <p className="font-semibold">✅ Invitation sent!</p>
          <p className="text-sm">
            {inviteEmail} will receive a notification in their account
          </p>
        </div>,
        { duration: 5000 }
      );

      setInviteEmail("");
      setShowInviteDialog(false);

      // Refresh data
      queryClient.invalidateQueries({
        queryKey: ["group-invitations", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["group-members", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["expense-group", groupId],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    inviteMember({ email: inviteEmail.trim(), role: inviteRole });
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      Invite Member
    </Button>
  );

  return (
    <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
      <DialogTrigger asChild>{triggerButton || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            Invite New Member
          </DialogTitle>
          <DialogDescription className="text-sm">
            Send an invitation to join {groupName ? `"${groupName}"` : "this"}{" "}
            expense group.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md text-xs md:text-sm">
          <strong>📋 How it works:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>
              The person must already have an account (sign up at /sign-up)
            </li>
            <li>We&apos;ll send the invitation directly to their account</li>
            <li>They&apos;ll receive a notification when they sign in</li>
            <li>They can accept or decline the invitation from their notifications</li>
          </ol>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="role" className="text-sm">
              Role
            </Label>
            <Select
              value={inviteRole}
              onValueChange={(value: any) => setInviteRole(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  Member - Can add expenses and payments
                </SelectItem>
                <SelectItem value="admin">
                  Admin - Can manage members and settings
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleInvite}
            disabled={isInviting}
            className="w-full"
            size="sm"
          >
            {isInviting ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
