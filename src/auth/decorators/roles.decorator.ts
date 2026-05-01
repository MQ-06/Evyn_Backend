import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/enums/role.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// Usage example:
// @Roles(Role.ADMIN)              → only admin
// @Roles(Role.SELLER, Role.ADMIN) → seller OR admin
// no decorator                    → anyone authenticated