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

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const platformOwnerEmail = 'e2e-users-owner@atlas.dev';
  const businessAdminAEmail = 'e2e-users-admin-a@atlas.dev';
  const businessAdminBEmail = 'e2e-users-admin-b@atlas.dev';
  const password = 'ChangeMe123!';

  let ownerToken: string;
  let companyAId: number;
  let companyBId: number;
  let businessAdminAToken: string;
  let businessAdminBToken: string;

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
      where: {
        email: {
          in: [platformOwnerEmail, businessAdminAEmail, businessAdminBEmail],
        },
      },
    });
    await prisma.company.deleteMany({
      where: { name: { startsWith: 'E2E Users ' } },
    });

    const passwordHash = await bcrypt.hash(password, 4);
    await prisma.user.create({
      data: {
        email: platformOwnerEmail,
        passwordHash,
        role: Role.PLATFORM_OWNER,
      },
    });

    ownerToken = (await login(app, platformOwnerEmail, password)).accessToken;

    const companyA = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Users Empresa A' })
      .expect(201);
    companyAId = companyA.body.id;

    const companyB = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Users Empresa B' })
      .expect(201);
    companyBId = companyB.body.id;

    await request(app.getHttpServer())
      .post(`/platform/companies/${companyAId}/admin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: businessAdminAEmail, password })
      .expect(201);
    businessAdminAToken = (await login(app, businessAdminAEmail, password))
      .accessToken;

    await request(app.getHttpServer())
      .post(`/platform/companies/${companyBId}/admin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: businessAdminBEmail, password })
      .expect(201);
    businessAdminBToken = (await login(app, businessAdminBEmail, password))
      .accessToken;
  });

  afterAll(async () => {
    await prisma.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            platformOwnerEmail,
            businessAdminAEmail,
            businessAdminBEmail,
            'e2e-users-staff@atlas.dev',
          ],
        },
      },
    });
    await app.close();
  });

  it('el Platform Owner crea un Business Admin real que puede loguearse con sus propias credenciales', () => {
    // El login ya se hizo en beforeAll; si no funcionara, businessAdminAToken sería undefined.
    expect(businessAdminAToken).toEqual(expect.any(String));
  });

  it('rechaza crear un segundo Business Admin con el mismo correo (409)', async () => {
    await request(app.getHttpServer())
      .post(`/platform/companies/${companyAId}/admin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: businessAdminAEmail, password })
      .expect(409);
  });

  it('un rol distinto de Platform Owner no puede crear un Business Admin (403)', async () => {
    await request(app.getHttpServer())
      .post(`/platform/companies/${companyAId}/admin`)
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .send({ email: 'otro@empresa.com', password })
      .expect(403);
  });

  it('el Business Admin crea un usuario Recepcionista/Cajero de su propia empresa', async () => {
    const created = await request(app.getHttpServer())
      .post('/settings/users')
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .send({
        email: 'e2e-users-staff@atlas.dev',
        password,
        role: Role.RECEPTIONIST_CASHIER,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      email: 'e2e-users-staff@atlas.dev',
      role: Role.RECEPTIONIST_CASHIER,
      isActive: true,
    });
    expect(created.body).not.toHaveProperty('passwordHash');
  });

  it('rechaza crear un usuario con un rol no asignable (Business Admin o Platform Owner)', async () => {
    await request(app.getHttpServer())
      .post('/settings/users')
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .send({
        email: 'otro-admin@empresa.com',
        password,
        role: Role.BUSINESS_ADMIN,
      })
      .expect(400);
  });

  it('lista solo los usuarios manejables de la propia empresa (aislamiento entre empresas)', async () => {
    const listA = await request(app.getHttpServer())
      .get('/settings/users')
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .expect(200);
    expect(listA.body).toHaveLength(1);
    expect(listA.body[0]).toMatchObject({ email: 'e2e-users-staff@atlas.dev' });

    const listB = await request(app.getHttpServer())
      .get('/settings/users')
      .set('Authorization', `Bearer ${businessAdminBToken}`)
      .expect(200);
    expect(listB.body).toHaveLength(0);
  });

  it('la Empresa B no puede desactivar un usuario de la Empresa A (404)', async () => {
    const listA = await request(app.getHttpServer())
      .get('/settings/users')
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .expect(200);
    const staffId: number = listA.body[0].id;

    await request(app.getHttpServer())
      .patch(`/settings/users/${staffId}/status`)
      .set('Authorization', `Bearer ${businessAdminBToken}`)
      .send({ isActive: false })
      .expect(404);
  });

  it('desactiva un usuario y le impide iniciar sesión después', async () => {
    const listA = await request(app.getHttpServer())
      .get('/settings/users')
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .expect(200);
    const staffId: number = listA.body[0].id;

    const updated = await request(app.getHttpServer())
      .patch(`/settings/users/${staffId}/status`)
      .set('Authorization', `Bearer ${businessAdminAToken}`)
      .send({ isActive: false })
      .expect(200);
    expect(updated.body.isActive).toBe(false);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e-users-staff@atlas.dev', password })
      .expect(401);
  });
});
