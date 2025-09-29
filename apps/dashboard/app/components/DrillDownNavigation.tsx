import { Button, InlineStack, Text, Badge } from "@shopify/polaris";
import { useDrillDown } from "~/lib/dashboard-context";

export function DrillDownNavigation() {
  const { currentDrillDown, drillUp } = useDrillDown();

  if (!currentDrillDown) {
    return null;
  }

  return (
    <InlineStack gap="200" blockAlign="center">
      <Text as="span" variant="bodySm" tone="subdued">
        Drilling down from:
      </Text>
      <Badge tone="info">{currentDrillDown.source}</Badge>
      <Text as="span" variant="bodySm" tone="subdued">
        to:
      </Text>
      <Badge tone="success">{currentDrillDown.target}</Badge>
      <Button size="micro" onClick={drillUp}>
        Back
      </Button>
    </InlineStack>
  );
}

export function DrillDownButton({ 
  source, 
  target, 
  data, 
  children 
}: { 
  source: string; 
  target: string; 
  data: Record<string, unknown>; 
  children: React.ReactNode; 
}) {
  const { drillDown } = useDrillDown();

  return (
    <Button
      onClick={() => drillDown(source, target, data)}
      variant="plain"
    >
      {children}
    </Button>
  );
}
