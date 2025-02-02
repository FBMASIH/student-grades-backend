export interface JwtPayload {
  userId: number;
  username: string;
  role: 'student' | 'teacher' | 'admin';
}
