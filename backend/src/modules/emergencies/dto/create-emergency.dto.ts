import { Type } from 'class-transformer';
import { IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateEmergencyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
