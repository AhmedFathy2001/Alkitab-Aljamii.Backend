import { Module } from '@nestjs/common';
import { FacultyController } from './controllers/faculty.controller.js';
import { FacultyService } from './services/faculty.service.js';

@Module({
  controllers: [FacultyController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultiesModule {}
