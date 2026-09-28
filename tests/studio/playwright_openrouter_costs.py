# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""Visual checks for published prices and recorded charge details using mocked catalog data."""

from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out = Path("logs/pr-costs")
out.mkdir(parents = True, exist_ok = True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    for theme in ("light", "dark"):
        for width in (960, 375):
            page.set_viewport_size({"width": width, "height": 850})
            page.goto(f"http://127.0.0.1:5418/smoke-thinking-controls.html?pricing=1&theme={theme}")
            page.get_by_role("button", name = "Thinking", exact = False).click()
            panel = page.get_by_role("dialog", name = "Thinking settings")
            expect(panel.get_by_text("Published rates", exact = False)).to_be_visible()
            expect(panel.get_by_text("$1", exact = True)).to_be_visible()
            page.wait_for_timeout(200)
            page.screenshot(path = str(out / f"rates-{theme}-{width}.png"))
            panel.locator("summary").click()
            expect(panel.get_by_text("min prompt tokens: 200000")).to_be_visible()
            expect(panel.get_by_text("Source: OpenRouter catalog")).to_be_visible()
            page.wait_for_timeout(200)
            bounds = panel.bounding_box()
            assert bounds and bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= width
            assert bounds["y"] + bounds["height"] <= 850
            panel.evaluate("node => node.scrollTop = node.scrollHeight")
            page.screenshot(path = str(out / f"rates-expanded-{theme}-{width}.png"))
            page.keyboard.press("Escape")
            page.goto(f"http://127.0.0.1:5418/smoke-thinking-controls.html?receipt=1&theme={theme}")
            page.locator("summary").click()
            expect(page.get_by_text("Upstream BYOK charge (separate)")).to_be_visible()
            page.screenshot(path = str(out / f"receipt-{theme}-{width}.png"))
    assert not errors, errors
    browser.close()
print("PASS: published rates, conditions, charge receipts, light/dark and narrow/desktop")
