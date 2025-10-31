import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from './users.service';
import { Reflector } from '@nestjs/core';

//Payload structure lấy từ userService.login(), coi nó sign cái gì. + iat và exp
interface JwtPayload {
    uid: string;
    username: string;
    role: string
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: true, //To manually check expiration in validate
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    //Automatically called by passport after verifying token signature and expiration.
    async validate(payload: JwtPayload) {
        
        // console.log("JWT payload:", payload);

        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
            throw new ForbiddenException('JWT token has expired');
        }

        //Will be attached to req.user in step 2 (Middleware)
        return {
            uid: payload.uid,
            username: payload.username,
            role: payload.role
        }
    }
}