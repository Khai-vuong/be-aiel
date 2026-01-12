import { 
    Controller, 
    Get, 
    Post,
    Put, 
    Delete,
    Param, 
    Body, 
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
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetAllQuizzes()
    async findAll() {
        return this.quizzesService.findAll();
    }

    @Get(':id')
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetQuiz()
    async findOne(@Param('id') id: string) {
        return this.quizzesService.findOne(id);
    }

    @Get('class/:clid')
    @SwaggerGetQuizzesByClass()
    async findQuizzesByClass(@Param('clid') clid: string) {
        return this.quizzesService.findQuizzesByClassId(clid);
    }

    @Post()
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerCreateQuiz()
    async create(
        @Body() createQuizDto: CreateQuizDto
    ) {
        return this.quizzesService.create(createQuizDto);
    }

    @Put(':qid')
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerUpdateQuiz()
    async update(
        @Param('qid') qid: string,
        @Body() updateQuizDto: UpdateQuizDto
    ) {
        return this.quizzesService.update(qid, updateQuizDto);
    }

    @Delete(':id')
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerDeleteQuiz()
    async delete(@Param('id') id: string) {
        await this.quizzesService.delete(id);
        return { message: `Quiz with ID ${id} deleted successfully` };
    }
}
