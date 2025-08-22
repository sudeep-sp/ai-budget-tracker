"use client";

import React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Users, Check, X } from "lucide-react";
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
import SkeletonWrapper from "@/components/SkeletonWrapper";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);
  const router = useRouter();

  const invitationQuery = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetch(`/api/invitations/${token}`).then((res) => res.json()),
  });

  const { mutate: respondToInvitation, isPending } = useMutation({
    mutationFn: async (accept: boolean) => {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process invitation");
      }

      return response.json();
    },
    onSuccess: (data, accepted) => {
      if (accepted) {
        toast.success("Successfully joined the group! 🎉");
        router.push(`/shared/${data.groupId}`);
      } else {
        toast.success("Invitation declined");
        router.push("/shared");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process invitation");
    },
  });

  const invitation = invitationQuery.data?.invitation;

  if (invitationQuery.isError) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => router.push("/shared")}>
              Go to Shared Expenses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <SkeletonWrapper isLoading={invitationQuery.isLoading}>
        {invitation && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold">You&apos;re Invited!</h1>
              <p className="text-muted-foreground mt-2">
                Join a shared expense group and start splitting costs
              </p>
            </div>

            {/* Invitation Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6" />
                  {invitation.groupName}
                </CardTitle>
                {invitation.groupDescription && (
                  <CardDescription className="text-base">
                    {invitation.groupDescription}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Invited Email
                    </p>
                    <p className="font-medium">{invitation.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Members
                    </p>
                    <p className="font-medium">
                      {invitation.memberCount} members
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Invitation Expires
                  </p>
                  <p className="font-medium">
                    {new Date(invitation.expiresAt).toLocaleDateString()} at{" "}
                    {new Date(invitation.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* What You Can Do */}
            <Card>
              <CardHeader>
                <CardTitle>What you can do in this group</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    View all shared expenses
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Add new expenses and split them
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Track balances and payments
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Settle up with other members
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    View group activity and history
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => respondToInvitation(true)}
                disabled={isPending}
                className="flex-1"
                size="lg"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" />
                Accept & Join Group
              </Button>

              <Button
                onClick={() => respondToInvitation(false)}
                disabled={isPending}
                variant="outline"
                size="lg"
                className="px-6"
              >
                <X className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>

            {/* Fine Print */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground text-center">
                  By accepting this invitation, you agree to join the expense
                  group and participate in shared cost tracking. You can leave
                  the group at any time from the group settings.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </SkeletonWrapper>
    </div>
  );
}
