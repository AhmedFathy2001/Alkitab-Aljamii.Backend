import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client/extension';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: pg.Pool;
  userFacultyRole: any;
  user: any;
  faculty: any;
  refreshToken: any;
  userSubjectAssignment: any;
  subject: any;
  content: any;
  contentAccessLog: any;
  contentApproval: any;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this['$connect']();
  }

  async onModuleDestroy(): Promise<void> {
    await this['$disconnect']();
    await this.pool.end();
  }
}
