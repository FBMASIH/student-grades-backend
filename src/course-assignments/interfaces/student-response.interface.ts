export interface StudentResponse {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  isEnrolled: boolean;
  enrollmentId?: number;
}

export interface BulkEnrollmentResponse {
  success: boolean;
  enrolled?: number; // Make optional
  unenrolled?: number; // Add unenrolled property
  errors: Array<{
    studentId: number;
    reason: string;
  }>;
}

export interface ImportStudentsResponse {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    reason: string;
  }>;
  students: Array<{
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  }>;
}

export interface EnrolledCourse {
  id: number;
  name: string;
  groupId: number;
}

export interface StudentWithCourses extends StudentResponse {
  enrolledCourses: EnrolledCourse[];
}

export interface BulkCourseEnrollmentRequest {
  studentIds: number[];
  courseIds: number[];
  groupId: number;
}

export interface BulkCourseEnrollmentResult {
  success: boolean;
  enrollments: Array<{
    studentId: number;
    courseId: number;
    success: boolean;
    reason?: string;
  }>;
}
