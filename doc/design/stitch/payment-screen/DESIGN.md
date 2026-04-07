# Design System Specification: Architectural Authority

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Architectural Authority."** 

In the world of high-stakes building management and financial SaaS, the interface must mirror the physical structures it manages: solid, precise, and sophisticated. We are moving away from the "bubbly" consumer web. Instead, we embrace a high-density editorial aesthetic that treats financial data with the reverence of a blueprint. 

The system achieves premium status not through decorative elements, but through **intentional density**. By reducing padding and eliminating traditional borders, we allow the data to become the visual texture. We break the "template" look by using subtle tonal shifts and layered surfaces to create a sense of structural depth, ensuring that even the most complex ledger feels organized and authoritative.

---

## 2. Colors & Surface Philosophy
The palette is anchored by the depth of Navy and Slate, utilizing high-contrast accents for critical financial signaling.

### The "No-Line" Rule
To achieve a high-end, bespoke feel, **1px solid borders are prohibited for sectioning.** Traditional borders clutter a high-density layout. Instead, boundaries must be defined through:
*   **Background Shifts:** Distinguish a sidebar from a main panel by moving from `surface` (#f7f9fb) to `surface-container-low` (#f2f4f6).
*   **Tonal Transitions:** Use `surface-container-highest` (#e0e3e5) to define header regions against the main body.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Level 0 (Base):** `surface` or `background` for the primary canvas.
*   **Level 1 (Sections):** `surface-container-low` for large structural blocks.
*   **Level 2 (Cards/Widgets):** `surface-container-lowest` (#ffffff) to make data-heavy cards "pop" against the lower tiers.

### Signature Textures & Glassmorphism
*   **The Navy Gradient:** For primary CTAs and high-level financial overviews, use a subtle linear gradient from `primary` (#0c1427) to `primary_container` (#21283c). This adds "soul" and prevents the deep navy from feeling flat.
*   **Glass Elements:** For floating action panels or tooltips, use `surface_container_lowest` at 85% opacity with a `20px` backdrop-blur. This integrates the component into the environment rather than looking like an overlay.

---

## 3. Typography
We utilize **Inter** specifically for its "tabular num" features and exceptional legibility at small scales.

*   **Display & Headline (The Statement):** Use `display-sm` or `headline-md` for "Hero Numbers" (e.g., Total Portfolio Value). These should be bold and use `on_primary_fixed` to command attention.
*   **Title (The Structural Anchor):** `title-sm` (1rem) is the workhorse for card headers. It provides enough weight to anchor a section without occupying excessive vertical space.
*   **Body (The Data):** `body-md` (0.875rem) is the standard for data entries. For high-density tables, `body-sm` (0.75rem) may be used to maximize visibility.
*   **Labels (The Metadata):** `label-sm` (0.6875rem) in `on_surface_variant` is reserved for secondary information, such as timestamps or unit numbers.

**Typography Strategy:** Hierarchy is achieved through weight and color (e.g., `on_surface` for primary data vs. `outline` for units) rather than just size.

---

## 4. Elevation & Depth
In this design system, depth is a tool for focus, not just decoration.

*   **Tonal Layering:** Avoid drop shadows for static elements. A `surface-container-lowest` card sitting on a `surface-container-low` background provides a cleaner, more modern "lift."
*   **Ambient Shadows:** For interactive floating elements (modals, dropdowns), use a multi-layered shadow:
    *   *Shadow:* 0px 4px 20px rgba(12, 20, 39, 0.06).
    *   This uses a tinted version of the `primary` navy to mimic natural lighting.
*   **The "Ghost Border":** If a separator is required for accessibility in data-heavy tables, use `outline_variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Data Tables (The Core)
*   **Style:** No vertical lines. Use `surface-container-low` on hover to highlight rows.
*   **Density:** Use `sm` spacing (4px - 8px) for cell padding to ensure maximum data rows are visible above the fold.
*   **Typography:** All numeric columns must use tabular lining (monospaced numbers) for easy vertical scanning.

### Buttons
*   **Primary:** Sharp `md` (0.375rem) corners. Use the Navy gradient.
*   **Secondary:** No background. Use a `Ghost Border` and `primary` text.
*   **States:** On press, transition to `primary_fixed_dim`.

### Financial Status Indicators
*   **Success (Payments):** Use `secondary` (#006e2d) with `on_secondary_container` text.
*   **Alert (Debts):** Use `error` (#ba1a1a). 
*   **Execution:** These indicators should be small "pills" using the `sm` (0.125rem) or `md` (0.375rem) roundedness to signify importance without breaking the architectural grid.

### Input Fields
*   **Style:** Flat backgrounds using `surface_container_high`. 
*   **Focus:** Transition to a 1px `primary` bottom-border only. Avoid full-box outlines to maintain the minimalist aesthetic.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** prioritize vertical alignment. In a high-density UI, misalignment is amplified.
*   **Do** use white space as a separator. A 24px gap is more effective than a grey line.
*   **Do** use `tertiary_container` for extreme warnings (e.g., legal notices) to distinguish from standard financial debt.

### Don’t:
*   **Don’t** use rounded corners larger than `lg` (8px). This system is about "Architectural" precision; overly round corners feel too casual.
*   **Don’t** use pure black (#000000). Always use the `primary` navy or `on_surface` for text to maintain tonal harmony.
*   **Don’t** sacrifice data density for "breathing room." The user is a power-user; they value information over whitespace.