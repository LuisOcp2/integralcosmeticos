import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../permissions/permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
