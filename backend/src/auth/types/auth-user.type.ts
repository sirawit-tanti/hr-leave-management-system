import { Role } from '../../generated/prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  employeeProfileId: string | null;
};
