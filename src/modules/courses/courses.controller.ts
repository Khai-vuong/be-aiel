import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './courses.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JsonParseInterceptor } from '../../common/interceptors/json-parse.interceptor';
import {
    SwaggerGetAllCourses,
    SwaggerGetCourse,
    SwaggerCreateCourse,
    SwaggerUpdateCourse,
    SwaggerDeleteCourse,
    SwaggerGetCoursesByLecturer,
    SwaggerGetEnrolledStudents
} from './courses.swagger';

@ApiTags('courses')
@UseGuards(JwtGuard, RolesGuard)
@Controller('courses')
export class CoursesController {

    constructor(private readonly coursesService: CoursesService) { }

    @Get()
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetAllCourses()
    async findAll() {
        return this.coursesService.findAll();
    }

    @Get(':id')
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetCourse()
    async findOne(@Param('id') id: string) {
        return this.coursesService.findOne(id);
    }

    @Post()
    @Roles('Admin', 'Lecturer')
    @SwaggerCreateCourse()
    async create(@Body() createCourseDto: CreateCourseDto) {
        return this.coursesService.create(createCourseDto);
    }

    @Put(':id')
    @Roles('Admin', 'Lecturer')
    @SwaggerUpdateCourse()
    async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
        return this.coursesService.update(id, updateCourseDto);
    }

    @Delete(':id')
    @Roles('Admin')
    @SwaggerDeleteCourse()
    async delete(@Param('id') id: string) {
        await this.coursesService.delete(id);
        return { message: 'Course deleted successfully' };
    }

}