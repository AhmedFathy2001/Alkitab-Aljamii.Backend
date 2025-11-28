import { Module } from '@nestjs/common';
import { SubjectController } from './controllers/subject.controller.js';
import { SubjectService } from './services/subject.service.js';
import { SubjectAssignmentService } from './services/subject-assignment.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SubjectController],
  providers: [SubjectService, SubjectAssignmentService],
  exports: [SubjectService, SubjectAssignmentService],
})
export class SubjectsModule {}
