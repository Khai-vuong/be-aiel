import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    UseGuards,
    UsePipes,
    ValidationPipe,
    Request
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AttemptsService } from './attempts.service';
import { CreateAttemptDto, SubmitAttemptDto, UpdateAttemptDto } from './attempts.dto';
import {
    SwaggerCreateAttempt,
    SwaggerSubmitAttempt,
    SwaggerGetAttemptsByQuiz,
    SwaggerGetAttemptsByQuizAndStudent,
    SwaggerGetAttempt,
    SwaggerUpdateAttempt
} from './attempts.swagger';

@ApiTags('attempts')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(new ValidationPipe({
    whitelist: true,
    transform: true
}))
@Controller('attempts')
export class AttemptsController {
    constructor(private readonly attemptsService: AttemptsService) { }

    @Post()
    @Roles('Student')
    @SwaggerCreateAttempt()
    async create(@Request() req, @Body() createAttemptDto: CreateAttemptDto) {
        return this.attemptsService.create(req.user, createAttemptDto);
    }

    @Put(':attemptId/submit')
    @Roles('Student')
    @SwaggerSubmitAttempt()
    async submit(
        @Request() req,
        @Param('attemptId') attemptId: string,
        @Body() submitAttemptDto: SubmitAttemptDto
    ) {
        return this.attemptsService.submit(req.user, attemptId, submitAttemptDto);
    }

    @Get('quiz/:qid')
    @Roles('Admin', 'Lecturer')
    @SwaggerGetAttemptsByQuiz()
    async findByQuizId(@Param('qid') qid: string) {
        return this.attemptsService.findByQuizId(qid);
    }

    @Get('quiz/:qid/student/:sid')
    @SwaggerGetAttemptsByQuizAndStudent()
    async findByQuizAndStudent(
        @Param('qid') qid: string,
        @Param('sid') sid: string
    ) {
        return this.attemptsService.findByQuizAndStudent(qid, sid);
    }

    @Get(':attemptId')
    @Roles('any')
    async findOne(@Param('attemptId') attemptId: string) {
        return this.attemptsService.findOne(attemptId);
    }

    @Put(':attemptId')
    @Roles('Admin', 'Lecturer')
    @SwaggerUpdateAttempt()
    async update(
        @Request() req,
        @Param('attemptId') attemptId: string,
        @Body() updateAttemptDto: UpdateAttemptDto
    ) {
        return this.attemptsService.update(req.user, attemptId, updateAttemptDto);
    }
}
