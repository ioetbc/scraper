# Frontend Table UI Rebuild Plan

## Overview
Rebuild the DataGrid table UI with a clean, minimal Airtable/Notion-inspired design using TanStack Table v8.

## Files to Modify

| File | Changes |
|------|---------|
| `app/styles.css` | Replace table styles with new design system |
| `app/components/DataGrid.tsx` | Add row selection, row numbers, restyle cells |
| `app/components/FilterTabs.tsx` | Transform to pill-shaped filter buttons |
| `app/components/ColumnFilter.tsx` | Restyle filter inputs |

---

## Step 1: Update CSS Foundation (`app/styles.css`)

Replace `.data-grid` styles with:
- Pure white background (#FFFFFF)
- Horizontal dividers only (1px #E5E7EB)
- Header: 13px, weight 500, color #374151
- Cells: 14px, weight 400, color #1F2937, 44px height
- Row hover: #F9FAFB
- Selected row: #F0FDFA (light teal)
- Row numbers: 13px, color #9CA3AF, right-aligned
- Links: #2563EB, no underline, underline on hover
- Empty cells: em-dash in #9CA3AF
- Custom teal checkbox styles (.checkbox-teal)

---

## Step 2: Add Row Selection (`DataGrid.tsx`)

1. Import `RowSelectionState` from TanStack Table
2. Add `rowSelection` state and `onRowSelectionChange` handler
3. Add checkbox display column (40px) with teal accent
4. Add row number display column (40px, muted gray, right-aligned)
5. Add `.selected` class to rows when selected
6. Update table config: `enableRowSelection: true`

---

## Step 3: Update Cell Rendering (`DataGrid.tsx`)

**Boolean cells (isPromotion, isAd, isSponsored):**
- Create `BooleanStatusCell` component
- Green checkmark SVG for true
- Gray checkmark SVG for false/null

**Empty cells:**
- Create `EmptyCell` component with em-dash (—)
- Apply to brand column when null
- Apply to signals column when empty array

**Links:**
- Rely on CSS for styling (remove inline Tailwind color classes)

---

## Step 4: Redesign FilterTabs (`FilterTabs.tsx`)

Transform to pill-shaped buttons:
- **Active:** bg-gray-800, text-white, rounded-full
- **Inactive:** bg-white, border-gray-200, text-gray-700, rounded-full
- Height: 32px (h-8), padding: 12px horizontal (px-3)
- Count badges inside each pill
- Add plus (+) icon button for "Add filter"
- Add sort icon button on right side

---

## Step 5: Restyle ColumnFilter (`ColumnFilter.tsx`)

Update all filter inputs:
- Height: 28px (h-7)
- Border: gray-200, rounded-md
- Focus: ring-1 gray-400
- Consistent styling across text/range/boolean/tier variants

---

## Design Tokens Summary

| Token | Value |
|-------|-------|
| Background | #FFFFFF |
| Border | #E5E7EB |
| Primary text | #1F2937 |
| Secondary text | #6B7280 |
| Muted text | #9CA3AF |
| Header text | #374151 |
| Link | #2563EB |
| Teal accent | #14B8A6 |
| Hover bg | #F9FAFB |
| Selected bg | #F0FDFA |

---

## Column Order After Changes

1. Row number (display, 40px)
2. Selection checkbox (40px)
3. Position (#) - data column
4. Creator (link)
5. Followers
6. Caption
7. Promotion (checkmark)
8. Ad (checkmark)
9. Sponsored (checkmark)
10. Brand
11. Confidence
12. Signals
13. Tier

---

## Implementation Order

1. `app/styles.css` - Foundation
2. `app/components/DataGrid.tsx` - Main changes
3. `app/components/FilterTabs.tsx` - Pill buttons
4. `app/components/ColumnFilter.tsx` - Filter restyling
