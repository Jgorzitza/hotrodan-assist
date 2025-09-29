import { 
  Card, 
  BlockStack, 
  Text, 
  Button, 
  InlineStack, 
  Modal, 
  TextField, 
  Select,
  Badge,
  InlineGrid,
  ButtonGroup,
  Popover,
  ActionList
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { 
  getDefaultPresets, 
  getSavedPresets, 
  createPreset, 
  savePreset, 
  deletePreset, 
  loadPreset,
  getAllPresets,
  exportPreset,
  importPreset,
  type DashboardPreset 
} from "~/lib/dashboard-presets";

type DashboardPresetManagerProps = {
  currentLayout: any; // Current dashboard layout
  onPresetLoad: (preset: DashboardPreset) => void;
  onPresetSave: (preset: DashboardPreset) => void;
};

export function DashboardPresetManager({ 
  currentLayout, 
  onPresetLoad, 
  onPresetSave 
}: DashboardPresetManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [importJson, setImportJson] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const allPresets = getAllPresets();
  const defaultPresets = getDefaultPresets();
  const savedPresets = getSavedPresets();

  const handleLoadPreset = useCallback((preset: DashboardPreset) => {
    onPresetLoad(preset);
    setIsModalOpen(false);
  }, [onPresetLoad]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    
    const newPreset = createPreset(presetName, presetDescription, currentLayout.widgets || []);
    savePreset(newPreset);
    onPresetSave(newPreset);
    
    setPresetName("");
    setPresetDescription("");
    setIsSaveModalOpen(false);
  }, [presetName, presetDescription, currentLayout, onPresetSave]);

  const handleDeletePreset = useCallback((preset: DashboardPreset) => {
    if (preset.isDefault) return; // Can't delete default presets
    deletePreset(preset.id);
    setIsModalOpen(false);
  }, []);

  const handleExportPreset = useCallback((preset: DashboardPreset) => {
    const json = exportPreset(preset);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleImportPreset = useCallback(() => {
    if (!importJson.trim()) return;
    
    const preset = importPreset(importJson);
    if (preset) {
      savePreset(preset);
      onPresetSave(preset);
      setImportJson("");
      setIsImportModalOpen(false);
    }
  }, [importJson, onPresetSave]);

  const presetActions = [
    {
      content: "Load",
      onAction: () => selectedPreset && handleLoadPreset(selectedPreset),
    },
    {
      content: "Export",
      onAction: () => selectedPreset && handleExportPreset(selectedPreset),
    },
    ...(selectedPreset && !selectedPreset.isDefault ? [{
      content: "Delete",
      destructive: true,
      onAction: () => selectedPreset && handleDeletePreset(selectedPreset),
    }] : []),
  ];

  return (
    <>
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Dashboard Presets
            </Text>
            <ButtonGroup>
              <Button onClick={() => setIsModalOpen(true)}>
                Load Preset
              </Button>
              <Button onClick={() => setIsSaveModalOpen(true)}>
                Save Current View
              </Button>
              <Popover
                active={isPopoverOpen}
                activator={
                  <Button onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
                    More Actions
                  </Button>
                }
                onClose={() => setIsPopoverOpen(false)}
              >
                <ActionList
                  items={[
                    {
                      content: "Import Preset",
                      onAction: () => {
                        setIsImportModalOpen(true);
                        setIsPopoverOpen(false);
                      },
                    },
                  ]}
                />
              </Popover>
            </ButtonGroup>
          </InlineStack>

          <Text as="p" variant="bodySm" tone="subdued">
            Save and load different dashboard configurations
          </Text>

          <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="300">
            {allPresets.map((preset) => (
              <Card key={preset.id} sectioned>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h4" variant="headingSm">
                      {preset.name}
                    </Text>
                    {preset.isDefault && (
                      <Badge tone="info">Default</Badge>
                    )}
                  </InlineStack>
                  
                  {preset.description && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      {preset.description}
                    </Text>
                  )}
                  
                  <Text as="p" variant="bodySm">
                    {preset.widgets.length} widgets
                  </Text>
                  
                  <ButtonGroup>
                    <Button 
                      size="micro" 
                      onClick={() => handleLoadPreset(preset)}
                    >
                      Load
                    </Button>
                    <Button 
                      size="micro" 
                      onClick={() => {
                        setSelectedPreset(preset);
                        setIsPopoverOpen(true);
                      }}
                    >
                      Actions
                    </Button>
                  </ButtonGroup>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* Load Preset Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Load Dashboard Preset"
        primaryAction={{
          content: "Load",
          onAction: () => selectedPreset && handleLoadPreset(selectedPreset),
          disabled: !selectedPreset,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Select
              label="Select Preset"
              options={[
                { label: "Choose a preset...", value: "" },
                ...allPresets.map(preset => ({
                  label: preset.name,
                  value: preset.id,
                })),
              ]}
              value={selectedPreset?.id || ""}
              onChange={(value) => {
                const preset = allPresets.find(p => p.id === value);
                setSelectedPreset(preset || null);
              }}
            />
            
            {selectedPreset && (
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  {selectedPreset.name}
                </Text>
                {selectedPreset.description && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    {selectedPreset.description}
                  </Text>
                )}
                <Text as="p" variant="bodySm">
                  {selectedPreset.widgets.length} widgets will be loaded
                </Text>
              </BlockStack>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Save Preset Modal */}
      <Modal
        open={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Dashboard Preset"
        primaryAction={{
          content: "Save",
          onAction: handleSavePreset,
          disabled: !presetName.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsSaveModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <TextField
              label="Preset Name"
              value={presetName}
              onChange={setPresetName}
              placeholder="Enter preset name"
            />
            <TextField
              label="Description"
              value={presetDescription}
              onChange={setPresetDescription}
              placeholder="Enter description (optional)"
              multiline={2}
            />
            <Text as="p" variant="bodySm" tone="subdued">
              Current layout will be saved with {currentLayout.widgets?.length || 0} widgets
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Import Preset Modal */}
      <Modal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Dashboard Preset"
        primaryAction={{
          content: "Import",
          onAction: handleImportPreset,
          disabled: !importJson.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsImportModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <TextField
              label="Preset JSON"
              value={importJson}
              onChange={setImportJson}
              placeholder="Paste preset JSON here"
              multiline={6}
            />
            <Text as="p" variant="bodySm" tone="subdued">
              Paste the exported preset JSON to import it
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}
