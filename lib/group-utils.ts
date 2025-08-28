import prisma from "./prisma";
import { GroupMember } from "./generated/prisma";

export interface UserMembershipInfo extends GroupMember {
  permissions: string[];
}

export async function getUserMembership(
  groupId: string,
  userId: string
): Promise<UserMembershipInfo | null> {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      isActive: true,
    },
  });

  if (!member) {
    return null;
  }

  return {
    ...member,
    permissions: JSON.parse(member.permissions || "[]"),
  };
}

export async function verifyGroupAccess(
  groupId: string,
  userId: string
): Promise<UserMembershipInfo> {
  const member = await getUserMembership(groupId, userId);
  
  if (!member) {
    throw new Error("Not a member of this group");
  }
  
  return member;
}

export function hasPermission(
  role: string,
  permissions: string[],
  requiredPermission: string
): boolean {
  // Admins have all permissions
  if (role === "admin") {
    return true;
  }
  
  // Check if user has specific permission
  return permissions.includes(requiredPermission);
}

export async function verifyPermission(
  groupId: string,
  userId: string,
  requiredPermission: string
): Promise<UserMembershipInfo> {
  const member = await verifyGroupAccess(groupId, userId);
  
  if (!hasPermission(member.role, member.permissions, requiredPermission)) {
    throw new Error("Insufficient permissions");
  }
  
  return member;
}