// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

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
      <div className="flex justify-end pt-60">
        <ThinkingControl
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
        />
      </div>
      {params.has("receipt") ? <CostReceiptDetails custom={{ costReceipts: [{ provider: "openrouter", attemptId: "attempt", generationId: "gen-example", requestedModel: "xiaomi/mimo-v2.6-pro", servedModel: "xiaomi/mimo-v2.6-pro", cost: 0.000021, usage: { prompt_tokens: 12, completion_tokens: 5, cost_details: { upstream_inference_cost: 0.0001 } } }] }} /> : null}
      <output aria-label="Selected effort">{effort}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Probe />);
