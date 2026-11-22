import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommunicationsService } from './communications.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { TranscribeDto } from './dto/transcribe.dto.js';

@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.service.create(dto);
  }

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Get(':emergencyId')
  listByEmergency(@Param('emergencyId') emergencyId: string) {
    return this.service.listByEmergency(emergencyId);
  }

  @Post('transcribe')
  async transcribe(@Body() dto: TranscribeDto) {
    const text = await this.service.transcribeAudio(dto.audio, dto.mimeType);
    return { text };
  }
}
