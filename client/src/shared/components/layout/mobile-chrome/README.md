# Mobile bottom chrome

Mobile rider and admin shells share a fixed bottom stack:

```
CTA slot (portaled) → optional mode bar → tab bar
```

`MobileBottomChrome` renders that stack and measures its height into `--rydo-bottom-stack-h` on `<html>`. Scroll areas with the `rydo-bold-scroll-viewport` class pick up that inset automatically.

## Adding a mobile CTA

Use `MobileFloatingActions` — do **not** use `position: fixed` with `bottom-[calc(var(--rydo-tabbar-h)+…)]`.

The CTA slot renders a shared glass bar (border, blur, padding). Keep action rows inside it:

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

Content is portaled into `#rydo-mobile-cta-slot` at the top of the stack, so CTAs sit above the admin/rider mode bar and tab bar without manual offset tuning.

## Scroll padding

Prefer `BoldScrollArea` with default `insetTabBar` (adds `rydo-bold-scroll-viewport`). Do not add page-specific `pb-[calc(var(--rydo-tabbar-h)+…)]` — the measured stack height already includes CTAs when present.

## In-flow footers

For footers inside a screen column (not viewport-fixed), keep them in normal document flow — see `RouteDetailsPageBold`. No portal needed.

## PR checklist

When adding mobile bottom UI, grep for anti-patterns:

- `bottom-[.*rydo-tabbar`
- `pb-[calc(var(--rydo-tabbar-h)`
