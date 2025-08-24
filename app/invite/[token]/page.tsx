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
      <div className="w-full">
        <Card className="mx-auto max-w-md">
          <CardContent className="p-6 md:p-12 text-center">
            <div className="text-4xl md:text-6xl mb-4">❌</div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
              This invitation link is invalid or has expired.
            </p>
            <Button 
              onClick={() => router.push("/shared")}
              className="w-full md:w-auto"
            >
              Go to Shared Expenses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <SkeletonWrapper isLoading={invitationQuery.isLoading}>
        {invitation && (
          <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="text-center px-2">
              <div className="text-4xl md:text-6xl mb-3 md:mb-4">🎉</div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                You&apos;re Invited!
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-md mx-auto">
                Join a shared expense group and start splitting costs with ease
              </p>
            </div>

            {/* Invitation Details */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-xl">
                  <Users className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" />
                  <span className="truncate">{invitation.groupName}</span>
                </CardTitle>
                {invitation.groupDescription && (
                  <CardDescription className="text-sm md:text-base mt-2">
                    {invitation.groupDescription}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mobile: Stack vertically, Desktop: Grid */}
                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Invited Email
                    </p>
                    <p className="font-medium text-sm md:text-base truncate">
                      {invitation.email}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Current Members
                    </p>
                    <p className="font-medium text-sm md:text-base">
                      {invitation.memberCount} members
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Invitation Expires
                  </p>
                  <p className="font-medium text-sm md:text-base">
                    {new Date(invitation.expiresAt).toLocaleDateString()} at{" "}
                    {new Date(invitation.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* What You Can Do */}
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-lg md:text-xl">What you can do in this group</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 md:space-y-3">
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>View all shared expenses and track group spending</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Add new expenses and split them with members</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track balances and manage payments</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Settle up with other group members</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>View group activity and expense history</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2">
              <Button
                onClick={() => respondToInvitation(true)}
                disabled={isPending}
                className="flex-1 h-11 md:h-12"
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
                className="h-11 md:h-12 sm:min-w-[140px]"
              >
                <X className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>

            {/* Fine Print */}
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-3 md:p-4">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
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
