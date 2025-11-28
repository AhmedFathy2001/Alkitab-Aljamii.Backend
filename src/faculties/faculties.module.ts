import { Module } from '@nestjs/common';
import { FacultyController } from './controllers/faculty.controller.js';
import { FacultyMembersController } from './controllers/faculty-members.controller.js';
import { FacultyService } from './services/faculty.service.js';
import { FacultyMembersService } from './services/faculty-members.service.js';
import { FacultyAccessService } from './services/faculty-access.service.js';

@Module({
  controllers: [FacultyController, FacultyMembersController],
  providers: [FacultyService, FacultyMembersService, FacultyAccessService],
  exports: [FacultyService, FacultyMembersService],
})
export class FacultiesModule {}
