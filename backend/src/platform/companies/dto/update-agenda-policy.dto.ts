import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * A diferencia de la configuración de Agenda que ajusta el propio Business
 * Admin (`requireAppointmentApproval`, en `/settings/company`), esta bandera
 * la define el Platform Owner por empresa (ver PRD sección 4.2: "el Platform
 * Owner define si una empresa puede o no permitirlo").
 */
export class UpdateAgendaPolicyDto {
  @ApiProperty({ example: true })
  @IsBoolean({
    message: 'allowProfessionalChangeOnAppointment debe ser verdadero o falso',
  })
  allowProfessionalChangeOnAppointment: boolean;
}
