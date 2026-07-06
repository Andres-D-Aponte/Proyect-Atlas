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

describe('Clients (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const platformOwnerEmail = 'e2e-clients-owner@atlas.dev';
  const professionalEmail = 'e2e-clients-professional@atlas.dev';
  const receptionistEmail = 'e2e-clients-receptionist@atlas.dev';
  const password = 'ChangeMe123!';

  let ownerToken: string;
  let companyAId: number;
  let companyBId: number;
  let companyAToken: string;
  let companyBToken: string;
  let receptionistToken: string;

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
          in: [platformOwnerEmail, professionalEmail, receptionistEmail],
        },
      },
    });
    await prisma.company.deleteMany({
      where: { name: { startsWith: 'E2E Clients ' } },
    });

    const passwordHash = await bcrypt.hash(password, 4);
    await prisma.user.createMany({
      data: [
        { email: platformOwnerEmail, passwordHash, role: Role.PLATFORM_OWNER },
        { email: professionalEmail, passwordHash, role: Role.PROFESSIONAL },
      ],
    });

    ownerToken = (await login(app, platformOwnerEmail, password)).accessToken;

    const companyA = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Clients Empresa A' })
      .expect(201);
    companyAId = companyA.body.id;

    const companyB = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Clients Empresa B' })
      .expect(201);
    companyBId = companyB.body.id;

    companyAToken = (
      await request(app.getHttpServer())
        .post(`/platform/companies/${companyAId}/impersonate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'E2E clients empresa A' })
        .expect(201)
    ).body.accessToken;

    companyBToken = (
      await request(app.getHttpServer())
        .post(`/platform/companies/${companyBId}/impersonate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'E2E clients empresa B' })
        .expect(201)
    ).body.accessToken;

    await request(app.getHttpServer())
      .post('/settings/users')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        email: receptionistEmail,
        password,
        role: Role.RECEPTIONIST_CASHIER,
      })
      .expect(201);
    receptionistToken = (await login(app, receptionistEmail, password))
      .accessToken;
  });

  afterAll(async () => {
    await prisma.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [platformOwnerEmail, professionalEmail, receptionistEmail],
        },
      },
    });
    await app.close();
  });

  it('un Recepcionista real (no impersonado) crea un cliente con solo nombre y teléfono', async () => {
    const created = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'María Pérez', phone: '3001234567' })
      .expect(201);

    expect(created.body).toMatchObject({
      companyId: companyAId,
      name: 'María Pérez',
      phone: '3001234567',
      email: null,
    });
  });

  it('un Platform Owner sin impersonar y un Profesional reciben 403', async () => {
    await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'X', phone: '1' })
      .expect(403);

    const tokens = await login(app, professionalEmail, password);
    await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ name: 'X', phone: '1' })
      .expect(403);
  });

  it('exige correo al crear un cliente si la empresa lo configuró como obligatorio', async () => {
    await request(app.getHttpServer())
      .patch('/settings/company')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ requireClientEmail: true })
      .expect(200);

    await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Sin correo', phone: '3009999999' })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Con correo',
        phone: '3008888888',
        email: 'con-correo@atlas.dev',
      })
      .expect(201);
    expect(created.body.email).toBe('con-correo@atlas.dev');

    // Se desactiva de nuevo para no afectar el resto de las pruebas de este archivo.
    await request(app.getHttpServer())
      .patch('/settings/company')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ requireClientEmail: false })
      .expect(200);
  });

  it('busca clientes por nombre/teléfono/correo dentro de la propia empresa', async () => {
    const list = await request(app.getHttpServer())
      .get('/clients')
      .query({ search: 'maría' })
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);

    expect(list.body.length).toBeGreaterThanOrEqual(1);
    expect(
      list.body.every((client: { name: string }) =>
        client.name.toLowerCase().includes('maría'),
      ),
    ).toBe(true);
  });

  it('la Empresa B no puede ver ni editar un cliente de la Empresa A (aislamiento)', async () => {
    const listA = await request(app.getHttpServer())
      .get('/clients')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const clientId: number = listA.body[0].id;

    await request(app.getHttpServer())
      .get(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({ name: 'Hackeado' })
      .expect(404);
  });

  it('la línea de tiempo registra el alta y las ediciones posteriores', async () => {
    const created = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Timeline Test', phone: '3007777777' })
      .expect(201);
    const clientId: number = created.body.id;

    await request(app.getHttpServer())
      .patch(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ phone: '3007777778' })
      .expect(200);

    const timeline = await request(app.getHttpServer())
      .get(`/clients/${clientId}/timeline`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);

    expect(timeline.body).toHaveLength(2);
    expect(timeline.body[0]).toMatchObject({
      type: 'UPDATED',
      description: 'Datos actualizados: teléfono.',
    });
    expect(timeline.body[1]).toMatchObject({
      type: 'CREATED',
      description: 'Cliente registrado.',
    });
  });
});
