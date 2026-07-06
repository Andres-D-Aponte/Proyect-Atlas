import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '../generated/prisma';
import { CurrentUser } from '../src/people/auth/decorators/current-user.decorator';
import { Roles } from '../src/people/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../src/people/auth/auth-user.interface';
import { AuthTokensDto } from '../src/people/auth/dto/auth-tokens.dto';
import { JwtAuthGuard } from '../src/people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/people/auth/guards/roles.guard';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';

// Controlador de solo pruebas: existe únicamente para demostrar, de punta a
// punta, que RolesGuard bloquea con 403 a un rol no autorizado. No forma
// parte de la superficie pública de la API (no vive en src/).
@Controller('test-only/business-admin')
class BusinessAdminOnlyTestController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS_ADMIN)
  ping(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, role: user.role };
  }
}

async function login(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<AuthTokensDto> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body as AuthTokensDto;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const businessAdminEmail = 'e2e-business-admin@atlas.dev';
  const professionalEmail = 'e2e-professional@atlas.dev';
  const password = 'ChangeMe123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [BusinessAdminOnlyTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 4);
    await prisma.user.deleteMany({
      where: { email: { in: [businessAdminEmail, professionalEmail] } },
    });
    await prisma.user.createMany({
      data: [
        { email: businessAdminEmail, passwordHash, role: Role.BUSINESS_ADMIN },
        { email: professionalEmail, passwordHash, role: Role.PROFESSIONAL },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [businessAdminEmail, professionalEmail] } },
    });
    await app.close();
  });

  it('rechaza login con credenciales inválidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: businessAdminEmail, password: 'contraseña-incorrecta' })
      .expect(401);
  });

  it('acepta login con credenciales válidas y devuelve access + refresh token', async () => {
    const tokens = await login(app, businessAdminEmail, password);

    expect(tokens).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('GET /auth/me devuelve el usuario autenticado', async () => {
    const tokens = await login(app, businessAdminEmail, password);

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      email: businessAdminEmail,
      role: Role.BUSINESS_ADMIN,
    });
  });

  it('rota el refresh token y rechaza su reutilización', async () => {
    const firstTokens = await login(app, businessAdminEmail, password);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstTokens.refreshToken })
      .expect(200);
    const refreshedTokens = refreshResponse.body as AuthTokensDto;

    expect(refreshedTokens.refreshToken).not.toBe(firstTokens.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstTokens.refreshToken })
      .expect(401);
  });

  it('dos refresh concurrentes con el mismo token: exactamente uno gana la carrera', async () => {
    const tokens = await login(app, businessAdminEmail, password);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken }),
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken }),
    ]);

    const statuses = [first.status, second.status].sort();
    // Nunca deben ganar los dos a la vez (eso generaría dos pares de tokens
    // válidos a partir del mismo refresh token original).
    expect(statuses).toEqual([200, 401]);
  });

  it('permite a un Business Admin acceder a un endpoint restringido a su rol', async () => {
    const tokens = await login(app, businessAdminEmail, password);

    await request(app.getHttpServer())
      .get('/test-only/business-admin')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200, { ok: true, role: Role.BUSINESS_ADMIN });
  });

  it('deniega con 403 a un Profesional en un endpoint restringido a Business Admin', async () => {
    const tokens = await login(app, professionalEmail, password);

    await request(app.getHttpServer())
      .get('/test-only/business-admin')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(403);
  });

  it('deniega el acceso sin token', async () => {
    await request(app.getHttpServer())
      .get('/test-only/business-admin')
      .expect(401);
  });
});
