import { 
    Body, 
    Controller, 
    Get, 
    Post,
    Put, 
    Param, 
    Request, 
    Delete, 
    UseInterceptors, 
    UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { LoginDto, RegisterDto, UpdateDto } from './users.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { JsonParseInterceptor } from '../../common/interceptors/json-parse.interceptor';
import { 
    SwaggerLogin,
    SwaggerGetProfile,
    SwaggerRegister,
    SwaggerUpdateUser,
    SwaggerDeleteUser,
    SwaggerGetAllUsers
} from './users.swagger';

@ApiTags('users')
@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles('Admin')
    @SwaggerGetAllUsers()
    async findAll() {
        return this.usersService.findAll();
    }

    @Post("auth/login")
    @Public()
    @SwaggerLogin()
    async login(@Body() loginDto: LoginDto, @Request() req) {
        return this.usersService.login(loginDto);
    }

    @Get("profile")
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerGetProfile()
    async getProfile(@Request() req) {
        return this.usersService.findUserById(req.user.uid);
    }

    @Post("auth/register")
    @UseInterceptors(JsonParseInterceptor)
    @Public()
    @SwaggerRegister()
    async register(@Body() registerDto: RegisterDto) {
        return this.usersService.register(registerDto);
    }

    @Put("update/:id")
    @UseInterceptors(JsonParseInterceptor)
    @SwaggerUpdateUser()
    async update(@Param("id") id: string, @Body() updateDto: UpdateDto, @Request() req) {
        return (id) 
            ? this.usersService.update(id, updateDto) 
            : this.usersService.update(req.user.uid, updateDto);
    }

    @Delete("delete/:id")
    @Roles('Admin')
    @SwaggerDeleteUser()
    async delete(@Param("id") id: string) {
        return this.usersService.delete(id);
    }

}
