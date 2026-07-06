import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Client,
  ClientTimelineEvent,
  ClientTimelineEventType,
  Prisma,
} from '../../generated/prisma';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const FIELD_LABELS: Record<string, string> = {
  name: 'nombre',
  phone: 'teléfono',
  email: 'correo',
  document: 'documento',
  address: 'dirección',
  notes: 'notas',
};

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: number, dto: CreateClientDto): Promise<Client> {
    await this.assertRequiredFields(companyId, dto);

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({ data: { companyId, ...dto } });
      await tx.clientTimelineEvent.create({
        data: {
          clientId: client.id,
          type: ClientTimelineEventType.CREATED,
          description: 'Cliente registrado.',
        },
      });
      return client;
    });
  }

  findAll(companyId: number, search?: string): Promise<Client[]> {
    const where: Prisma.ClientWhereInput = search
      ? {
          companyId,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : { companyId };

    return this.prisma.client.findMany({ where, orderBy: { name: 'asc' } });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Es la
   * barrera de aislamiento entre empresas para este recurso.
   */
  async findByIdOrThrow(companyId: number, id: number): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return client;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const current = await this.findByIdOrThrow(companyId, id);

    const changedFields = Object.keys(dto).filter((key) => {
      const field = key as keyof UpdateClientDto;
      return dto[field] !== undefined && dto[field] !== current[field];
    });

    if (changedFields.length === 0) {
      return current;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({ where: { id }, data: dto });
      const labels = changedFields.map((field) => FIELD_LABELS[field] ?? field);
      await tx.clientTimelineEvent.create({
        data: {
          clientId: id,
          type: ClientTimelineEventType.UPDATED,
          description: `Datos actualizados: ${labels.join(', ')}.`,
        },
      });
      return updated;
    });
  }

  async getTimeline(
    companyId: number,
    id: number,
  ): Promise<ClientTimelineEvent[]> {
    await this.findByIdOrThrow(companyId, id);

    return this.prisma.clientTimelineEvent.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Solo aplica al alta: qué campos exige el formulario depende de la configuración de la empresa. */
  private async assertRequiredFields(
    companyId: number,
    dto: CreateClientDto,
  ): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        requireClientEmail: true,
        requireClientDocument: true,
        requireClientAddress: true,
      },
    });

    const missing: string[] = [];
    if (company?.requireClientEmail && !dto.email) {
      missing.push('El correo es obligatorio para esta empresa');
    }
    if (company?.requireClientDocument && !dto.document) {
      missing.push('El documento es obligatorio para esta empresa');
    }
    if (company?.requireClientAddress && !dto.address) {
      missing.push('La dirección es obligatoria para esta empresa');
    }

    if (missing.length > 0) {
      throw new BadRequestException(missing);
    }
  }
}
