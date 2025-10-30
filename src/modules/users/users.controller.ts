import { Body, Controller, Get, Post, Put, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { type LoginDto, type RegisterDto, type UpdateDto, type AuthorizeDto } from './users.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';

@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles('Admin') // Only Admin can access
    async findAll() {
        return this.usersService.findAll();
    }

    @Post("auth/login")
    @Public()
    async login(@Body() loginDto: LoginDto, @Request() req) {
        return this.usersService.login(loginDto); //Returns JWT token
    }

    @Get("profile")
    async getProfile(@Request() req) {
        console.log("Profile request for user:", req.user);
        return req.user;
    }

    @Post("auth/register")
    @Public()
    async register(@Body() registerDto: RegisterDto) {
        return this.usersService.register(registerDto);
    }

    @Put(":id")
    async update(@Param("id") id: string, @Body() updateDto: UpdateDto) {
        return this.usersService.update(id, updateDto);
    }

    @Put("authorize/:id")
    @Roles('Admin') // Only Admin can authorize users
    async authorize(@Param("id") id: string, @Body() authorizeDto: AuthorizeDto) {
        return this.usersService.authorize(id, authorizeDto);
    }
}
