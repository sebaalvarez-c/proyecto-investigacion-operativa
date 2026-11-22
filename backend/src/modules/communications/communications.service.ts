import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CommunicationRepository } from '../../database/in-memory.repositories.js';
import type { CreateMessageDto } from './dto/create-message.dto.js';

@Injectable()
export class CommunicationsService {
  constructor(private readonly repo: CommunicationRepository) {}

  create(dto: CreateMessageDto) {
    const record = this.repo.create({
      emergencyId: dto.emergencyId,
      from: dto.from,
      text: dto.text,
      isAudio: dto.isAudio ?? false,
      ambulanceCode: dto.ambulanceCode,
      recipientEmail: dto.recipientEmail,
    });
    this.fireWebhook({
      type: 'communication',
      emergencyId: record.emergencyId,
      from: record.from,
      text: record.text,
      isAudio: record.isAudio,
      ambulanceCode: record.ambulanceCode,
      recipientEmail: record.recipientEmail,
      timestamp: record.createdAt,
    });
    return record;
  }

  listByEmergency(emergencyId: string) {
    return this.repo.listByEmergency(emergencyId);
  }

  listAll() {
    return this.repo.listAll();
  }

  async transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('GEMINI_API_KEY no configurada en el servidor.');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Transcribí este audio médico en español. Devolvé únicamente el texto transcripto, sin comentarios adicionales.' },
              { inlineData: { mimeType, data: base64Audio } },
            ],
          }],
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text().catch(() => 'unknown');
      throw new InternalServerErrorException(`Gemini respondió ${response.status}: ${err}`);
    }

    const data = await response.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No se pudo transcribir el audio.';
  }

  private fireWebhook(payload: Record<string, unknown>): void {
    const url = process.env.MAKE_WEBHOOK_URL;
    if (!url) return;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err: unknown) => console.error('[make-webhook]', err));
  }
}
