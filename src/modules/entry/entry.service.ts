import { Injectable, BadRequestException } from '@nestjs/common';
import { RagPlanExecuterService } from '../ai/services/RAG/rag-plan-executer.service';
import {
  RAG_CAPABILITY_ENTRIES,
  RAG_CAPABILITY_REQUIRED_PARAMS_BY_ID,
} from '../ai/services/RAG/capability-entries';

type ExecuteEntryInput = {
  entryId?: string;
  parameters?: Record<string, unknown>;
};

@Injectable()
export class EntryService {
  constructor(private readonly planExecuterService: RagPlanExecuterService) {}

  listEntries() {
    return RAG_CAPABILITY_ENTRIES;
  }

  async executeEntry(input: ExecuteEntryInput) {
    const entryId = String(input.entryId || '').trim();
    const parameters = (input.parameters ?? {}) as Record<string, unknown>;

    if (!entryId) {
      throw new BadRequestException('entryId is required');
    }

    const matchedEntry = RAG_CAPABILITY_ENTRIES.find((item) => item.id === entryId);
    if (!matchedEntry) {
      throw new BadRequestException(`Unknown entryId: ${entryId}`);
    }

    const required = RAG_CAPABILITY_REQUIRED_PARAMS_BY_ID[entryId] ?? [];
    const missing = required.filter((key) => {
      const value = parameters[key];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required parameters: ${missing.join(', ')}`,
      );
    }

    const [result] = await this.planExecuterService.execute([
      {
        capabilityId: entryId,
        resolvedParameters: parameters,
      },
    ]);

    return {
      entryId,
      parameters,
      result,
    };
  }
}
