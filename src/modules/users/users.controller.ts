import { Body, Controller, Get, Post, Put, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { type LoginDto, type RegisterDto, type UpdateDto, type AuthorizeDto } from './users.dto';
import { AuthGuard } from '@nestjs/passport';
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll() {
        return this.usersService.findAll();
    }

    @Post("auth/login")
    async login(@Body() loginDto: LoginDto, @Request() req) {
        return this.usersService.login(loginDto); //Returns JWT token
    }

    @Get("profile")
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Request() req) {
        console.log("Profile request for user:", req.user);
        return req.user;
    }

    @Post("auth/register")
    async register(@Body() registerDto: RegisterDto) {
        return this.usersService.register(registerDto);
    }

    @Put(":id")
    async update(@Param("id") id: string, @Body() updateDto: UpdateDto) {
        return this.usersService.update(id, updateDto);
    }

    @Put("authorize/:id")
    async authorize(@Param("id") id: string, @Body() authorizeDto: AuthorizeDto) {
        return this.usersService.authorize(id, authorizeDto);
    }
}
