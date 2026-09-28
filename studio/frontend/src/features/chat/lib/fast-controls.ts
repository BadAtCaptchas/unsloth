// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { buildExternalModelId } from "../external-providers";
import { providerSupportsFastMode } from "../provider-capabilities";
import { useExternalProvidersStore } from "../stores/external-providers-store";
import { currentThinking, changeThinking } from "./thinking-controls";
import { fastCandidateModels } from "../model-catalog";
import { openRouterFastTier } from "./openrouter-fast-tier";
import { resolveFastPairs, verifiedFastVariant } from "./fast-variants";

export function currentFast() {
  const { state, selection, provider } = currentThinking();
  const variant = verifiedFastVariant(
    provider?.providerType,
    selection?.modelId,
    provider?.models ?? [],
    provider?.availableModels,
    resolveFastPairs(
      fastCandidateModels(),
      provider?.fastPairs,
      provider?.autoDetectFastVariants !== false,
    ),
  );
  const native = providerSupportsFastMode(
    provider?.providerType,
    selection?.modelId,
  );
  const tier =
    provider?.providerType === "openrouter" && selection
      ? openRouterFastTier(selection.modelId)
      : null;
  const busy =
    state.modelLoading || Object.values(state.runningByThreadId).some(Boolean);
  const connected = useExternalProvidersStore.getState().connectionsEnabled;
  return {
    variant: native ? null : variant,
    tier: tier?.supported ? tier : null,
    native,
    busy,
    connected,
    isFast: native ? state.params.fastMode : (variant?.isFast ?? false),
    provider,
    selection,
  };
}

/** Both the header and shortcut use the picker callback, including its capability/default resolution. */
export function toggleFast(selectModel: (checkpoint: string) => void): boolean {
  const fast = currentFast();
  if (fast.busy || !fast.connected) return false;
  const before = currentThinking();
  if (fast.variant && fast.provider) {
    if (fast.variant.reason) return false;
    selectModel(
      buildExternalModelId(fast.provider.id, fast.variant.destination),
    );
    const after = currentThinking();
    // Only preserve a value the actual companion supports. Otherwise keep the selection path's result.
    if (after.selection?.modelId === fast.variant.destination) {
      if (
        (!before.state.reasoningEnabled || before.effort === "none") &&
        after.view.canDisable
      )
        changeThinking(false);
      else if (after.view.levels.includes(before.effort))
        changeThinking(true, before.effort);
    }
    return true;
  }
  if (fast.native) {
    if (fast.tier && !fast.tier.available && !before.state.params.fastMode)
      return false;
    before.state.setParams({
      ...before.state.params,
      fastMode: !before.state.params.fastMode,
    });
    return true;
  }
  return false;
}
