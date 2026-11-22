import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  emergencyId!: string;

  @IsEnum(['ambulance', 'hospital'])
  from!: 'ambulance' | 'hospital';

  @IsString()
  text!: string;

  @IsBoolean()
  @IsOptional()
  isAudio?: boolean;

  @IsString()
  @IsOptional()
  ambulanceCode?: string;

  @IsString()
  @IsOptional()
  recipientEmail?: string;
}
