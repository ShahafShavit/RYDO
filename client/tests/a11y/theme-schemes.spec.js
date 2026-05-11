/**
 * Runs axe (WCAG 2.1 A) on public routes for each color scheme.
 * `color-contrast` is disabled here because theme palettes are tuned visually; run a dedicated contrast audit if needed.
 */
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const SCHEMES = ['midnight', 'evergreen', 'abyss', 'daylight', 'sage', 'dune'];

const ROUTES = ['/', '/login', '/register'];

for (const theme of SCHEMES) {
  test.describe(`theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((id) => {
        try {
          localStorage.setItem('rydo-color-scheme', id);
        } catch {
          /* ignore */
        }
        document.documentElement.setAttribute('data-theme', id);
      }, theme);
    });

    for (const path of ROUTES) {
      test(`axe: ${path}`, async ({ page }) => {
        const res = await page.goto(path, { waitUntil: 'networkidle' });
        expect(res?.ok()).toBeTruthy();
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag21a'])
          .disableRules(['color-contrast'])
          .analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      });
    }
  });
}
