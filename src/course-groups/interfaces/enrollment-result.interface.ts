export interface EnrollmentResult {
  message: string;
  groupId: number;
  enrollmentResults: {
    successful: number[];
    failed: Array<{ studentId: number; reason: string }>;
  };
}
