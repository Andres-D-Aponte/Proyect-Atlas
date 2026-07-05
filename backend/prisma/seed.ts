import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../generated/prisma';

const prisma = new PrismaClient();

/**
 * Bootstrap del primer Platform Owner. No existe (ni existirá) un endpoint
 * público de registro: el primer usuario de la plataforma se crea por este
 * seed, y el resto de usuarios se crean desde dentro del sistema (Etapa 3+).
 */
async function main(): Promise<void> {
  const email = process.env.SEED_PLATFORM_OWNER_EMAIL;
  const password = process.env.SEED_PLATFORM_OWNER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SEED_PLATFORM_OWNER_EMAIL y SEED_PLATFORM_OWNER_PASSWORD son requeridas para el seed',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(
      `Ya existe un usuario con el correo ${email}, no se crea de nuevo.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.PLATFORM_OWNER,
    },
  });

  console.log(`Platform Owner creado: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
