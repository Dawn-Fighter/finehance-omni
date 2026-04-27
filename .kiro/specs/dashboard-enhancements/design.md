# Design Document: Dashboard Enhancements

## Overview

The dashboard enhancements transform the Finehance dashboard from a generic financial overview into a personalized financial command center. The design introduces five major feature areas:

1. **Personalized Identity Layer**: Replaces the static "Product Overview" with a user-specific profile section featuring a cover photo, system identifier ("kashy" style), and customizable display name
2. **Drill-Down Expense Engine**: Adds expandable monthly spending with weekly breakdowns and a comprehensive transaction history view (Deep Ledger)
3. **Integrated Bot Hub**: Consolidates fragmented Telegram bot interactions into a single "EXECUTE BOT COMMANDS" button
4. **Monthly Summary Sidebar**: Replaces the chat-based "Analyst AI" with an automated financial briefing showing month-over-month comparisons and spending anomalies
5. **Liability Management**: Transforms the pending invoices card into an interactive view with categorized liabilities (fixed/variable) and urgency highlighting

The design maintains the existing terminal-aesthetic styling while adding depth through progressive disclosure patterns (accordions, expansions) and state-driven UI updates.

### Design Principles

- **Progressive Disclosure**: Complex data (weekly breakdowns, full transaction history, liability details) hidden behind user-initiated expansions
- **Terminal Aesthetic**: Maintains the "logged-in terminal" feel with monospace elements, muted colors, and minimal decoration
- **Performance First**: Large datasets (Deep Ledger) rendered efficiently using virtualization and opacity-based styling
- **State-Driven Updates**: UI reflects data changes within 200ms for interactions, 5 seconds for backend updates

## Architecture

### Component Hierarchy

```
Dashboard (root)
├── Sidebar (existing, unchanged)
├── Header (existing, unchanged)
└── Main Content
    ├── UserProfileSuite (new)
    │   ├── CoverPhoto
    │   ├── SystemIdentifier
    │   └── DisplayName
    ├── KPI Strip
    │   └── MonthlySpentCard (enhanced with accordion)
    │       └── WeeklyBreakdown (new expansion)
    │           └── ViewFullHistoryButton
    ├── Grid Layout
    │   ├── Cashflow Chart (existing)
    │   ├── Category Chart (existing)
    │   ├── Transactions Panel (existing)
    │   ├── Budget Health (existing)
    │   └── Right Rail
    │       ├── BotHub (redesigned)
    │       │   └── ExecuteButton (replaces 3 buttons)
    │       ├── MonthlySummary (replaces Analyst AI)
    │       │   └── FinancialBriefing (new)
    │       └── PendingInvoicesCard (enhanced)
    │           └── ActiveLiabilities (new expansion)
    │               ├── FixedLiabilities
    │               └── VariableLiabilities
    └── DeepLedger (new route/modal)
        └── GhostTable
```

### State Management

The design uses React's `useState` for local component state and introduces new state slices:

```typescript
// New state additions to Dashboard component
const [userProfile, setUserProfile] = useState<UserProfile>({
  coverPhotoUrl: string | null,
  systemIdentifier: string,
  displayName: string
});

const [monthlySpending, setMonthlySpending] = useState<MonthlySpending>({
  total: number,
  weeks: WeeklySpending[],
  expanded: boolean
});

const [deepLedgerVisible, setDeepLedgerVisible] = useState(false);

const [liabilities, setLiabilities] = useState<Liabilities>({
  fixed: FixedLiability[],
  variable: VariableLiability[],
  expanded: boolean
});

const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
  currentMonth: MonthData,
  previousMonth: MonthData,
  anomalies: Anomaly[],
  lastUpdated: Date
});
```

### Data Flow

1. **User Profile**: Loaded on mount from localStorage/API, editable via settings modal
2. **Monthly Spending**: Computed from transaction data, cached per month
3. **Weekly Breakdown**: Derived from monthly spending, grouped by ISO week
4. **Deep Ledger**: Lazy-loaded when user clicks "View Full History", paginated/virtualized
5. **Monthly Summary**: Generated server-side or computed client-side on transaction updates
6. **Liabilities**: Fetched from backend, updated on payment events via WebSocket or polling

### Animation Strategy

Using Framer Motion for:
- **Accordion expansions**: `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: "auto", opacity: 1 }}`
- **Card interactions**: `whileHover={{ y: -2 }}`, `whileTap={{ scale: 0.98 }}`
- **List updates**: `AnimatePresence` for liability removal
- **Urgency indicators**: Pulsing animation for overdue items

## Components and Interfaces

### UserProfileSuite

**Purpose**: Personalized identity section replacing static header

**Props**:
```typescript
interface UserProfileSuiteProps {
  profile: UserProfile;
  onEditProfile: () => void;
}

interface UserProfile {
  coverPhotoUrl: string | null;
  systemIdentifier: string; // e.g., "@kashy_fin"
  displayName: string;
}
```

**Rendering**:
- Cover photo: 16:5 aspect ratio, fallback to gradient if null
- System identifier: Monospace font, muted color
- Display name: Larger font, editable on click

**Styling**: Terminal aesthetic with subtle borders, no social media styling

---

### MonthlySpentCard (Enhanced)

**Purpose**: KPI card with expandable weekly breakdown

**Props**:
```typescript
interface MonthlySpentCardProps {
  total: number;
  weeks: WeeklySpending[];
  expanded: boolean;
  onToggle: () => void;
  onViewFullHistory: () => void;
}

interface WeeklySpending {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  total: number;
  transactionCount: number;
}
```

**Behavior**:
- Click anywhere on card to toggle expansion
- Smooth accordion animation (300ms ease-out)
- "View Full History" button at bottom of expansion
- Weekly totals displayed as bar chart or list

---

### DeepLedger

**Purpose**: Full transaction history view

**Props**:
```typescript
interface DeepLedgerProps {
  transactions: Transaction[];
  onClose: () => void;
}

interface Transaction {
  id: string;
  dateTime: Date;
  category: string;
  originEntity: string;
  destinationEntity: string;
  amount: number;
  status: TransactionStatus;
}
```

**Rendering**:
- Modal or full-page view
- GhostTable: 40% opacity, monospace font
- Columns: Date/Time | Category | Origin | Destination | Amount | Status
- Virtualized scrolling for 1000+ transactions
- Filter/search controls at top

**Performance**:
- Use `react-window` or `react-virtual` for virtualization
- Lazy load transactions in batches of 100
- Debounced search/filter (300ms)

---

### BotHub (Redesigned)

**Purpose**: Consolidated Telegram bot interface

**Props**:
```typescript
interface BotHubProps {
  telegramLinked: boolean;
  deepLinkToken: string;
}
```

**Changes**:
- Remove: Voice, Receipt, Text buttons
- Add: Single "EXECUTE BOT COMMANDS" button
- Button styling: High contrast, prominent placement
- Click behavior: Opens `https://t.me/Finehance_bot?start=${token}` in new window

---

### MonthlySummary (Replaces Analyst AI)

**Purpose**: Automated financial briefing

**Props**:
```typescript
interface MonthlySummaryProps {
  summary: MonthlySummary;
}

interface MonthlySummary {
  currentMonth: MonthData;
  previousMonth: MonthData;
  anomalies: Anomaly[];
  lastUpdated: Date;
}

interface MonthData {
  totalSpent: number;
  totalIncome: number;
  netCashflow: number;
  categoryBreakdown: Record<string, number>;
}

interface Anomaly {
  type: "increase" | "decrease" | "spike";
  category: string;
  percentageChange: number;
  description: string;
}
```

**Rendering**:
- Remove chat input interface
- Display human-readable text summary
- Highlight positive changes (green) and negative changes (red/amber)
- Show month-over-month comparison percentages
- Flag spending categories exceeding 20% historical average as "major leak"

**Update Trigger**: Recompute on new transaction or monthly rollover

---

### PendingInvoicesCard (Enhanced)

**Purpose**: Interactive liability management

**Props**:
```typescript
interface PendingInvoicesCardProps {
  liabilities: Liabilities;
  expanded: boolean;
  onToggle: () => void;
  onPayLiability: (id: string) => void;
}

interface Liabilities {
  fixed: FixedLiability[];
  variable: VariableLiability[];
}

interface FixedLiability {
  id: string;
  name: string; // e.g., "Stripe"
  amount: number;
  dueDate: Date;
  recurring: boolean;
  category: "software" | "saas" | "subscription";
}

interface VariableLiability {
  id: string;
  name: string; // e.g., "John Doe"
  amount: number;
  dueDate: Date;
  description: string;
}
```

**Behavior**:
- Click card to expand/collapse
- Accordion animation (300ms)
- Categorized sections: "Fixed Liabilities" and "Variable Liabilities"
- Urgency highlighting:
  - **Red**: Overdue (dueDate < today)
  - **Amber**: Due within 7 days
  - **Default**: Due later
- "Old-gen" styling: Solid color backgrounds, no bubble notifications
- On payment: Remove from list with fade-out animation (300ms), update within 5s

**Badge**: Display total count of active liabilities on collapsed card

## Data Models

### UserProfile

```typescript
interface UserProfile {
  userId: string;
  coverPhotoUrl: string | null;
  systemIdentifier: string; // Format: "@username_suffix"
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Storage**: localStorage for quick load, synced to backend on change

---

### MonthlySpending

```typescript
interface MonthlySpending {
  month: string; // ISO format: "2026-04"
  total: number;
  weeks: WeeklySpending[];
}

interface WeeklySpending {
  weekNumber: number; // ISO week number
  startDate: string; // ISO date
  endDate: string;
  total: number;
  transactionCount: number;
  topCategories: { category: string; amount: number }[];
}
```

**Computation**: Aggregate from transactions, group by ISO week

---

### Transaction (Extended)

```typescript
interface Transaction {
  id: string;
  dateTime: Date;
  category: string;
  originEntity: string; // Who paid
  destinationEntity: string; // Who received
  amount: number;
  status: "completed" | "pending" | "processing" | "failed";
  source: "auto" | "telegram" | "receipt" | "manual";
  metadata?: Record<string, any>;
}
```

**Indexing**: Index by dateTime for efficient range queries

---

### MonthlySummary

```typescript
interface MonthlySummary {
  month: string; // ISO format
  totalSpent: number;
  totalIncome: number;
  netCashflow: number;
  categoryBreakdown: Record<string, number>;
  comparisonToPreviousMonth: {
    spentChange: number; // Percentage
    incomeChange: number;
    cashflowChange: number;
  };
  anomalies: Anomaly[];
  generatedAt: Date;
}

interface Anomaly {
  type: "increase" | "decrease" | "spike" | "leak";
  category: string;
  percentageChange: number;
  description: string;
  severity: "low" | "medium" | "high";
}
```

**Generation**: Computed monthly, cached, regenerated on significant transaction updates

---

### Liability

```typescript
interface FixedLiability {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  recurring: boolean;
  frequency?: "monthly" | "quarterly" | "annual";
  category: "software" | "saas" | "subscription" | "utility";
  autoPayEnabled: boolean;
}

interface VariableLiability {
  id: string;
  name: string; // Person or entity name
  amount: number;
  dueDate: Date;
  description: string;
  contactInfo?: string;
}

interface LiabilityState {
  fixed: FixedLiability[];
  variable: VariableLiability[];
  totalCount: number;
  totalAmount: number;
  overdueCount: number;
}
```

**Urgency Calculation**:
```typescript
function getUrgency(dueDate: Date): "overdue" | "urgent" | "normal" {
  const today = new Date();
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 7) return "urgent";
  return "normal";
}
```

## Error Handling

### User Profile Loading

**Error**: Failed to load user profile from backend
**Handling**: 
- Display default profile with placeholder values
- Show non-intrusive error toast
- Retry on next mount or manual refresh

### Deep Ledger Loading

**Error**: Transaction fetch timeout or failure
**Handling**:
- Display partial data if available
- Show loading skeleton for missing data
- Provide "Retry" button
- Log error to monitoring service

### Monthly Summary Generation

**Error**: Insufficient data or computation failure
**Handling**:
- Display message: "Summary unavailable - insufficient transaction data"
- Fall back to basic stats (total spent, total income)
- Retry generation on next transaction update

### Liability Payment Failure

**Error**: Payment processing fails or times out
**Handling**:
- Keep liability in list
- Show error indicator on specific liability
- Provide "Retry Payment" action
- Display error message with details

### Animation Performance

**Error**: Janky animations on low-end devices
**Handling**:
- Detect reduced motion preference: `prefers-reduced-motion`
- Disable animations if detected
- Use CSS transitions instead of JS animations where possible
- Reduce animation complexity (fewer keyframes)

## Testing Strategy

### Unit Tests

**Components to Test**:
1. **UserProfileSuite**: Rendering with/without cover photo, edit functionality
2. **MonthlySpentCard**: Expansion/collapse, weekly breakdown display
3. **DeepLedger**: Transaction rendering, filtering, sorting
4. **BotHub**: Button rendering, deep link generation
5. **MonthlySummary**: Summary text generation, anomaly highlighting
6. **PendingInvoicesCard**: Expansion, liability categorization, urgency styling

**Test Cases**:
- Render with empty data
- Render with mock data
- User interactions (clicks, expansions)
- Edge cases (no cover photo, zero liabilities, empty transaction history)

### Integration Tests

**Scenarios**:
1. **Monthly Spending Flow**: Click card → expand → view weekly breakdown → click "View Full History" → Deep Ledger opens
2. **Liability Payment Flow**: Click pending invoices → expand → click pay → liability removed within 5s
3. **Bot Hub Flow**: Click "EXECUTE BOT COMMANDS" → new window opens with correct deep link
4. **Monthly Summary Update**: New transaction added → summary regenerates → UI updates

### Visual Regression Tests

**Components**:
- UserProfileSuite with/without cover photo
- MonthlySpentCard expanded/collapsed
- DeepLedger GhostTable
- PendingInvoicesCard with urgency highlighting (red, amber, default)

**Tool**: Percy, Chromatic, or Playwright screenshots

### Performance Tests

**Metrics**:
- Deep Ledger render time with 1000+ transactions: < 500ms
- Scroll performance in Deep Ledger: 60fps
- Accordion animation smoothness: 60fps
- Monthly Summary generation time: < 1s

**Tools**: Lighthouse, React DevTools Profiler

### Accessibility Tests

**Requirements**:
- Keyboard navigation for all interactive elements
- ARIA labels for expandable sections
- Focus management for modals (Deep Ledger)
- Color contrast for urgency indicators (WCAG AA)
- Screen reader announcements for dynamic updates

**Tools**: axe-core, WAVE, manual testing with screen readers
