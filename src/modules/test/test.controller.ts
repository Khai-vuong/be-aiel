import { Body, Controller, Post } from '@nestjs/common';
import { TestService } from './test.service';
import {
    SummarizationService,
    SummarizeOptions,
} from '../ai/services/summarization.service';
import { IntentClassifierService } from '../ai/orchestrator/intent-classifier.service';
import { AiRequestDto } from '../ai/dtos/ai-request.dto';
import { JwtPayload } from '../users/jwt.strategy';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Request } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
interface UpdateDto {
    status?: string;
    hashed_password?: string;
}

type SummarizeTestBody = {
    text: string;
    options?: SummarizeOptions;
};

type IntentClassifierTestBody = {
    request: AiRequestDto;
    user: JwtPayload;
};

@UseGuards(JwtGuard, RolesGuard)
@Controller('test')
export class TestController {

    constructor(
        private readonly testService: TestService,
        private readonly summarizationService: SummarizationService,
        private readonly intentClassifierService: IntentClassifierService,
    ) {}

    @Post('update')
    async testUpdate() {
        return this.testService.testUpdate({status: "Inactive"} as UpdateDto);
    }

    @Post('summarization')
    async testSummarization(@Body() body: SummarizeTestBody) {
        return this.summarizationService.summarize(body.text, body.options);
    }

    @Roles('any')
    @Post('intent-classifier')
    async testIntentClassifier(@Body() body: AiRequestDto, @Request() req) {
        return this.intentClassifierService.resolveExecutionMode(
            body,
            req.user
        );
    }
}
