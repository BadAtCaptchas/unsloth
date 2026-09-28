// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { setOpenRouterFastTier } from "./src/features/chat/lib/openrouter-fast-tier";
import { FastPairsSettings } from "./src/features/chat/components/fast-pairs-settings";
import type { FastPair } from "./src/features/chat/lib/fast-variants";
import { loadExternalProviders, saveExternalProviders } from "./src/features/chat/external-providers";
import { ChatThinkingControl } from "./src/features/chat/components/chat-thinking-control";
import { FastModelSelectionContext } from "./src/features/chat/lib/fast-selection-context";
import { useChatRuntimeStore } from "./src/features/chat/stores/chat-runtime-store";
import { useExternalProvidersStore } from "./src/features/chat/stores/external-providers-store";
import { buildExternalModelId } from "./src/features/chat/external-providers";
import { ModelPricing } from "./src/features/chat/components/model-pricing";
import { CostReceiptDetails } from "./src/features/chat/components/recorded-cost";
import { setProviderModelCatalog } from "./src/features/chat/model-catalog";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThinkingControl } from "./src/features/chat/components/thinking-control";
import type { ThinkingCapabilities } from "./src/features/chat/lib/thinking-presentation";
import type { ReasoningEffortLevel } from "./src/features/chat/model-catalog";
import "./src/index.css";

setProviderModelCatalog("openrouter", [{ id: "xiaomi/mimo-v2.6-pro", pricing: { rates: { prompt: "0.000001", completion: "0.000002", input_cache_read: "0.0000001" }, overrides: [{ min_prompt_tokens: 200000, prompt: "0.000003" }] } }]);
const smokeParams = new URLSearchParams(location.search);
const standard = smokeParams.has("tier") ? "anthropic/claude-opus-5" : "xiaomi/mimo-v2.6-pro";
const ultraspeed = "xiaomi/mimo-v2.6-pro-ultraspeed";
if (smokeParams.has("fast")) {
  setProviderModelCatalog("openrouter", [
    { id: standard, reasoning: { supported_efforts: ["low", "high"], mandatory: true }, pricing: { rates: { prompt: "0.000001", completion: "0.000002" } } },
    { id: ultraspeed, description: "The fast speed edition, built from the same 1T MiMo-V2.6-Pro checkpoint.", reasoning: { supported_efforts: ["high"], mandatory: true }, pricing: { rates: { prompt: "0.00000435", completion: "0.0000087" } } },
  ]);
  setOpenRouterFastTier(standard, { supported: smokeParams.has("tier"), available: true, endpoints: smokeParams.has("tier") ? [{ tag: "anthropic/fast", pricing: { rates: { prompt: "0.00001", completion: "0.00005" } } }] : [], fetchedAt: Date.now(), source: "https://openrouter.ai/api/v1/models/anthropic/claude-opus-5/endpoints" });
  setOpenRouterFastTier(ultraspeed, { supported: false, available: false, endpoints: [], fetchedAt: Date.now(), source: "https://openrouter.ai" });
  useExternalProvidersStore.setState({ connectionsEnabled: true, providers: [{ id: "smoke", providerType: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", models: smokeParams.has("gated") ? [standard] : [standard, ultraspeed], availableModels: smokeParams.has("unavailable") ? [standard] : [standard, ultraspeed], createdAt: 0, updatedAt: 0 }] });
  useChatRuntimeStore.getState().setCheckpoint(buildExternalModelId("smoke", smokeParams.has("direct") ? ultraspeed : standard), null);
  useChatRuntimeStore.setState({ reasoningEnabled: true, reasoningEffort: smokeParams.has("low") ? "low" : "high", modelLoading: false, runningByThreadId: smokeParams.has("busy") ? { smoke: true } : {} });
}
const base: ThinkingCapabilities = {
  supportsReasoning: true,
  reasoningStyle: "reasoning_effort",
  reasoningAlwaysOn: false,
  supportsReasoningOff: true,
  reasoningEffortLevels: ["low", "medium", "high", "xhigh", "max"],
};
const states: Record<string, ThinkingCapabilities> = {
  adjustable: base,
  fixed: { ...base, reasoningEffortLevels: ["high"] },
  toggle: { ...base, reasoningStyle: "enable_thinking" },
  mandatory: {
    ...base,
    reasoningStyle: "enable_thinking",
    reasoningAlwaysOn: true,
  },
  unknown: {
    ...base,
    reasoningStyle: "enable_thinking",
    reasoningKnown: false,
  },
  unsupported: { ...base, supportsReasoning: false },
};
function Probe() {
  const [pairs, setPairs] = useState<FastPair[]>(loadExternalProviders().find((p) => p.id === "manual-fast-smoke")?.fastPairs ?? []);
  const [autoDetect, setAutoDetect] = useState(true);
  const selectedModel = useChatRuntimeStore((s) => s.params.checkpoint);
  const [effort, setEffort] = useState<ReasoningEffortLevel>("high");
  const [enabled, setEnabled] = useState(true);
  const [preserve, setPreserve] = useState(false);
  const params = new URLSearchParams(location.search);
  document.documentElement.classList.toggle(
    "dark",
    params.get("theme") === "dark",
  );
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <h1 className="mb-4 text-lg">Chat inference controls</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        The shared production control, with deterministic model capabilities.
      </p>
      {params.has("pair-settings") ? <FastPairsSettings models={["vendor/standard", "vendor/fast"]} pairs={pairs} autoDetect={autoDetect} onAutoDetectChange={setAutoDetect} onPairsChange={(next) => {
        setPairs(next);
        saveExternalProviders([{ id: "manual-fast-smoke", name: "OpenRouter", providerType: "openrouter", baseUrl: "https://openrouter.ai/api/v1", models: ["vendor/standard", "vendor/fast"], fastPairs: next, autoDetectFastVariants: autoDetect, createdAt: 0, updatedAt: 0 }]);
      }} /> : null}
      <div className="flex justify-end pt-60">
        {params.has("fast") ? <FastModelSelectionContext.Provider value={(id) => {
          useChatRuntimeStore.getState().setCheckpoint(id, null);
          useChatRuntimeStore.getState().setReasoningEffort("high");
        }}><ChatThinkingControl /></FastModelSelectionContext.Provider> : <ThinkingControl
          footer={params.has("pricing") ? <ModelPricing modelId="xiaomi/mimo-v2.6-pro" /> : undefined}
          caps={states[params.get("state") ?? "adjustable"] ?? base}
          effort={effort}
          enabled={enabled}
          onEnabledChange={setEnabled}
          onEffortChange={(level) => {
            setEffort(level);
            setEnabled(true);
          }}
          onReset={() => {
            setEffort("medium");
            setEnabled(true);
          }}
          preserve={preserve}
          onPreserveChange={params.has("preserve") ? setPreserve : undefined}
        />}
      </div>
      {params.has("receipt") ? <CostReceiptDetails custom={{ costReceipts: [{ provider: "openrouter", attemptId: "attempt", generationId: "gen-example", requestedModel: "xiaomi/mimo-v2.6-pro", servedModel: "xiaomi/mimo-v2.6-pro", cost: 0.000021, usage: { prompt_tokens: 12, completion_tokens: 5, cost_details: { upstream_inference_cost: 0.0001 } } }] }} /> : null}
      {params.has("fast") ? <output className="block break-all text-xs" aria-label="Selected model">{selectedModel}</output> : null}
      <output aria-label="Selected effort">{effort}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Probe />);
