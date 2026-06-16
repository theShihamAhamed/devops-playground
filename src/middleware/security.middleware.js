import aj from '#config/arcjet.js';
import logger from '#config/logger.js';
import { jwttoken } from '#utils/jwt.js';
import { slidingWindow } from '@arcjet/node';

const getRequestRole = req => {
  if (req.user?.role) {
    return req.user.role;
  }

  const token = req.cookies?.token;
  if (!token) {
    return 'guest';
  }

  try {
    const decoded = jwttoken.verify(token);
    req.user = decoded;
    return decoded.role || 'user';
  } catch {
    return 'guest';
  }
};

const securityMiddleware = async (req, res, next) => {
  const MODE = process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN';

  try {
    const role = getRequestRole(req);
    const rateLimitsByRole = {
      admin: 20,
      user: 10,
      guest: 5,
    };
    const limit = rateLimitsByRole[role] || rateLimitsByRole.guest;

    const client = aj.withRule(
      slidingWindow({
        mode: MODE,
        interval: '1m',
        max: limit,
        name: `${role}-rate-limit`,
      })
    );
    const decision = await client.protect(req);

    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn('Bot request blocked', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Automated requests are not allowed',
      });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn('Shield Blocked request', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request blocked by security policy',
      });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res
        .status(403)
        .json({ error: 'Forbidden', message: 'Too many requests' });
    }

    next();
  } catch (e) {
    console.error('Arcjet middleware error: ', e);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong with the security middleware',
    });
  }
};

export default securityMiddleware;
