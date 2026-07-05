import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { BillingCycle, Role } from '../generated/prisma';
import { AuthTokensDto } from '../src/people/auth/dto/auth-tokens.dto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';

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

describe('Platform Owner (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const platformOwnerEmail = 'e2e-platform-owner@atlas.dev';
  const professionalEmail = 'e2e-platform-professional@atlas.dev';
  const password = 'ChangeMe123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({
      where: { email: { in: [platformOwnerEmail, professionalEmail] } },
    });

    const passwordHash = await bcrypt.hash(password, 4);
    await prisma.user.createMany({
      data: [
        { email: platformOwnerEmail, passwordHash, role: Role.PLATFORM_OWNER },
        { email: professionalEmail, passwordHash, role: Role.PROFESSIONAL },
      ],
    });
  });

  afterAll(async () => {
    await prisma.impersonationLog.deleteMany({});
    await prisma.license.deleteMany({});
    await prisma.company.deleteMany({
      where: { name: { startsWith: 'E2E ' } },
    });
    await prisma.plan.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma.user.deleteMany({
      where: { email: { in: [platformOwnerEmail, professionalEmail] } },
    });
    await app.close();
  });

  it('un rol no autorizado (Profesional) recibe 403 al intentar crear una empresa', async () => {
    const tokens = await login(app, professionalEmail, password);

    await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ name: 'E2E Empresa no autorizada' })
      .expect(403);
  });

  it('sin token, se rechaza con 401', async () => {
    await request(app.getHttpServer())
      .post('/platform/companies')
      .send({ name: 'E2E Empresa sin token' })
      .expect(401);
  });

  it('flujo completo: Platform Owner crea plan, empresa, asigna licencia e impersona', async () => {
    const tokens = await login(app, platformOwnerEmail, password);
    const authHeader = `Bearer ${tokens.accessToken}`;

    const planResponse = await request(app.getHttpServer())
      .post('/platform/plans')
      .set('Authorization', authHeader)
      .send({
        name: 'E2E Plan Pro',
        enabledModules: ['whatsapp'],
        maxUsers: 10,
      })
      .expect(201);

    expect(planResponse.body).toMatchObject({
      name: 'E2E Plan Pro',
      maxUsers: 10,
    });

    const listPlansResponse = await request(app.getHttpServer())
      .get('/platform/plans')
      .set('Authorization', authHeader)
      .expect(200);

    expect(Array.isArray(listPlansResponse.body)).toBe(true);

    const companyResponse = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', authHeader)
      .send({ name: 'E2E Empresa de prueba' })
      .expect(201);

    expect(companyResponse.body).toMatchObject({
      name: 'E2E Empresa de prueba',
    });
    const companyId: number = companyResponse.body.id;

    const licenseResponse = await request(app.getHttpServer())
      .post(`/platform/companies/${companyId}/license`)
      .set('Authorization', authHeader)
      .send({
        planId: planResponse.body.id,
        billingCycle: BillingCycle.MONTHLY,
        endDate: '2026-12-31T00:00:00.000Z',
      })
      .expect(201);

    expect(licenseResponse.body).toMatchObject({
      companyId,
      planId: planResponse.body.id,
      billingCycle: BillingCycle.MONTHLY,
      expirationBehavior: 'IMMEDIATE_READ_ONLY',
    });

    await request(app.getHttpServer())
      .get(`/platform/companies/${companyId}/license`)
      .set('Authorization', authHeader)
      .expect(200);

    const impersonateResponse = await request(app.getHttpServer())
      .post(`/platform/companies/${companyId}/impersonate`)
      .set('Authorization', authHeader)
      .send({ reason: 'Soporte técnico: verificación e2e' })
      .expect(201);
    const impersonationTokens = impersonateResponse.body as AuthTokensDto;

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${impersonationTokens.accessToken}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({
      role: Role.BUSINESS_ADMIN,
      companyId,
    });

    const auditRecords = await prisma.impersonationLog.findMany({
      where: { companyId },
    });
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0].reason).toBe('Soporte técnico: verificación e2e');
  });

  it('rechaza la impersonación sin un motivo', async () => {
    const tokens = await login(app, platformOwnerEmail, password);

    const companyResponse = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ name: 'E2E Empresa para validar motivo' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/platform/companies/${companyResponse.body.id}/impersonate`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ reason: '' })
      .expect(400);
  });

  it('devuelve 404 al impersonar una empresa inexistente', async () => {
    const tokens = await login(app, platformOwnerEmail, password);

    await request(app.getHttpServer())
      .post('/platform/companies/999999/impersonate')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ reason: 'Motivo válido de prueba' })
      .expect(404);
  });
});
