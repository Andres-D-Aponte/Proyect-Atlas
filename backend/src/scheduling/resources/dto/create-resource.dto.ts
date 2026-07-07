import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';
import { ResourceType } from '../../../../generated/prisma';

export class CreateResourceDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'La sucursal no es válida' })
  @IsPositive({ message: 'La sucursal no es válida' })
  branchId: number;

  @ApiProperty({ enum: ResourceType, example: ResourceType.ROOM })
  @IsEnum(ResourceType, { message: 'El tipo de recurso no es válido' })
  type: ResourceType;

  @ApiProperty({ example: 'Sala 1' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;
}
