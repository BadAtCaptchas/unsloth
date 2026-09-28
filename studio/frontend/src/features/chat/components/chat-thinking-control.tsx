// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { refreshOpenRouterFastTier } from "../lib/openrouter-fast-tier";
import { useEffect, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { FastControl } from "./fast-control";
import { currentFast } from "../lib/fast-controls";
import { ModelPricing } from "./model-pricing";
import { ThinkingControl } from "./thinking-control";
import {
  currentThinking,
  changeThinking,
  resetThinking,
} from "../lib/thinking-controls";
import { modelCatalogVersion, subscribeModelCatalog } from "../model-catalog";
import { useChatRuntimeStore } from "../stores/chat-runtime-store";
import { useExternalProvidersStore } from "../stores/external-providers-store";

export function ChatThinkingControl({
  side = "top",
}: { side?: "top" | "bottom" }) {
  useChatRuntimeStore(
    useShallow((s) => [
      s.params.checkpoint,
      s.params.fastMode,
      s.runningByThreadId,
      s.modelLoading,
      s.reasoningStyle,
      s.reasoningEffortLevels,
      s.reasoningAlwaysOn,
      s.supportsReasoning,
      s.supportsReasoningOff,
      s.reasoningEffort,
      s.reasoningEnabled,
      s.supportsPreserveThinking,
      s.preserveThinking,
    ]),
  );
  useExternalProvidersStore(
    useShallow((s) => [s.providers, s.connectionsEnabled]),
  );
  useSyncExternalStore(subscribeModelCatalog, modelCatalogVersion);
  const { state, caps, effort, selection, provider } = currentThinking();
  const fast = currentFast();
  const modelId = selection?.modelId;
  useEffect(() => {
    if (provider?.providerType === "openrouter" && modelId)
      void refreshOpenRouterFastTier(modelId);
  }, [provider?.providerType, modelId]);
  const fastPrice =
    fast.isFast && fast.tier ? fast.tier.endpoints[0]?.pricing : undefined;
  return (
    <ThinkingControl
      header={
        fast.variant ||
        fast.native ||
        provider?.providerType === "openrouter" ? (
          <FastControl />
        ) : undefined
      }
      footer={
        provider?.providerType === "openrouter" && selection ? (
          <ModelPricing
            modelId={selection.modelId}
            label={
              fast.isFast && fast.tier ? "Published Fast rates" : undefined
            }
            pricingOverride={
              fast.isFast && fast.tier
                ? fastPrice
                  ? {
                      ...fastPrice,
                      fetchedAt: fast.tier.fetchedAt,
                      cached: fast.tier.cached,
                    }
                  : null
                : undefined
            }
            source={fast.isFast && fast.tier ? fast.tier.source : undefined}
          />
        ) : undefined
      }
      caps={caps}
      effort={effort}
      enabled={state.reasoningEnabled}
      fastEnabled={fast.isFast}
      disabled={!state.params.checkpoint || state.modelLoading}
      side={side}
      onEnabledChange={changeThinking}
      onEffortChange={(level) => changeThinking(true, level)}
      onReset={resetThinking}
      preserve={state.preserveThinking}
      onPreserveChange={
        state.supportsPreserveThinking
          ? (enabled) => {
              state.setPreserveThinking(enabled);
              if (enabled && !selection) changeThinking(true);
            }
          : undefined
      }
    />
  );
}
