import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role, User } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBusinessAdminDto } from './dto/create-business-admin.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

const MANAGEABLE_ROLES = [
  Role.SUPERVISOR,
  Role.RECEPTIONIST_CASHIER,
  Role.PROFESSIONAL,
];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createBusinessAdmin(
    companyId: number,
    dto: CreateBusinessAdminDto,
  ): Promise<SafeUser> {
    return this.createUser(
      dto.email,
      dto.password,
      Role.BUSINESS_ADMIN,
      companyId,
    );
  }

  createCompanyUser(
    companyId: number,
    dto: CreateCompanyUserDto,
  ): Promise<SafeUser> {
    return this.createUser(dto.email, dto.password, dto.role, companyId);
  }

  /** Solo trae Supervisor / Recepcionista-Cajero / Profesional: es lo que un Business Admin administra desde esta pantalla. */
  async listManageableByCompany(companyId: number): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      where: { companyId, role: { in: MANAGEABLE_ROLES } },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async setActive(
    companyId: number,
    id: number,
    isActive: boolean,
  ): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, role: { in: MANAGEABLE_ROLES } },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
    return this.toSafeUser(updated);
  }

  private async createUser(
    email: string,
    password: string,
    role: Role,
    companyId: number,
  ): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, role, companyId },
      });
      return this.toSafeUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Ya existe un usuario con el correo ${email}`,
          );
        }
        if (error.code === 'P2003') {
          throw new NotFoundException(`Empresa ${companyId} no encontrada`);
        }
      }
      throw error;
    }
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }
}
