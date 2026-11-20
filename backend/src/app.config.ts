import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function configureApp(app: INestApplication): void {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProduction ? allowedOrigins : (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const isLocalDevelopmentOrigin = !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      callback(isLocalDevelopmentOrigin ? null : new Error('Origin not allowed by CORS'), isLocalDevelopmentOrigin);
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
