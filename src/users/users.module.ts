import { Module } from '@nestjs/common';
import { UserService } from './services/user.service.js';
import { UserAccessService } from './services/user-access.service.js';
import { UserController } from './controllers/user.controller.js';
import { PaginationService } from '../common/services/pagination.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService, UserAccessService, PaginationService],
  exports: [UserService],
})
export class UsersModule {}
