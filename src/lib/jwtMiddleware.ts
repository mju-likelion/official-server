import jwt from 'jsonwebtoken';
import { Context, Next } from 'koa';

import User from '../models/user';

type DecodedJWT = {
  _id: string;
  name: string;
  iat: number;
  exp: number;
};

const jwtMiddleware = async (ctx: Context, next: Next): Promise<any> => {
  const token = ctx.get('access_token');
  if (!token) return next();

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not exist.');
      return;
    }
    const decoded = <DecodedJWT>jwt.verify(token, process.env.JWT_SECRET);
    ctx.state.user = {
      id: decoded._id,
      name: decoded.name,
    };

    // token의 남은 유효 기간이 3.5일 미만이면 재발급
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 60 * 60 * 24 * 3.5) {
      const user = await User.findById(decoded._id);
      const reGenerateToken = user?.generateToken();

      if (!user || !reGenerateToken) throw Error;

      ctx.set('access_token', reGenerateToken);
    }

    return next();
  } catch (e) {
    // 토큰 검증 실패
    return next();
  }
};

export default jwtMiddleware;
