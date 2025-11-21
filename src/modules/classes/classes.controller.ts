import { Controller, Get, Put, Delete, Param, Body, Request, UseGuards, UsePipes, ValidationPipe, UseInterceptors } from '@nestjs/common';
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
import { JsonParseInterceptor } from 'src/common/interceptors/json-parse.interceptor';

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
    @UseInterceptors(JsonParseInterceptor)

    @SwaggerGetAllClasses()
    async findAll() {
        return this.classesService.findAll();
    }

    @Get('me')
    @UseInterceptors(JsonParseInterceptor)
    @Roles('Student', 'Lecturer')
    async findMyClasses(@Request() req) {
        return this.classesService.findClassesByUserId(req.user.uid);
    }


    @Get(':id')
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetClass()
    async findOne(@Param('id') id: string) {
        return this.classesService.findOne(id);
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
