import { Controller, Post } from '@nestjs/common';
import { TestService } from './test.service';


interface UpdateDto {
    status?: string;
    hashed_password?: string;
}
@Controller('test')
export class TestController {

    constructor(private readonly testService: TestService) {}

    @Post('update')
    async testUpdate() {
        return this.testService.testUpdate({status: "Inactive"} as UpdateDto);
    }
}
