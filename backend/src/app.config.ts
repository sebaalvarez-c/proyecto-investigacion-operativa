import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function configureApp(app: INestApplication): void {
  app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
