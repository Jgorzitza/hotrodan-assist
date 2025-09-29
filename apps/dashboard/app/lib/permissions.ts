export type UserRole = 
  | "admin" 
  | "manager" 
  | "analyst" 
  | "viewer" 
  | "guest";

export type WidgetPermission = {
  widgetId: string;
  roles: UserRole[];
  requiredPermissions?: string[];
  conditions?: Record<string, unknown>;
};

export type UserPermissions = {
  role: UserRole;
  permissions: string[];
  metadata?: Record<string, unknown>;
};

export type WidgetVisibilityRule = {
  widgetId: string;
  isVisible: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredPermission?: string;
};

// Default widget permissions
const WIDGET_PERMISSIONS: WidgetPermission[] = [
  {
    widgetId: "revenue",
    roles: ["admin", "manager", "analyst", "viewer"],
  },
  {
    widgetId: "aov",
    roles: ["admin", "manager", "analyst", "viewer"],
  },
  {
    widgetId: "conversion",
    roles: ["admin", "manager", "analyst", "viewer"],
  },
  {
    widgetId: "cac",
    roles: ["admin", "manager", "analyst"],
    requiredPermissions: ["view_financial_metrics"],
  },
  {
    widgetId: "ltv",
    roles: ["admin", "manager", "analyst"],
    requiredPermissions: ["view_financial_metrics"],
  },
  {
    widgetId: "cohort-analysis",
    roles: ["admin", "manager", "analyst"],
    requiredPermissions: ["view_analytics"],
  },
  {
    widgetId: "sales-trend",
    roles: ["admin", "manager", "analyst", "viewer"],
  },
  {
    widgetId: "export-manager",
    roles: ["admin", "manager"],
    requiredPermissions: ["export_data"],
  },
  {
    widgetId: "preset-manager",
    roles: ["admin", "manager", "analyst"],
  },
  {
    widgetId: "drill-down",
    roles: ["admin", "manager", "analyst"],
  },
];

// Role hierarchy (higher roles inherit permissions from lower roles)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  viewer: 1,
  analyst: 2,
  manager: 3,
  admin: 4,
};

export function getUserPermissions(role: UserRole): UserPermissions {
  const basePermissions = getBasePermissionsForRole(role);
  
  return {
    role,
    permissions: basePermissions,
    metadata: {
      level: ROLE_HIERARCHY[role],
      inheritedFrom: getInheritedRoles(role),
    },
  };
}

export function canUserAccessWidget(
  widgetId: string, 
  userPermissions: UserPermissions
): WidgetVisibilityRule {
  const widgetPermission = WIDGET_PERMISSIONS.find(p => p.widgetId === widgetId);
  
  if (!widgetPermission) {
    return {
      widgetId,
      isVisible: false,
      reason: "Widget not found in permissions",
    };
  }

  // Check role access
  const hasRoleAccess = widgetPermission.roles.includes(userPermissions.role) ||
    widgetPermission.roles.some(role => 
      ROLE_HIERARCHY[userPermissions.role] >= ROLE_HIERARCHY[role]
    );

  if (!hasRoleAccess) {
    return {
      widgetId,
      isVisible: false,
      reason: "Insufficient role",
      requiredRole: widgetPermission.roles[0],
    };
  }

  // Check required permissions
  if (widgetPermission.requiredPermissions) {
    const hasRequiredPermissions = widgetPermission.requiredPermissions.every(
      permission => userPermissions.permissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      return {
        widgetId,
        isVisible: false,
        reason: "Missing required permissions",
        requiredPermission: widgetPermission.requiredPermissions[0],
      };
    }
  }

  return {
    widgetId,
    isVisible: true,
  };
}

export function filterWidgetsByPermissions(
  widgets: Array<{ id: string; [key: string]: any }>,
  userPermissions: UserPermissions
): Array<{ id: string; [key: string]: any }> {
  return widgets.filter(widget => {
    const visibilityRule = canUserAccessWidget(widget.id, userPermissions);
    return visibilityRule.isVisible;
  });
}

export function getVisibleWidgets(
  allWidgets: Array<{ id: string; [key: string]: any }>,
  userPermissions: UserPermissions
): {
  visible: Array<{ id: string; [key: string]: any }>;
  hidden: Array<{ id: string; [key: string]: any; reason: string }>;
} {
  const visible: Array<{ id: string; [key: string]: any }> = [];
  const hidden: Array<{ id: string; [key: string]: any; reason: string }> = [];

  allWidgets.forEach(widget => {
    const visibilityRule = canUserAccessWidget(widget.id, userPermissions);
    
    if (visibilityRule.isVisible) {
      visible.push(widget);
    } else {
      hidden.push({
        ...widget,
        reason: visibilityRule.reason || "Access denied",
      });
    }
  });

  return { visible, hidden };
}

export function hasPermission(
  userPermissions: UserPermissions,
  permission: string
): boolean {
  return userPermissions.permissions.includes(permission);
}

export function hasRole(
  userPermissions: UserPermissions,
  role: UserRole
): boolean {
  return userPermissions.role === role ||
    ROLE_HIERARCHY[userPermissions.role] >= ROLE_HIERARCHY[role];
}

export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: "Administrator",
    manager: "Manager",
    analyst: "Analyst",
    viewer: "Viewer",
    guest: "Guest",
  };
  return displayNames[role];
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: "Full access to all dashboard features and settings",
    manager: "Access to most features with some administrative capabilities",
    analyst: "Access to analytics and reporting features",
    viewer: "Read-only access to basic dashboard metrics",
    guest: "Limited access to public dashboard information",
  };
  return descriptions[role];
}

function getBasePermissionsForRole(role: UserRole): string[] {
  const basePermissions: Record<UserRole, string[]> = {
    admin: [
      "view_all_metrics",
      "view_financial_metrics",
      "view_analytics",
      "export_data",
      "manage_presets",
      "manage_users",
      "view_sensitive_data",
    ],
    manager: [
      "view_all_metrics",
      "view_financial_metrics",
      "view_analytics",
      "export_data",
      "manage_presets",
    ],
    analyst: [
      "view_all_metrics",
      "view_analytics",
      "manage_presets",
    ],
    viewer: [
      "view_basic_metrics",
    ],
    guest: [
      "view_public_metrics",
    ],
  };
  
  return basePermissions[role] || [];
}

function getInheritedRoles(role: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([roleName]) => roleName as UserRole);
}

export function createMockUser(role: UserRole): UserPermissions {
  return getUserPermissions(role);
}
