# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""Exercise the real Fast action and shared control with deterministic connection/catalog state."""

import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out = Path("logs/pr-fast")
out.mkdir(parents = True, exist_ok = True)
base = "http://127.0.0.1:5418/smoke-thinking-controls.html?fast=1"
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    for theme in ("light", "dark"):
        for width in (960, 375):
            page.set_viewport_size({"width": width, "height": 850})
            page.goto(f"{base}&theme={theme}")
            page.get_by_role("button", name = "Thinking", exact = False).click()
            panel = page.get_by_role("dialog", name = "Thinking settings")
            fast = panel.get_by_role("switch", name = "Fast mode")
            expect(fast).not_to_be_checked()
            expect(panel.get_by_text(re.compile(r"4.35.*published rates"))).to_be_visible()
            fast.click()
            expect(fast).to_be_checked()
            expect(page.get_by_label("Selected model")).to_contain_text("mimo-v2.6-pro-ultraspeed")
            expect(panel.get_by_text("This model supports High only.")).to_be_visible()
            expect(panel.get_by_role("slider")).to_have_count(0)
            expect(panel.get_by_text("$4.35", exact = True)).to_be_visible()
            page.wait_for_timeout(200)
            page.screenshot(path = str(out / f"fast-{theme}-{width}.png"))
            fast.click()
            expect(fast).not_to_be_checked()
            expect(panel.get_by_role("slider")).to_have_count(1)
            page.keyboard.press("Escape")
            expect(page.get_by_role("button", name = "Thinking", exact = False)).to_be_focused()
    for query, explanation in (
        ("gated=1", "Enable xiaomi/mimo-v2.6-pro-ultraspeed in connection settings"),
        ("unavailable=1", "Companion model is no longer available"),
        ("busy=1", "Available after generation finishes."),
    ):
        page.goto(f"{base}&{query}")
        page.get_by_role("button", name = "Thinking", exact = False).click()
        expect(page.get_by_role("switch", name = "Fast mode")).to_be_disabled()
        expect(page.get_by_text(explanation, exact = False)).to_be_visible()
    page.goto(f"{base}&direct=1")
    page.get_by_role("button", name = "Thinking", exact = False).click()
    expect(page.get_by_role("switch", name = "Fast mode")).to_be_checked()
    page.goto(f"{base}&low=1")
    page.get_by_role("button", name = "Thinking", exact = False).click()
    page.get_by_role("switch", name = "Fast mode").click()
    expect(page.get_by_text("This model supports High only.")).to_be_visible()
    page.goto(f"{base}&tier=1")
    page.get_by_role("button", name = "Thinking", exact = False).click()
    fast = page.get_by_role("switch", name = "Fast mode")
    fast.click()
    expect(fast).to_be_checked()
    expect(page.get_by_label("Selected model")).to_contain_text("anthropic%2Fclaude-opus-5")
    expect(page.get_by_text("Published Fast rates", exact = False)).to_be_visible()
    expect(page.get_by_text("$10", exact = True)).to_be_visible()
    page.wait_for_timeout(200)
    page.screenshot(path = str(out / "native-fast-tier.png"))
    page.goto("http://127.0.0.1:5418/smoke-thinking-controls.html?pair-settings=1")
    page.get_by_label("Standard model ID", exact = True).fill("vendor/standard")
    page.get_by_label("Fast companion model ID", exact = True).fill("vendor/fast")
    page.get_by_role("button", name = "Add Fast pair", exact = True).click()
    expect(page.get_by_role("button", name = "Remove Fast pair for vendor/standard")).to_be_visible()
    page.reload()
    expect(page.get_by_role("button", name = "Remove Fast pair for vendor/standard")).to_be_visible()
    page.screenshot(path = str(out / "user-fast-pairs.png"))
    page.get_by_role("button", name = "Remove Fast pair for vendor/standard").click()
    expect(page.get_by_role("button", name = "Remove Fast pair for vendor/standard")).to_have_count(0)
    assert not errors, errors
    browser.close()
print(
    "PASS: Fast pair switching, exact checkpoint, rates, fixed effort, gating, busy guard, direct selection, keyboard focus and 4 visual variants"
)
