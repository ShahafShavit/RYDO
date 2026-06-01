# Mobile bottom chrome

Mobile rider and admin shells share a fixed bottom stack:

```
CTA slot (portaled) → optional mode bar → tab bar
```

`MobileBottomChrome` renders that stack and measures its height into `--rydo-bottom-stack-h` on `<html>`.

## Scroll boundary

Do **not** add `padding-bottom` on [`BoldScreen`](../../bold/BoldScreen.jsx) for chrome clearance — it creates a visible gap above the fixed stack.

`.rydo-bold-scroll-viewport` keeps `padding-bottom: 0`. The `insetTabBar` prop on [`BoldScrollArea`](../../bold/BoldScrollArea.jsx) remains for API compatibility. Portaled CTAs sit in the fixed stack overlay; avoid duplicate `pb-[calc(var(--rydo-tabbar-h)+…)]` on pages.

## Adding a mobile CTA

Use `MobileFloatingActions` — do **not** use `position: fixed` with `bottom-[calc(var(--rydo-tabbar-h)+…)]`.

The CTA slot (`#rydo-mobile-cta-slot`) is padding-only — transparent, no opaque bar. Keep action rows inside `MobileFloatingActions`:

- Primary: `GradientCTA` with `heightClass="h-12"`
- Secondary: `MobileChromeSecondaryButton`

```jsx
import MobileFloatingActions from '@/shared/components/layout/mobile-chrome/MobileFloatingActions';
import MobileChromeSecondaryButton from '@/shared/components/layout/mobile-chrome/MobileChromeSecondaryButton';

export function MyPageActions() {
  return (
    <MobileFloatingActions className="md:hidden">
      <MobileChromeSecondaryButton to="/somewhere" className="flex-1">
        Secondary
      </MobileChromeSecondaryButton>
      <GradientCTA type="button" heightClass="h-12" className="flex-1" onClick={onAction}>
        Primary
      </GradientCTA>
    </MobileFloatingActions>
  );
}
```

Content is portaled into `#rydo-mobile-cta-slot` at the top of the stack, so CTAs sit above the admin/rider mode bar and tab bar without manual offset tuning. When the slot is empty, it collapses and `--rydo-bottom-stack-h` shrinks accordingly.

## In-flow footers

For footers inside a screen column (not viewport-fixed), keep them in normal document flow — see `RouteDetailsPageBold`. No portal needed.

## PR checklist

When adding mobile bottom UI, grep for anti-patterns:

- `bottom-[.*rydo-tabbar`
- `pb-[calc(var(--rydo-tabbar-h)`
- `padding-bottom` on `.rydo-bold-scroll-viewport` or page scroll areas for chrome clearance
