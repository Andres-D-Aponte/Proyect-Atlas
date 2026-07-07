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

// 2026-08-03 es lunes (UTC). Se usa como día de referencia para toda la agenda de este archivo.
const MONDAY = '2026-08-03';

describe('Scheduling / Agenda (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const platformOwnerEmail = 'e2e-agenda-owner@atlas.dev';
  const receptionistEmail = 'e2e-agenda-receptionist@atlas.dev';
  const password = 'ChangeMe123!';

  let ownerToken: string;
  let companyAId: number;
  let companyBId: number;
  let companyAToken: string;
  let companyBToken: string;
  let receptionistToken: string;

  let branchId: number;
  let serviceId: number;
  let twoProfessionalServiceId: number;
  let resourceServiceId: number;
  let professionalId: number;
  let secondProfessionalId: number;
  let clientId: number;
  let resourceId: number;

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

    await prisma.user.deleteMany({ where: { email: platformOwnerEmail } });
    await prisma.company.deleteMany({
      where: { name: { startsWith: 'E2E Agenda ' } },
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
      .send({ name: 'E2E Agenda Empresa A' })
      .expect(201);
    companyAId = companyA.body.id;

    const companyB = await request(app.getHttpServer())
      .post('/platform/companies')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Agenda Empresa B' })
      .expect(201);
    companyBId = companyB.body.id;

    companyAToken = (
      await request(app.getHttpServer())
        .post(`/platform/companies/${companyAId}/impersonate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'E2E agenda empresa A' })
        .expect(201)
    ).body.accessToken;

    companyBToken = (
      await request(app.getHttpServer())
        .post(`/platform/companies/${companyBId}/impersonate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'E2E agenda empresa B' })
        .expect(201)
    ).body.accessToken;

    const branch = await request(app.getHttpServer())
      .post('/settings/branches')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Sucursal Agenda' })
      .expect(201);
    branchId = branch.body.id;

    const service = await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Corte simple',
        durationMinutes: 30,
        bufferMinutes: 10,
        price: 20000,
      })
      .expect(201);
    serviceId = service.body.id;

    const twoProfessionalService = await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Masaje en pareja',
        durationMinutes: 60,
        bufferMinutes: 0,
        price: 90000,
        requiresTwoProfessionals: true,
      })
      .expect(201);
    twoProfessionalServiceId = twoProfessionalService.body.id;

    const resourceService = await request(app.getHttpServer())
      .post('/catalog/services')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Manicure en silla',
        durationMinutes: 30,
        bufferMinutes: 0,
        price: 15000,
        resourceType: 'CHAIR',
      })
      .expect(201);
    resourceServiceId = resourceService.body.id;

    const professional = await request(app.getHttpServer())
      .post('/scheduling/professionals')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Ana Profesional' })
      .expect(201);
    professionalId = professional.body.id;

    const secondProfessional = await request(app.getHttpServer())
      .post('/scheduling/professionals')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Beto Profesional' })
      .expect(201);
    secondProfessionalId = secondProfessional.body.id;

    await request(app.getHttpServer())
      .post(`/scheduling/professionals/${professionalId}/schedule`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        schedule: [
          { branchId, dayOfWeek: 1, startsAt: '08:00', endsAt: '18:00' },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/scheduling/professionals/${secondProfessionalId}/schedule`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        schedule: [
          { branchId, dayOfWeek: 1, startsAt: '08:00', endsAt: '18:00' },
        ],
      })
      .expect(201);

    const resource = await request(app.getHttpServer())
      .post('/scheduling/resources')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ branchId, type: 'CHAIR', name: 'Silla 1' })
      .expect(201);
    resourceId = resource.body.id;

    const client = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Cliente Agenda', phone: '3000000000' })
      .expect(201);
    clientId = client.body.id;

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
      where: { email: { in: [platformOwnerEmail, receptionistEmail] } },
    });
    await app.close();
  });

  it('crea una cita en CONFIRMED cuando el profesional tiene horario disponible', async () => {
    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T14:00:00.000Z`,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      companyId: companyAId,
      status: 'CONFIRMED',
    });
  });

  it('rechaza una segunda cita que se superpone con el mismo profesional (overbooking)', async () => {
    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T14:10:00.000Z`,
      })
      .expect(400);
  });

  it('rechaza una cita fuera del horario del profesional', async () => {
    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T20:00:00.000Z`,
      })
      .expect(400);
  });

  it('rechaza una cita en un día con excepción/festivo', async () => {
    const exception = await request(app.getHttpServer())
      .post('/scheduling/schedule-exceptions')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        date: '2026-08-04',
        reason: 'Cierre por mantenimiento',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: '2026-08-04T14:00:00.000Z',
      })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/scheduling/schedule-exceptions/${exception.body.id}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(204);
  });

  it('rechaza una cita durante un bloqueo del profesional (ej. almuerzo)', async () => {
    const block = await request(app.getHttpServer())
      .post(`/scheduling/professionals/${professionalId}/blocks`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        type: 'LUNCH',
        startAt: `${MONDAY}T16:00:00.000Z`,
        endAt: `${MONDAY}T17:00:00.000Z`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T16:15:00.000Z`,
      })
      .expect(400);

    await request(app.getHttpServer())
      .delete(
        `/scheduling/professionals/${professionalId}/blocks/${block.body.id}`,
      )
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(204);
  });

  it('exige un segundo profesional cuando el servicio lo requiere, y valida su disponibilidad', async () => {
    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId: twoProfessionalServiceId,
        professionalId,
        startAt: `${MONDAY}T09:00:00.000Z`,
      })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId: twoProfessionalServiceId,
        professionalId,
        secondProfessionalId,
        startAt: `${MONDAY}T09:00:00.000Z`,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      professionalId,
      secondProfessionalId,
    });
  });

  it('asigna automáticamente un recurso libre del tipo que exige el servicio', async () => {
    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId: resourceServiceId,
        professionalId,
        startAt: `${MONDAY}T10:00:00.000Z`,
      })
      .expect(201);

    expect(created.body.resourceId).toBe(resourceId);
  });

  it('rechaza si el único recurso del tipo requerido ya está ocupado', async () => {
    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId: resourceServiceId,
        professionalId: secondProfessionalId,
        startAt: `${MONDAY}T10:05:00.000Z`,
      })
      .expect(400);
  });

  it('devuelve la disponibilidad del día (horario, cita y bloqueo) para dibujar la línea de tiempo', async () => {
    const availabilityProfessional = await request(app.getHttpServer())
      .post('/scheduling/professionals')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ name: 'Carla Disponibilidad' })
      .expect(201);
    const availabilityProfessionalId: number = availabilityProfessional.body.id;

    await request(app.getHttpServer())
      .post(`/scheduling/professionals/${availabilityProfessionalId}/schedule`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        schedule: [
          { branchId, dayOfWeek: 1, startsAt: '08:00', endsAt: '18:00' },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId: availabilityProfessionalId,
        startAt: `${MONDAY}T10:00:00.000Z`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/scheduling/professionals/${availabilityProfessionalId}/blocks`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        type: 'LUNCH',
        startAt: `${MONDAY}T15:00:00.000Z`,
        endAt: `${MONDAY}T16:00:00.000Z`,
      })
      .expect(201);

    const availability = await request(app.getHttpServer())
      .get('/scheduling/appointments/availability')
      .query({
        branchId,
        professionalId: availabilityProfessionalId,
        date: MONDAY,
      })
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);

    expect(availability.body).toMatchObject({
      date: MONDAY,
      dayOfWeek: 1,
      isHoliday: false,
      schedules: [{ startsAt: '08:00', endsAt: '18:00' }],
    });
    expect(availability.body.busy).toEqual([
      expect.objectContaining({
        startAt: `${MONDAY}T10:00:00.000Z`,
        endAt: `${MONDAY}T10:40:00.000Z`,
        label: 'Corte simple',
      }),
      expect.objectContaining({
        startAt: `${MONDAY}T15:00:00.000Z`,
        endAt: `${MONDAY}T16:00:00.000Z`,
        label: 'Almuerzo',
      }),
    ]);
  });

  it('rechaza consultar disponibilidad de un profesional o sucursal de otra empresa', async () => {
    await request(app.getHttpServer())
      .get('/scheduling/appointments/availability')
      .query({ branchId, professionalId, date: MONDAY })
      .set('Authorization', `Bearer ${companyBToken}`)
      .expect(404);
  });

  it('cambia el estado de una cita, registra historial y bloquea el cambio de servicio al finalizar', async () => {
    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T11:00:00.000Z`,
      })
      .expect(201);
    const appointmentId: number = created.body.id;

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);

    expect(detail.body.historyEvents.length).toBeGreaterThanOrEqual(3);
    expect(
      detail.body.historyEvents.some((event: { description: string }) =>
        event.description.includes('En atención'),
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ serviceId: twoProfessionalServiceId })
      .expect(400);
  });

  it('incrementa el contador de inasistencias del cliente al marcar NO_SHOW', async () => {
    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T12:00:00.000Z`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: 'NO_SHOW' })
      .expect(200);

    const client = await request(app.getHttpServer())
      .get(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);

    expect(client.body.noShowCount).toBeGreaterThanOrEqual(1);
  });

  it('al cancelar una cita, ofrece el cupo a la lista de espera compatible', async () => {
    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T13:00:00.000Z`,
      })
      .expect(201);

    const waitlistEntry = await request(app.getHttpServer())
      .post('/scheduling/waitlist')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ branchId, clientId, serviceId })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    const waitlist = await request(app.getHttpServer())
      .get('/scheduling/waitlist')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);

    const offered = waitlist.body.find(
      (entry: { id: number }) => entry.id === waitlistEntry.body.id,
    );
    expect(offered.status).toBe('OFFERED');
  });

  it('respeta la política de cambio de profesional controlada por el Platform Owner', async () => {
    const created = await request(app.getHttpServer())
      .post('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        branchId,
        clientId,
        serviceId,
        professionalId,
        startAt: `${MONDAY}T15:00:00.000Z`,
      })
      .expect(201);
    const appointmentId: number = created.body.id;

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ professionalId: secondProfessionalId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/platform/companies/${companyAId}/agenda-policy`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ allowProfessionalChangeOnAppointment: false })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ professionalId })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/platform/companies/${companyAId}/agenda-policy`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ allowProfessionalChangeOnAppointment: true })
      .expect(200);
  });

  it('un Recepcionista/Cajero real puede listar sucursales, profesionales y servicios para agendar, pero no crearlos', async () => {
    await request(app.getHttpServer())
      .get('/settings/branches')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/scheduling/professionals')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/catalog/services')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/settings/branches')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'Sucursal no autorizada' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/scheduling/professionals')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ name: 'Profesional no autorizado' })
      .expect(403);
  });

  it('la Empresa B no puede ver ni editar una cita de la Empresa A (aislamiento)', async () => {
    const list = await request(app.getHttpServer())
      .get('/scheduling/appointments')
      .set('Authorization', `Bearer ${companyAToken}`)
      .expect(200);
    const appointmentId: number = list.body[0].id;

    await request(app.getHttpServer())
      .get(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/scheduling/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({ status: 'CANCELLED' })
      .expect(404);
  });
});
