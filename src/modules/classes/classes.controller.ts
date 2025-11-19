import { Controller, Get, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import {
    SwaggerGetAllClasses,
    SwaggerGetClass,
    SwaggerUpdateClass,
    SwaggerDeleteClass
} from './classes.swagger';

@ApiTags('classes')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true 
}))
@Controller('classes')
export class ClassesController {
    constructor(private readonly classesService: ClassesService) { }

    @Get()
    @SwaggerGetAllClasses()
    async findAll() {
        return this.classesService.findAll();
    }

    @Get(':id')
    @SwaggerGetClass()
    async findOne(@Param('id') id: string) {
        return this.classesService.findOne(id);
    }

    @Get('me')
    @Roles('Student', 'Lecturer')
    async findMyClasses(@Body('userId') userId: string) {
        return this.classesService.findClassesByUserId(userId);
    }

    @Put(':id')
    @Roles('Admin', 'Lecturer')
    @SwaggerUpdateClass()
    async update(
        @Param('id') id: string,
        @Body() updateData: {
            name?: string;
            schedule_json?: string;
            location?: string;
            status?: string;
            lecturer_id?: string;
        }
    ) {
        return this.classesService.update(id, updateData);
    }

    @Delete(':id')
    @Roles('Admin')
    @SwaggerDeleteClass()
    async delete(@Param('id') id: string) {
        await this.classesService.delete(id);
        return { message: `Class with ID ${id} deleted successfully` };
    }
}
