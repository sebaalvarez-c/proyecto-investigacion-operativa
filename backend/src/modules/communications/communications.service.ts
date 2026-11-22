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

    // Strip codec parameters — Gemini expects simple MIME types like 'audio/webm', not 'audio/webm;codecs=opus'
    const simpleMimeType = mimeType.split(';')[0].trim();

    const body = JSON.stringify({
      contents: [{
        parts: [
          { text: 'Transcribí este audio médico en español. Devolvé únicamente el texto transcripto, sin comentarios adicionales.' },
          { inlineData: { mimeType: simpleMimeType, data: base64Audio } },
        ],
      }],
    });

    const MAX_RETRIES = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
      );

      if (response.ok) {
        const data = await response.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No se pudo transcribir el audio.';
      }

      const errText = await response.text().catch(() => 'unknown');

      // Retry on 503 (service overloaded) with exponential backoff
      if (response.status === 503 && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        lastError = errText;
        continue;
      }

      throw new InternalServerErrorException(`Gemini respondió ${response.status}: ${errText}`);
    }

    throw new InternalServerErrorException(`Gemini no disponible después de ${MAX_RETRIES} intentos: ${lastError}`);
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
