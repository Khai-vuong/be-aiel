import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Request,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CourseCreateDto, CourseUpdateDto, CourseProcessEnrollmentsDto } from './courses.dto';
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
    SwaggerAddLecturer,
    SwaggerRemoveLecturer,
    SwaggerRegisterToCourse,
    SwaggerUnregisterFromCourse,
    SwaggerProcessEnrollments,
    SwaggerGetMyEnrollments,
    SwaggerGetMyCourses,
} from './courses.swagger';

@ApiTags('courses')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true 
}))
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
    async create(@Body() createCourseDto: CourseCreateDto) {
        return this.coursesService.create(createCourseDto);
    }

    @Put(':id')
    @Roles('Admin', 'Lecturer')
    @SwaggerUpdateCourse()
    async update(@Param('id') id: string, @Body() updateCourseDto: CourseUpdateDto) {
        return this.coursesService.update(id, updateCourseDto);
    }

    @Delete(':id')
    @Roles('Admin')
    @SwaggerDeleteCourse()
    async delete(@Param('id') id: string) {
        await this.coursesService.delete(id);
        return { message: 'Course deleted successfully' };
    }

    @Post(':courseId/lecturers/:lecturerId')
    @Roles('Admin')
    @SwaggerAddLecturer()
    async addLecturer(
        @Param('courseId') courseId: string,
        @Param('lecturerId') lecturerId: string
    ) {
        return this.coursesService.addLecturer(courseId, lecturerId);
    }

    @Delete(':courseId/lecturers/:lecturerId')
    @Roles('Admin')
    @SwaggerRemoveLecturer()
    async removeLecturer(
        @Param('courseId') courseId: string,
        @Param('lecturerId') lecturerId: string
    ) {
        return this.coursesService.removeLecturer(courseId, lecturerId);
    }

    @Roles('Student')
    @Post(':id/register')
    @SwaggerRegisterToCourse()
    async registerToCourse(@Request() req, @Param('id') id: string) {
        const userId = req.user.uid;
        const courseId = id;
        return this.coursesService.registerStudentToCourse(userId, courseId);
    }

    @Roles('Student')
    @Post(':id/unregister')
    @SwaggerUnregisterFromCourse()
    async unregisterFromCourse(@Request() req, @Param('id') id: string) {
        const userId = req.user.uid;
        const courseId = id;
        return this.coursesService.unregisterStudentFromCourse(userId, courseId);
    }

    @Roles('Admin')
    @Post('enrollments/process')
    @SwaggerProcessEnrollments()
    async processPendingEnrollments(@Body() dto: CourseProcessEnrollmentsDto) {
        const maxStudentsPerClass = dto.maxStudentsPerClass || 5;
        return this.coursesService.processPendingEnrollments(maxStudentsPerClass);
    }

    @Roles('Student')
    @Get('enrollments/me')
    @SwaggerGetMyEnrollments()
    async findEnrollmentsByUserId(@Request() req) {
        return this.coursesService.findEnrollmentsByUserId(req.user.uid);
    }

    @Roles('Lecturer')
    @Get('incharged/by/me')
    @SwaggerGetMyCourses()
    async findCoursesByUserId(@Request() req) {
        return this.coursesService.findCoursesByUserId(req.user.uid);
    }

}