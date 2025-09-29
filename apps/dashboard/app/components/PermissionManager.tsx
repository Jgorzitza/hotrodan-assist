import { 
  Card, 
  BlockStack, 
  Text, 
  Button, 
  InlineStack, 
  Select,
  Badge,
  ButtonGroup,
  Banner,
  InlineGrid,
  List
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { 
  getUserPermissions,
  canUserAccessWidget,
  getVisibleWidgets,
  hasPermission,
  hasRole,
  getRoleDisplayName,
  getRoleDescription,
  createMockUser,
  type UserRole,
  type UserPermissions,
  type WidgetVisibilityRule
} from "~/lib/permissions";

type PermissionManagerProps = {
  widgets: Array<{ id: string; [key: string]: any }>;
  onRoleChange?: (role: UserRole) => void;
  currentRole?: UserRole;
};

export function PermissionManager({ 
  widgets, 
  onRoleChange,
  currentRole = "viewer"
}: PermissionManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(
    createMockUser(currentRole)
  );

  const handleRoleChange = useCallback((role: UserRole) => {
    setSelectedRole(role);
    const newPermissions = createMockUser(role);
    setUserPermissions(newPermissions);
    onRoleChange?.(role);
  }, [onRoleChange]);

  const { visible, hidden } = getVisibleWidgets(widgets, userPermissions);
  const visibilityRules = widgets.map(widget => 
    canUserAccessWidget(widget.id, userPermissions)
  );

  const roleOptions = [
    { label: "Administrator", value: "admin" },
    { label: "Manager", value: "manager" },
    { label: "Analyst", value: "analyst" },
    { label: "Viewer", value: "viewer" },
    { label: "Guest", value: "guest" },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            Role-Based Access Control
          </Text>
          <Badge tone="info">
            {getRoleDisplayName(selectedRole)}
          </Badge>
        </InlineStack>

        <Text as="p" variant="bodySm" tone="subdued">
          {getRoleDescription(selectedRole)}
        </Text>

        <Select
          label="Current Role"
          options={roleOptions}
          value={selectedRole}
          onChange={(value) => handleRoleChange(value as UserRole)}
        />

        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
          <Card sectioned>
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm">
                Visible Widgets ({visible.length})
              </Text>
              <List type="bullet">
                {visible.map(widget => (
                  <List.Item key={widget.id}>
                    {widget.id}
                  </List.Item>
                ))}
              </List>
            </BlockStack>
          </Card>

          <Card sectioned>
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm">
                Hidden Widgets ({hidden.length})
              </Text>
              {hidden.length > 0 ? (
                <List type="bullet">
                  {hidden.map(widget => (
                    <List.Item key={widget.id}>
                      {widget.id} - {widget.reason}
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text as="p" variant="bodySm" tone="subdued">
                  All widgets are visible
                </Text>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>

        <Card sectioned>
          <BlockStack gap="200">
            <Text as="h4" variant="headingSm">
              Permissions
            </Text>
            <InlineStack gap="200" wrap={false}>
              {userPermissions.permissions.map(permission => (
                <Badge key={permission} tone="success">
                  {permission}
                </Badge>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>

        <Card sectioned>
          <BlockStack gap="200">
            <Text as="h4" variant="headingSm">
              Widget Access Details
            </Text>
            <List type="bullet">
              {visibilityRules.map(rule => (
                <List.Item key={rule.widgetId}>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodySm">
                      {rule.widgetId}
                    </Text>
                    <Badge tone={rule.isVisible ? "success" : "critical"}>
                      {rule.isVisible ? "Visible" : "Hidden"}
                    </Badge>
                    {rule.reason && (
                      <Text as="span" variant="bodySm" tone="subdued">
                        - {rule.reason}
                      </Text>
                    )}
                  </InlineStack>
                </List.Item>
              ))}
            </List>
          </BlockStack>
        </Card>
      </BlockStack>
    </Card>
  );
}

export function PermissionGuard({ 
  widgetId, 
  userPermissions, 
  children,
  fallback 
}: { 
  widgetId: string; 
  userPermissions: UserPermissions; 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const visibilityRule = canUserAccessWidget(widgetId, userPermissions);
  
  if (!visibilityRule.isVisible) {
    return fallback || (
      <Card>
        <Banner tone="warning">
          <Text as="p" variant="bodySm">
            You don't have permission to view this widget. 
            {visibilityRule.reason && ` Reason: ${visibilityRule.reason}`}
          </Text>
        </Banner>
      </Card>
    );
  }
  
  return <>{children}</>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  const getTone = (role: UserRole) => {
    switch (role) {
      case "admin": return "critical";
      case "manager": return "warning";
      case "analyst": return "info";
      case "viewer": return "success";
      case "guest": return "subdued";
      default: return "info";
    }
  };

  return (
    <Badge tone={getTone(role)}>
      {getRoleDisplayName(role)}
    </Badge>
  );
}
