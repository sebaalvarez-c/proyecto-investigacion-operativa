import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { json } from 'express';

export function configureApp(app: INestApplication): void {
  app.use(json({ limit: '10mb' }));
  const configuredOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowedOrigins = [...new Set([...configuredOrigins, 'https://ambulance-transport.vercel.app'])];
  const isProduction = process.env.NODE_ENV === 'production';
  const productionOrigin = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const isAllowed = !origin || allowedOrigins.includes(origin);
    callback(isAllowed ? null : new Error('Origin not allowed by CORS'), isAllowed);
  };
  app.enableCors({
    origin: isProduction ? productionOrigin : (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const isLocalDevelopmentOrigin = !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      callback(isLocalDevelopmentOrigin ? null : new Error('Origin not allowed by CORS'), isLocalDevelopmentOrigin);
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
