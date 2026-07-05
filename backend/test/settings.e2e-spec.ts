import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '../generated/prisma';
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

describe('Settings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const platformOwnerEmail = 'e2e-settings-owner@atlas.dev';
  const professionalEmail = 'e2e-settings-professional@atlas.dev';
  const password = 'ChangeMe123!';

  let ownerToken: string;
  let companyAId: number;
  let companyBId: number;
  let companyAImpersonationToken: string;
  let companyBImpersonationToken: string;

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
    await prisma.company.deleteMany({
      where: { name: { startsWith: 'E2E Settings ' } },
    });

    const passwordHash = await bcrypt.hash(password, 4);
    await prisma.user.createMany({
      data: [
        { email: platformOwnerEmail, passwordHash, role: Role.PLATFORM_OWNER },
        { email: professionalEmail, passwordHash, role: Role.PROFESSIONAL },
      ],
    });

    const ownerTokens = await login(app, platformOwnerEmail, password);
    ownerToken = ownerTokens.accessToken;

    const companyA = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Settings Empresa A' })
      .expect(201);
    companyAId = companyA.body.id;

    const companyB = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Settings Empresa B' })
      .expect(201);
    companyBId = companyB.body.id;

    const impersonateA = await request(app.getHttpServer())
      .post(`/platform/companies/${companyAId}/impersonate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'E2E settings empresa A' })
      .expect(201);
    companyAImpersonationToken = (impersonateA.body as AuthTokensDto)
      .accessToken;

    const impersonateB = await request(app.getHttpServer())
      .post(`/platform/companies/${companyBId}/impersonate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'E2E settings empresa B' })
      .expect(201);
    companyBImpersonationToken = (impersonateB.body as AuthTokensDto)
      .accessToken;
  });

  afterAll(async () => {
    await prisma.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [platformOwnerEmail, professionalEmail] } },
    });
    await app.close();
  });

  it('una empresa nueva arranca con moneda COP y efectivo+transferencia habilitados', async () => {
    const response = await request(app.getHttpServer())
      .get('/settings/company')
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: companyAId,
      currency: 'COP',
      language: 'es',
      enabledPaymentMethods: ['CASH', 'TRANSFER'],
    });
  });

  it('el Business Admin (impersonado) puede actualizar la configuración de su empresa', async () => {
    const response = await request(app.getHttpServer())
      .patch('/settings/company')
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .send({ currency: 'USD', primaryColor: '#112233' })
      .expect(200);

    expect(response.body).toMatchObject({
      currency: 'USD',
      primaryColor: '#112233',
    });
  });

  it('rechaza un color primario con formato inválido', async () => {
    await request(app.getHttpServer())
      .patch('/settings/company')
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .send({ primaryColor: 'no-es-un-color' })
      .expect(400);
  });

  it('un Platform Owner sin impersonar recibe 403 (rol no autorizado para este endpoint)', async () => {
    await request(app.getHttpServer())
      .get('/settings/company')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);
  });

  it('un Profesional recibe 403', async () => {
    const tokens = await login(app, professionalEmail, password);

    await request(app.getHttpServer())
      .get('/settings/company')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(403);
  });

  it('crea, lista y consulta sucursales de la propia empresa', async () => {
    const created = await request(app.getHttpServer())
      .post('/settings/branches')
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .send({ name: 'Sucursal Centro', address: 'Calle 10 # 5-30' })
      .expect(201);

    expect(created.body).toMatchObject({
      companyId: companyAId,
      name: 'Sucursal Centro',
    });
    const branchId: number = created.body.id;

    const list = await request(app.getHttpServer())
      .get('/settings/branches')
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const detail = await request(app.getHttpServer())
      .get(`/settings/branches/${branchId}`)
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      id: branchId,
      name: 'Sucursal Centro',
    });

    const scheduled = await request(app.getHttpServer())
      .post(`/settings/branches/${branchId}/schedule`)
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .send({
        schedule: [{ dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' }],
      })
      .expect(201);
    expect(scheduled.body.openingHours).toEqual([
      { dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' },
    ]);

    // Aislamiento entre empresas: la Empresa B no puede ver la sucursal de la Empresa A.
    await request(app.getHttpServer())
      .get(`/settings/branches/${branchId}`)
      .set('Authorization', `Bearer ${companyBImpersonationToken}`)
      .expect(404);
  });

  it('rechaza un horario con formato de hora inválido', async () => {
    const created = await request(app.getHttpServer())
      .post('/settings/branches')
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .send({ name: 'Sucursal para validar horario' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/settings/branches/${created.body.id}/schedule`)
      .set('Authorization', `Bearer ${companyAImpersonationToken}`)
      .send({ schedule: [{ dayOfWeek: 1, opensAt: '9am', closesAt: '18:00' }] })
      .expect(400);
  });
});
