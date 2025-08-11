import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { GroupedModel } from '../../../core/providers/index.js';

interface ModelSelectorProps {
  onSubmit: (model: string) => void;
  onCancel: () => void;
  currentModel?: string;
  availableModels: GroupedModel[];
}

interface FlattenedModel {
  providerId: string;
  providerName: string;
  model: {
    id: string;
    name: string;
    description?: string;
    context_window?: number;
    default_max_tokens?: number;
  };
  displayName: string;
  isGroupHeader?: boolean;
  groupName?: string;
}

export default function ModelSelector({ onSubmit, onCancel, currentModel, availableModels }: ModelSelectorProps) {
  // Group models by provider and create flattened list for display
  const flattenedModels = useMemo(() => {
    const grouped = new Map<string, GroupedModel[]>();
    
    // Group models by provider
    availableModels.forEach(model => {
      if (!grouped.has(model.providerId)) {
        grouped.set(model.providerId, []);
      }
      grouped.get(model.providerId)!.push(model);
    });

    const result: FlattenedModel[] = [];
    
    // Flatten with group headers
    for (const [providerId, models] of grouped.entries()) {
      if (models.length === 0) continue;
      
      // Add provider group header
      const providerName = models[0].providerName;
      result.push({
        ...models[0], // Use first model as base
        displayName: `── ${providerName} ──`,
        isGroupHeader: true,
        groupName: providerName
      });
      
      // Add models in this group
      models.forEach(model => {
        result.push({
          ...model,
          displayName: model.model.name || model.model.id
        });
      });
    }
    
    return result;
  }, [availableModels]);

  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Find current model in flattened list
    const currentIndex = flattenedModels.findIndex(
      item => !item.isGroupHeader && item.model.id === currentModel
    );
    return currentIndex >= 0 ? currentIndex : (flattenedModels.length > 0 && flattenedModels[0].isGroupHeader ? 1 : 0);
  });

  useInput((input, key) => {
    if (key.return) {
      const selectedItem = flattenedModels[selectedIndex];
      if (selectedItem && !selectedItem.isGroupHeader) {
        onSubmit(selectedItem.model.id);
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      let newIndex = selectedIndex - 1;
      // Skip group headers
      while (newIndex >= 0 && flattenedModels[newIndex]?.isGroupHeader) {
        newIndex--;
      }
      if (newIndex >= 0) {
        setSelectedIndex(newIndex);
      }
      return;
    }

    if (key.downArrow) {
      let newIndex = selectedIndex + 1;
      // Skip group headers
      while (newIndex < flattenedModels.length && flattenedModels[newIndex]?.isGroupHeader) {
        newIndex++;
      }
      if (newIndex < flattenedModels.length) {
        setSelectedIndex(newIndex);
      }
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }
  });

  if (flattenedModels.length === 0) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>Select Model</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="red">No models available. Please check your provider configurations.</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            Press ESC to cancel.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Select Model</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          Choose a model for your conversation. The chat will be cleared when you switch models.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          Models are grouped by provider. Use ↑/↓ arrows to navigate, Enter to select, ESC to cancel.
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {flattenedModels.map((item, index) => (
          <Box key={`${item.providerId}-${item.model.id}-${index}`} marginBottom={0}>
            {item.isGroupHeader ? (
              <Box marginTop={index > 0 ? 1 : 0}>
                <Text color="yellow" bold dimColor>
                  {item.displayName}
                </Text>
              </Box>
            ) : (
              <Box marginLeft={2}>
                <Text 
                  color={index === selectedIndex ? 'black' : 'white'}
                  backgroundColor={index === selectedIndex ? 'cyan' : undefined}
                  bold={index === selectedIndex}
                >
                  {index === selectedIndex ? <Text bold>{">"}</Text> : "  "} {""}
                  {item.displayName}
                  {item.model.id === currentModel ? ' (current)' : ''}
                </Text>
                {index === selectedIndex && item.model.description && (
                  <Box marginLeft={4} marginTop={0}>
                    <Text color="gray" dimColor>
                      {item.model.description}
                    </Text>
                  </Box>
                )}
                {index === selectedIndex && item.model.context_window && (
                  <Box marginLeft={4} marginTop={0}>
                    <Text color="gray" dimColor>
                      Context: {item.model.context_window.toLocaleString()} tokens
                      {item.model.default_max_tokens ? `, Max output: ${item.model.default_max_tokens.toLocaleString()}` : ''}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}