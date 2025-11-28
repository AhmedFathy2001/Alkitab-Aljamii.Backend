import { Module } from '@nestjs/common';
import { UserService } from './services/user.service.js';
import { UserAccessService } from './services/user-access.service.js';
import { UserController } from './controllers/user.controller.js';

@Module({
  controllers: [UserController],
  providers: [UserService, UserAccessService],
  exports: [UserService],
})
export class UsersModule {}
