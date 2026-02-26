import { 
    Controller, 
    Get, 
    Post,
    Put, 
    Delete,
    Param, 
    Body, 
    Request,
    UseGuards, 
    UsePipes, 
    ValidationPipe,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto, UpdateQuizDto } from './quizzes.dto';
import {
    SwaggerGetAllQuizzes,
    SwaggerGetQuiz,
    SwaggerGetQuizzesByClass,
    SwaggerCreateQuiz,
    SwaggerUpdateQuiz,
    SwaggerDeleteQuiz
} from './quizzes.swagger';
import { InChargeGuard } from 'src/common/guards/in-charge.guard';
import { JsonParseInterceptor } from 'src/common/interceptors/json-parse.interceptor';

@ApiTags('quizzes')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true 
}))
@Controller('quizzes')
export class QuizzesController {
    constructor(private readonly quizzesService: QuizzesService) { }

    @Get()
    @Roles('any')
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetAllQuizzes()
    async findAll() {
        return this.quizzesService.findAll();
    }

    @Get(':id')
    @Roles('any')
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetQuiz()
    async findOne(@Param('id') id: string) {
        return this.quizzesService.findOne(id);
    }

    @Get('class/:clid')
    @Roles('any')
    @SwaggerGetQuizzesByClass()
    async findQuizzesByClass(@Param('clid') clid: string) {
        return this.quizzesService.findQuizzesByClassId(clid);
    }

    @Post()
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerCreateQuiz()
    async create(
        @Request() req,
        @Body() createQuizDto: CreateQuizDto
    ) {
        return this.quizzesService.create(req.user, createQuizDto);
    }

    @Put(':qid')
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerUpdateQuiz()
    async update(
        @Request() req,
        @Param('qid') qid: string,
        @Body() updateQuizDto: UpdateQuizDto
    ) {
        return this.quizzesService.update(req.user, qid, updateQuizDto);
    }

    @Delete(':id')
    @Roles('Admin')
    // @UseGuards(InChargeGuard)
    @SwaggerDeleteQuiz()
    async delete(@Request() req, @Param('id') id: string) {
        await this.quizzesService.delete(req.user, id);
        return { message: `Quiz with ID ${id} deleted successfully` };
    }
}
