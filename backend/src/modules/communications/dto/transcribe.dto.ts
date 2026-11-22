import { IsString } from 'class-validator';

export class TranscribeDto {
  @IsString()
  audio!: string; // base64-encoded audio

  @IsString()
  mimeType!: string; // e.g. 'audio/webm'
}
