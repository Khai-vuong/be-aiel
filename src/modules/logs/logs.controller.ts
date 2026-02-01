import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { InChargeGuard } from 'src/common/guards/in-charge.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { LogService } from './logs.service';
import { JsonParseInterceptor } from 'src/common/interceptors/json-parse.interceptor';
import { SwaggerGetClassLogs, SwaggerGetAllSystemLogs } from './logs.swagger';

@ApiTags('logs')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
@Controller('logs')
export class LogsController {
  constructor(private readonly logService: LogService) {}

  @Get('class/:clid')
  @Roles('Lecturer', 'Admin')
  @UseGuards(InChargeGuard)
  @SwaggerGetClassLogs()
  async getClassLogs(
    @Param('clid') classId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
  ) {
    // Ensure limit doesn't exceed 100
    const safeLimit = Math.min(limit, 100);
    
    return this.logService.getLogsByClass(classId, {
      page,
      limit: safeLimit,
      action,
    });
  }

  @Get('admin/all')
  @Roles('Admin')
  @SwaggerGetAllSystemLogs()
  async getAllSystemLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
  ) {
    // Ensure limit doesn't exceed 100
    const safeLimit = Math.min(limit, 100);
    
    return this.logService.getAllSystemLogs({
      page,
      limit: safeLimit,
      action,
      resourceType,
      userId,
    });
  }
}
