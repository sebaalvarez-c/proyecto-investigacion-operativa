import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const isLocalDevelopmentOrigin = !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      callback(isLocalDevelopmentOrigin ? null : new Error('Origin not allowed by CORS'), isLocalDevelopmentOrigin);
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
