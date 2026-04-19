import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { EntryService } from './entry.service';

type ExecuteEntryBody = {
  entryId?: string;
  parameters?: Record<string, unknown>;
};

@ApiTags('Entry Tester')
@ApiBearerAuth()
@Controller('entry')
@UseGuards(JwtGuard, RolesGuard)
export class EntryController {
  constructor(private readonly entryService: EntryService) {}

  @Get('catalog')
  @Roles('any')
  @ApiOperation({ summary: 'List all RAG entries for testing' })
  getCatalog() {
    return this.entryService.listEntries();
  }

  @Post('execute')
  @Roles('any')
  @ApiOperation({ summary: 'Execute one RAG entry with parameters from request body' })
  execute(@Request() req, @Body() body: ExecuteEntryBody) {
    return this.entryService.executeEntry({
      entryId: body.entryId,
      parameters: body.parameters,
    });
  }
}
