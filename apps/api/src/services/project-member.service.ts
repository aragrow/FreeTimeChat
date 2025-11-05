/**
 * Project Member Service
 *
 * Handles project member assignments and billability configuration
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { ProjectMember } from '../generated/prisma-client';

export interface AssignMemberData {
  projectId: string;
  userId: string;
  isBillable?: boolean;
}

export interface UpdateMemberBillabilityData {
  isBillable?: boolean;
}

export class ProjectMemberService {
  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Assign a user to a project
   */
  async assignUserToProject(data: AssignMemberData): Promise<ProjectMember> {
    // Check if already assigned
    const existing = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: data.projectId,
          userId: data.userId,
        },
      },
    });

    if (existing) {
      throw new Error('User is already assigned to this project');
    }

    return this.prisma.projectMember.create({
      data: {
        projectId: data.projectId,
        userId: data.userId,
        isBillable: data.isBillable,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Update member billability
   */
  async setUserBillability(
    projectId: string,
    userId: string,
    data: UpdateMemberBillabilityData
  ): Promise<ProjectMember> {
    return this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: {
        isBillable: data.isBillable,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Remove user from project
   */
  async removeUserFromProject(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  /**
   * Get all members of a project
   */
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        project: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string): Promise<ProjectMember[]> {
    return this.prisma.projectMember.findMany({
      where: {
        userId,
        project: {
          deletedAt: null,
        },
      },
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get member by project and user
   */
  async getMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    return this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Check if user is member of project
   */
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return member !== null;
  }

  /**
   * Get effective billability for a user on a project
   * Returns the billability considering the hierarchy:
   * 1. Project.isBillableProject (if false, always non-billable)
   * 2. ProjectMember.isBillable (if set, use this)
   * 3. Project.defaultBillable (fallback)
   */
  async getEffectiveBillability(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        project: {
          select: {
            isBillableProject: true,
            defaultBillable: true,
          },
        },
      },
    });

    if (!member) {
      // User not a member, check project defaults
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          isBillableProject: true,
          defaultBillable: true,
        },
      });

      if (!project) {
        return false;
      }

      // If project doesn't allow billable work, return false
      if (!project.isBillableProject) {
        return false;
      }

      // Otherwise use default
      return project.defaultBillable;
    }

    // If project doesn't allow billable work, return false
    if (!member.project.isBillableProject) {
      return false;
    }

    // If member has explicit billability setting, use it
    if (member.isBillable !== null) {
      return member.isBillable;
    }

    // Otherwise use project default
    return member.project.defaultBillable;
  }

  /**
   * Bulk assign users to a project
   */
  async bulkAssignUsers(
    projectId: string,
    userIds: string[],
    isBillable?: boolean
  ): Promise<number> {
    const assignments = userIds.map((userId) => ({
      projectId,
      userId,
      isBillable,
    }));

    const result = await this.prisma.projectMember.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    return result.count;
  }
}
