import { 
    Controller, 
    Get, 
    Put, 
    Delete,
    Post, 
    Param, 
    Body, 
    Request, 
    UseGuards, 
    UsePipes, 
    ValidationPipe, 
    UseInterceptors, 
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags} from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { InChargeGuard } from 'src/common/guards/in-charge.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import {
    SwaggerGetAllClasses,
    SwaggerGetMyClasses,
    SwaggerGetClass,
    SwaggerUpdateClass,
    SwaggerDeleteClass,
    SwaggerProcessEnrollments
} from './classes.swagger';
import { JsonParseInterceptor } from 'src/common/interceptors/json-parse.interceptor';
import { FileValidationPipe } from 'src/common/pipes/file-validation.pipe';
import { ClassCreateDto } from './classes.dto';
import type { Response } from 'express';


@ApiTags('classes')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(new ValidationPipe({ 
    whitelist: true, 
    // forbidNonWhitelisted: true, 
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
    @SwaggerGetMyClasses()
    async findMyClasses(@Request() req) {
        return this.classesService.findClassesByUserId(req.user.uid);
    }


    @Get(':id')
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetClass()
    async findOne(@Param('id') id: string) {
        return this.classesService.findOne(id);
    }

    @Roles('Admin')
    @Post('createFromEnrollments')
    @SwaggerProcessEnrollments()
    async processPendingEnrollments(@Body() dto: ClassCreateDto) {
        const maxStudentsPerClass = dto.maxStudentsPerClass || 5;
        return this.classesService.createClassesFromEnrollments(maxStudentsPerClass);
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

    
    @Post('upload/:clid')
    @Roles('Lecturer')
    @UseGuards(InChargeGuard)
    @UseInterceptors(FileInterceptor('file'))
    async addResource(
        @Request() req, 
        @Param('clid') clid: string, 
        @UploadedFile(new FileValidationPipe()) file: Express.Multer.File
    ) {
        // Check environment to determine storage method
        const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';

        return isProduction
        ? this.classesService.uploadToS3(req.user.uid, clid, file)
        : this.classesService.uploadToLocal(req.user.uid, clid, file);

    }

    @Get('download/:clid/:fid')
    @Roles('Student', 'Lecturer', 'Admin')
    async downloadFile(
        @Param('clid') clid: string,
        @Param('fid') fid: string,
        @Res() res: Response
    ) {
        // Check environment to determine storage method
        const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';

        if (isProduction) {
            return this.classesService.downloadFromS3(fid);
        }
        else {
            const {file, filePath} = await this.classesService.downloadFromLocal(fid);
            return res.download(filePath, file.original_name!);
        }
    }

}
