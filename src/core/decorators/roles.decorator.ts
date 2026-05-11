import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Firebase anonym: kein Firestore-User, aber gültiges ID-Token (App-Mitmach). */
export const ANONYMOUS_FIREBASE_APP_ROLE = 'anonymous_firebase_user';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
