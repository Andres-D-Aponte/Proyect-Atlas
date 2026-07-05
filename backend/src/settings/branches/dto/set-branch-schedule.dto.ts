import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OpeningHourDto {
  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: '0 = domingo … 6 = sábado',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, { message: 'opensAt debe tener formato HH:mm' })
  opensAt: string;

  @ApiProperty({ example: '18:00' })
  @Matches(TIME_PATTERN, { message: 'closesAt debe tener formato HH:mm' })
  closesAt: string;
}

export class SetBranchScheduleDto {
  @ApiProperty({ type: [OpeningHourDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDto)
  schedule: OpeningHourDto[];
}
