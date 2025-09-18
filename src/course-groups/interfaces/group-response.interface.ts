import { UserRole } from '../../users/entities/user.entity';

export interface GroupCourseInfo {
  id: number;
  name: string;
}

export interface GroupProfessorInfo {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface GroupResponse {
  id: number;
  groupNumber: number;
  currentEnrollment: number;
  capacity: number | null;
  course: GroupCourseInfo | null;
  professor: GroupProfessorInfo | null;
}

export interface GroupInfoSummary {
  id: number;
  groupNumber: number;
  courseName: string | null;
  capacity: number | null;
  currentEnrollment: number;
}

export interface GroupStudentSummary {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  isEnrolled: boolean;
  canEnroll: boolean;
}

export interface GroupStudentsResponse {
  students: GroupStudentSummary[];
  groupInfo: GroupInfoSummary;
}
