# Requirements Document

## Introduction

This document specifies requirements for enhancing the Finehance dashboard with a personalized identity layer, drill-down expense analytics, integrated bot hub, monthly summary sidebar, and liability management features. The enhancements transform the dashboard from a generic product overview into a terminal-style personal financial command center with deep transaction visibility and streamlined external integrations.

## Glossary

- **Dashboard**: The main user interface component displaying financial overview and controls
- **User_Profile_Suite**: The personalized identity section replacing the static "Product Overview" header
- **Cover_Photo**: Wide-aspect banner image with cinematic or minimalist aesthetic
- **System_Identifier**: The "kashy" style username displayed in the profile
- **Display_Name**: User-customizable name shown alongside the system identifier
- **Monthly_Spent_Card**: The KPI card showing total monthly expenditure
- **Weekly_Breakdown**: Accordion expansion showing week-by-week spending details
- **Deep_Ledger**: The comprehensive transaction history view spanning account lifetime
- **Ghost_Table**: Transaction table rendered at 40% opacity with specific column structure
- **Bot_Hub**: Consolidated interface for Telegram bot integration
- **Execute_Button**: Single high-visibility button replacing fragmented bot input methods
- **Monthly_Summary**: Renamed sidebar section providing human-readable financial briefing
- **Pending_Invoices_Card**: Touch-interactive card displaying outstanding payment obligations
- **Active_Liabilities**: Categorized list of pending financial obligations
- **Fixed_Liabilities**: Recurring subscriptions and SaaS payments
- **Variable_Liabilities**: One-time debts to individuals or entities
- **Urgency_Highlighting**: Red/amber visual indicators for time-sensitive liabilities

## Requirements

### Requirement 1: Personalized Identity Layer

**User Story:** As a user, I want a personalized profile section at the top of my dashboard, so that I feel the interface is tailored to me rather than a generic product overview.

#### Acceptance Criteria

1. THE Dashboard SHALL display a User_Profile_Suite in place of the static "Product Overview" section
2. THE User_Profile_Suite SHALL include a Cover_Photo with wide aspect ratio
3. THE User_Profile_Suite SHALL display a System_Identifier using "kashy" style formatting
4. THE User_Profile_Suite SHALL display a Display_Name that the user can customize
5. THE User_Profile_Suite SHALL maintain a "logged-in terminal" aesthetic distinct from social media profile styling

### Requirement 2: Drill-Down Expense Engine

**User Story:** As a user, I want to expand my monthly spending to see weekly breakdowns and access my complete transaction history, so that I can analyze spending patterns at different time granularities.

#### Acceptance Criteria

1. WHEN a user clicks the Monthly_Spent_Card, THE Dashboard SHALL expand an accordion showing Weekly_Breakdown
2. THE accordion expansion SHALL animate smoothly with easing transitions
3. THE Weekly_Breakdown SHALL display spending totals for each week within the current month
4. THE Weekly_Breakdown SHALL include a "View Full History" button at the base of the expansion
5. WHEN a user clicks "View Full History", THE Dashboard SHALL navigate to the Deep_Ledger interface
6. THE Deep_Ledger SHALL display all transactions from account creation to current time
7. THE Deep_Ledger SHALL render transactions in a Ghost_Table format with 40% opacity
8. THE Ghost_Table SHALL include columns for Date/Time, Category, Origin Entity, Destination Entity, and Status
9. THE Deep_Ledger SHALL load and render efficiently despite displaying large transaction datasets
10. THE Deep_Ledger SHALL respond to user interactions within 200ms for scroll and filter operations

### Requirement 3: Integrated Bot Hub

**User Story:** As a user, I want a single consolidated button to access all bot commands, so that I can quickly interact with the Telegram bot without navigating fragmented input options.

#### Acceptance Criteria

1. THE Dashboard SHALL remove the separate Voice, Receipt, and Text input buttons from the Telegram section
2. THE Dashboard SHALL display a single "EXECUTE BOT COMMANDS" button with high visibility styling
3. WHEN a user clicks the "EXECUTE BOT COMMANDS" button, THE Dashboard SHALL redirect to the Telegram Bot deep-link in a new window
4. THE Bot_Hub SHALL consolidate all external communication through the single Execute_Button gateway
5. THE Execute_Button SHALL maintain visual prominence using contrast and positioning

### Requirement 4: Sidebar Pivot to Monthly Summary

**User Story:** As a user, I want a monthly financial summary instead of a chat interface, so that I can quickly understand my financial health without asking questions.

#### Acceptance Criteria

1. THE Dashboard SHALL rename the "Analyst AI" sidebar section to "Monthly Summary"
2. THE Monthly_Summary SHALL remove the chat input interface
3. THE Monthly_Summary SHALL display a human-readable briefing of the current month's financial health
4. THE Monthly_Summary SHALL include comparative analysis against the previous month
5. THE Monthly_Summary SHALL identify and highlight significant spending anomalies
6. WHEN cash flow increases by more than 10% compared to the previous month, THE Monthly_Summary SHALL display the percentage increase
7. WHEN a spending category exceeds its historical average by more than 20%, THE Monthly_Summary SHALL flag it as a "major leak"
8. THE Monthly_Summary SHALL update automatically when new transaction data is processed

### Requirement 5: Liability and Subscription Management

**User Story:** As a user, I want to tap on pending invoices to see categorized liabilities with urgency indicators, so that I can prioritize payments and manage subscriptions effectively.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Pending_Invoices_Card that responds to touch and click interactions
2. WHEN a user taps the Pending_Invoices_Card, THE Dashboard SHALL expand to show Active_Liabilities
3. THE Active_Liabilities SHALL be categorized into Fixed_Liabilities and Variable_Liabilities
4. THE Fixed_Liabilities section SHALL display software subscriptions and SaaS payments
5. THE Variable_Liabilities section SHALL display debts to friends and contacts
6. THE Active_Liabilities SHALL apply Urgency_Highlighting using red coloring for overdue items
7. THE Active_Liabilities SHALL apply Urgency_Highlighting using amber coloring for items due within 7 days
8. THE Urgency_Highlighting SHALL use "old-gen" styling without modern bubble notifications
9. WHEN a liability is paid, THE Dashboard SHALL remove it from the Active_Liabilities list within 5 seconds
10. THE Pending_Invoices_Card SHALL display the total count of Active_Liabilities as a badge
