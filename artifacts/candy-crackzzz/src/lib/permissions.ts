import type { AdminRole, AdminUser } from '../types';
import type { PublicAdminUser } from './api';

export type Permission =
  | 'manageAdmins'
  | 'manageSiteSettings'
  | 'manageSystemSettings'
  | 'manageProducts'
  | 'viewProducts'
  | 'manageMerch'
  | 'viewMerch'
  | 'manageOrders'
  | 'viewOrders'
  | 'manageMessages'
  | 'viewMessages'
  | 'manageRewards'
  | 'viewRewards'
  | 'manageCampaigns'
  | 'viewCampaigns'
  | 'managePayments'
  | 'manageBranding'
  | 'viewAnalytics'
  | 'manageAnalytics'
  | 'manageNotifications'
  | 'managePushNotifications'
  | 'manageBackups'
  | 'viewOnly';

export const ASSIGNABLE_ROLES: Exclude<AdminRole, 'employee'>[] = [
  'owner',
  'site_admin',
  'system_admin',
  'campaign_admin',
  'staff',
  'delivery_driver',
  'viewer',
];

export const roleLabels: Record<AdminRole, string> = {
  owner: 'Builder',
  site_admin: 'Site Admin',
  system_admin: 'System Admin',
  campaign_admin: 'Campaign Admin',
  staff: 'Staff',
  delivery_driver: 'Delivery Driver',
  viewer: 'Viewer',
  employee: 'Staff (legacy)',
};

export const roleDescriptions: Record<AdminRole, string> = {
  owner:
    'Full access (the builder/owner of the site). Manages the team, all settings, products, orders, campaigns, payments, and system configuration.',
  site_admin:
    'Runs the storefront day-to-day: products, merch, orders, messages, campaigns, payments, branding, and site settings.',
  system_admin:
    'Handles platform configuration: notifications, push setup, analytics depth, and backup-style system tasks.',
  campaign_admin:
    'Builds and tracks marketing: campaigns and the rewards program. Read-only on orders, messages, and analytics.',
  staff: 'Front-line crew: handles orders and customer messages.',
  delivery_driver:
    'On-the-road crew: views delivery orders and updates delivery status (out for delivery, delivered, issue). Cannot edit products, settings, or other customers.',
  viewer: 'Read-only access to dashboard, orders, messages, products, merch, campaigns, rewards, and analytics.',
  employee: 'Legacy staff role. Treated the same as Staff.',
};

const ROLE_PERMISSIONS: Record<Exclude<AdminRole, 'employee'>, Permission[]> = {
  owner: [
    'manageAdmins',
    'manageSiteSettings',
    'manageSystemSettings',
    'manageProducts', 'viewProducts',
    'manageMerch', 'viewMerch',
    'manageOrders', 'viewOrders',
    'manageMessages', 'viewMessages',
    'manageRewards', 'viewRewards',
    'manageCampaigns', 'viewCampaigns',
    'managePayments',
    'manageBranding',
    'viewAnalytics', 'manageAnalytics',
    'manageNotifications',
    'managePushNotifications',
    'manageBackups',
  ],
  site_admin: [
    'manageSiteSettings',
    'manageProducts', 'viewProducts',
    'manageMerch', 'viewMerch',
    'manageOrders', 'viewOrders',
    'manageMessages', 'viewMessages',
    'manageRewards', 'viewRewards',
    'manageCampaigns', 'viewCampaigns',
    'managePayments',
    'manageBranding',
    'viewAnalytics',
    'manageNotifications',
  ],
  system_admin: [
    'manageSystemSettings',
    'manageNotifications',
    'managePushNotifications',
    'viewAnalytics', 'manageAnalytics',
    'manageBackups',
  ],
  campaign_admin: [
    'manageCampaigns', 'viewCampaigns',
    'manageRewards', 'viewRewards',
    'viewMessages',
    'viewOrders',
    'viewAnalytics',
  ],
  staff: [
    'manageOrders', 'viewOrders',
    'manageMessages', 'viewMessages',
  ],
  delivery_driver: [
    'manageOrders', 'viewOrders',
  ],
  viewer: [
    'viewProducts',
    'viewMerch',
    'viewOrders',
    'viewMessages',
    'viewCampaigns',
    'viewRewards',
    'viewAnalytics',
    'viewOnly',
  ],
};

export function normalizeRole(role: AdminRole): Exclude<AdminRole, 'employee'> {
  return role === 'employee' ? 'staff' : role;
}

export const rolePermissions: Record<AdminRole, Permission[]> = {
  owner: ROLE_PERMISSIONS.owner,
  site_admin: ROLE_PERMISSIONS.site_admin,
  system_admin: ROLE_PERMISSIONS.system_admin,
  campaign_admin: ROLE_PERMISSIONS.campaign_admin,
  staff: ROLE_PERMISSIONS.staff,
  delivery_driver: ROLE_PERMISSIONS.delivery_driver,
  viewer: ROLE_PERMISSIONS.viewer,
  employee: ROLE_PERMISSIONS.staff,
};

export function roleHasPermission(role: AdminRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function userHasPermission(
  user: PublicAdminUser | AdminUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.status !== 'active') return false;
  return roleHasPermission(user.role, permission);
}

export function userHasAnyPermission(
  user: PublicAdminUser | AdminUser | null | undefined,
  permissions: Permission[],
): boolean {
  if (!user || permissions.length === 0) return false;
  return permissions.some((p) => userHasPermission(user, p));
}

export function isOwnerRole(role: AdminRole): boolean {
  return role === 'owner';
}
