import { UserWithoutPassword } from '@safepath/shared';

declare global {
  namespace Express {
    interface Request {
      user: UserWithoutPassword;
      id: string;
    }
  }
}
