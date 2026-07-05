import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Variables de entorno inválidas:\n${errors.map((e) => e.toString()).join('\n')}`,
    );
  }

  return validatedConfig;
}
