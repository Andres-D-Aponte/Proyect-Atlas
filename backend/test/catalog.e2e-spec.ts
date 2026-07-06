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

describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const platformOwnerEmail = 'e2e-catalog-owner@atlas.dev';
  const professionalEmail = 'e2e-catalog-professional@atlas.dev';
  const password = 'ChangeMe123!';

  let ownerToken: string;
  let companyAId: number;
  let companyBId: number;
  let companyAToken: string;
  let companyBToken: string;

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
      where: { name: { startsWith: 'E2E Catalog ' } },
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
      .send({ name: 'E2E Catalog Empresa A' })
      .expect(201);
    companyAId = companyA.body.id;

    const companyB = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Catalog Empresa B' })
      .expect(201);
    companyBId = companyB.body.id;

    companyAToken = (
      await request(app.getHttpServer())
        .post(`/platform/companies/${companyAId}/impersonate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'E2E catalog empresa A' })
        .expect(201)
    ).body.accessToken;

    companyBToken = (
      await request(app.getHttpServer())
        .post(`/platform/companies/${companyBId}/impersonate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'E2E catalog empresa B' })
        .expect(201)
    ).body.accessToken;
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

  it('dos empresas distintas pueden usar el mismo nombre de categoría sin conflicto', async () => {
    await request(app.getHttpServer())
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Cortes' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({ name: 'Cortes' })
      .expect(201);
  });

  it('rechaza una categoría repetida dentro de la misma empresa (409)', async () => {
    await request(app.getHttpServer())
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Cortes' })
      .expect(409);
  });

  it('un Profesional recibe 403 al intentar crear una categoría', async () => {
    const tokens = await login(app, professionalEmail, password);

    await request(app.getHttpServer())
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ name: 'Otra' })
      .expect(403);
  });

  it('crea un servicio con categoría propia, comisión y recurso requerido', async () => {
    const category = await request(app.getHttpServer())
      .get('/catalog/categories')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const categoryId: number = category.body[0].id;

    const created = await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Masaje relajante',
        categoryId,
        durationMinutes: 60,
        bufferMinutes: 15,
        price: 90000,
        commissionType: 'PERCENTAGE',
        commissionValue: 20,
        resourceType: 'ROOM',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      companyId: companyAId,
      name: 'Masaje relajante',
      categoryId,
      durationMinutes: 60,
      bufferMinutes: 15,
      price: 90000,
      commissionType: 'PERCENTAGE',
      commissionValue: 20,
      resourceType: 'ROOM',
      isActive: true,
    });
  });

  it('rechaza un servicio con una categoría de otra empresa (404)', async () => {
    const categoryB = await request(app.getHttpServer())
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({ name: 'Solo de la empresa B' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Servicio inválido',
        categoryId: categoryB.body.id,
        durationMinutes: 30,
        price: 10000,
      })
      .expect(404);
  });

  it('rechaza una comisión porcentual mayor a 100 (400)', async () => {
    await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Servicio con comisión inválida',
        durationMinutes: 30,
        price: 10000,
        commissionType: 'PERCENTAGE',
        commissionValue: 150,
      })
      .expect(400);
  });

  it('acepta una comisión fija mayor a 100 (no la limita al ser un monto, no un porcentaje)', async () => {
    await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Servicio con comisión fija alta',
        durationMinutes: 30,
        price: 500000,
        commissionType: 'FIXED',
        commissionValue: 40000,
      })
      .expect(201);
  });

  it('la Empresa B no puede ver ni editar un servicio de la Empresa A (aislamiento)', async () => {
    const listA = await request(app.getHttpServer())
      .get('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const serviceId: number = listA.body[0].id;

    await request(app.getHttpServer())
      .get(`/catalog/services/${serviceId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/catalog/services/${serviceId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({ price: 1 })
      .expect(404);
  });

  it('desactiva un servicio actualizando isActive', async () => {
    const listA = await request(app.getHttpServer())
      .get('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const serviceId: number = listA.body[0].id;

    const updated = await request(app.getHttpServer())
      .patch(`/catalog/services/${serviceId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(updated.body.isActive).toBe(false);
  });

  it('borrar una categoría no borra sus servicios, solo los deja sin categoría', async () => {
    const categories = await request(app.getHttpServer())
      .get('/catalog/categories')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const categoryId: number = categories.body[0].id;

    const servicesBefore = await request(app.getHttpServer())
      .get('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const serviceWithCategory = servicesBefore.body.find(
      (s: { categoryId: number | null }) => s.categoryId === categoryId,
    );
    expect(serviceWithCategory).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/catalog/categories/${categoryId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(204);

    const servicesAfter = await request(app.getHttpServer())
      .get('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const sameService = servicesAfter.body.find(
      (s: { id: number }) => s.id === serviceWithCategory.id,
    );
    expect(sameService.categoryId).toBeNull();
  });
});
