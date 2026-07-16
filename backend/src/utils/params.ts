import { AuthRequest } from '../types';

/** Extract route param as string (Express 5 types allow string | string[]) */
export const getParam = (req: AuthRequest, key: string): string => {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
};
