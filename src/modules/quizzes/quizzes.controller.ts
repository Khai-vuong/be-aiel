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
    ValidationPipe
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
    @SwaggerGetAllQuizzes()
    async findAll() {
        return this.quizzesService.findAll();
    }

    @Get(':id')
    @SwaggerGetQuiz()
    async findOne(@Param('id') id: string) {
        return this.quizzesService.findOne(id);
    }

    @Get('class/:clid')
    @SwaggerGetQuizzesByClass()
    async findQuizzesByClass(@Param('clid') clid: string) {
        return this.quizzesService.findQuizzesByClassId(clid);
    }

    @Post('class/:clid')
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerCreateQuiz()
    async create(
        @Param('clid') clid: string,
        @Body() createQuizDto: CreateQuizDto
    ) {
        return this.quizzesService.create(clid, createQuizDto);
    }

    @Put('class/:clid/:qid')
    @Roles('Admin', 'Lecturer')
    @UseGuards(InChargeGuard)
    @SwaggerUpdateQuiz()
    async update(
        @Param('clid') clid: string,
        @Param('qid') qid: string,
        @Body() updateQuizDto: UpdateQuizDto
    ) {
        return this.quizzesService.update(qid, updateQuizDto);
    }

    @Delete(':id')
    @Roles('Admin')
    @SwaggerDeleteQuiz()
    async delete(@Param('id') id: string) {
        await this.quizzesService.delete(id);
        return { message: `Quiz with ID ${id} deleted successfully` };
    }
}
