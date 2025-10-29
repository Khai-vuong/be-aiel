import { Body, Controller, Get, Post, Put, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { type LoginDto, type RegisterDto, type UpdateDto, type AuthorizeDto } from './users.dto';
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll() {
        return this.usersService.findAll();
    }

    @Post("auth/login")
    async login(@Body() loginDto: LoginDto) {
        return this.usersService.login(loginDto);
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
