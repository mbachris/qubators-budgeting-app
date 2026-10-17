# Qubators — Design System v0.1

Principles: offline-first clarity, money legibility, community warmth. Light + dark AA. No hardcoded colors/spacing in screens — tokens only.

## Tokens

### Color — Light
- primary-600 `#16A34A` (primary), primary-700 `#15803D` pressed
- accent-500 `#F59E0B` (community), accent-600 `#D97706`
- success `#16A34A`, warning `#F59E0B`, danger `#DC2626`, info `#2563EB`
- bg `#F8FAFC`, surface `#FFFFFF`, surface-2 `#F1F5F9`, border `#E2E8F0`
- text `#0F172A`, text-2 `#475569`, text-3 `#94A3B8`
- Category: tithe `#8B5CF6`, savings `#2563EB`, community `#F59E0B`, living `#16A34A`, custom `#64748B`

### Color — Dark
- bg `#020617`, surface `#0F172A`, surface-2 `#1E293B`, border `#1E293B`
- text `#F8FAFC`, text-2 `#CBD5E1`, text-3 `#64748B`
- primary-500 `#22C55E`, accent-400 `#FBBF24`

### Spacing / Radius / Type
- spacing 4pt: 4, 8, 12, 16, 20, 24, 32, 48
- radius: sm 8, md 12, lg 16, xl 24, full 999
- Type: Display 28/34 bold, Title 20/26 semibold, Body 16/24 regular, Caption 13/18, Mono for money (tabular-nums)
- Motion: 150ms press, 250ms sheet, ease-out

## Components
- Button: primary / secondary / ghost / danger, h 48, radius 12, disabled 40% opacity
- TextInput currency: label + BIF prefix, mono 20px, helper + error text, min 44pt hit
- Card: surface, border, radius 16, padding 16, elevation 0 (border-only, no shadow on low-end)
- ListRow: 56pt, left color dot, title + subtitle, right amount mono
- ProgressBar/Ring: track surface-2, fill per-category color, 8px bar
- SegmentedControl: Local Vault / Cloud Sync switch style
- SyncBadge: `On this device` (slate), `Synced HH:MM` (green), `Pending N` (amber), `Offline — will sync` (slate outline)
- EmptyState: illustration dot + title + CTA; ErrorState + Retry; Skeleton shimmer; Sheet modal; Toast bottom

## Money / i18n
- Minor-units everywhere, format `100 000 BIF`, `10 000 RWF`; EN default, FR labels ready (`Tithes/Dîmes`, `Savings/Épargne`, `Community/Communauté`, `Living/Quotidien`)
- Min touch 44pt, contrast AA, large-font safe (no fixed heights on text)

## Screens using it
Dashboard (totals + bars + badge), Add Income (amount → live 10/15/5/rest split preview), Expenses, Community (project cards + Give), Settings (categories edit + Storage cards + Backup to R2 + Export/Import).

Do / Don't: do use tokens + badges; don't block budgeting on login; don't put secrets in app.
