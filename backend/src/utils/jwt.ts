import { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwt.secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};
