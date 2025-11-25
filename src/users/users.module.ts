import { Module } from '@nestjs/common';
import { UserService } from './services/user.service.js';
import { UserController } from './controllers/user.controller.js';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
