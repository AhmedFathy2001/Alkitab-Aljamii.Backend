import { ApiProperty } from '@nestjs/swagger';
import { FacultyRole } from '@prisma/client';

export class FacultyRoleDto {
  @ApiProperty()
  facultyId!: string;

  @ApiProperty()
  facultyName!: string;

  @ApiProperty({ enum: FacultyRole })
  role!: FacultyRole;
}

export class UserInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  isSuperAdmin!: boolean;

  @ApiProperty({ type: [FacultyRoleDto] })
  facultyRoles!: FacultyRoleDto[];
}

export class AuthResponseDto {
  @ApiProperty({ type: UserInfoDto })
  user!: UserInfoDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'Access token expiry in seconds' })
  expiresIn!: number;

  @ApiProperty({
    example: 604800,
    description: 'Refresh token expiry in seconds',
  })
  refreshExpiresIn!: number;
}

export class TokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'Access token expiry in seconds' })
  expiresIn!: number;

  @ApiProperty({
    example: 604800,
    description: 'Refresh token expiry in seconds',
  })
  refreshExpiresIn!: number;
}
