import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchContextDto {
  @ApiProperty({
    description: 'The view/role to switch to',
    enum: ['faculty_admin', 'professor', 'student'],
    example: 'professor',
  })
  @IsString()
  @IsIn(['faculty_admin', 'professor', 'student'])
  activeView!: string;

  @ApiProperty({
    description: 'Faculty ID to scope the context to (required)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  facultyId!: string;
}

export class SwitchContextResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 900, description: 'Access token expiry in seconds' })
  expiresIn!: number;

  @ApiProperty({ description: 'The active view set in the token' })
  activeView!: string;

  @ApiProperty({ description: 'The faculty ID set in the token' })
  facultyId!: string;
}
