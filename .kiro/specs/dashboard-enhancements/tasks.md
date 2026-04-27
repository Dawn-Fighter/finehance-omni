# Implementation Plan: Dashboard Enhancements

## Overview

This implementation plan transforms the Finehance dashboard by adding personalized identity features, drill-down expense analytics, consolidated bot interactions, automated monthly summaries, and interactive liability management. The implementation follows a progressive enhancement approach, building each feature incrementally while maintaining the existing terminal aesthetic.

## Tasks

- [x] 1. Set up data models and TypeScript interfaces
  - Create TypeScript interfaces for UserProfile, MonthlySpending, WeeklySpending, Transaction (extended), MonthlySummary, Liabilities, FixedLiability, VariableLiability
  - Add new state slices to Dashboard component: userProfile, monthlySpending, deepLedgerVisible, liabilities, monthlySummary
  - Set up mock data for development and testing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 4.1, 5.1, 5.2, 5.3_

- [x] 2. Implement UserProfileSuite component
  - [x] 2.1 Create UserProfileSuite component with cover photo, system identifier, and display name
    - Build component structure with 16:5 aspect ratio cover photo area
    - Implement fallback gradient when coverPhotoUrl is null
    - Add system identifier with monospace font styling
    - Add display name with larger font and editable functionality
    - Apply terminal aesthetic styling (subtle borders, no social media styling)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write unit tests for UserProfileSuite
    - Test rendering with and without cover photo
    - Test edit functionality for display name
    - Test fallback gradient rendering
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.3 Integrate UserProfileSuite into Dashboard
    - Replace static "Product Overview" section with UserProfileSuite
    - Wire up state management for user profile data
    - Implement localStorage persistence for quick load
    - _Requirements: 1.1_

- [x] 3. Enhance MonthlySpentCard with weekly breakdown
  - [x] 3.1 Add accordion expansion to MonthlySpentCard
    - Implement click handler to toggle expansion state
    - Add Framer Motion accordion animation (300ms ease-out)
    - Create WeeklyBreakdown component displaying week-by-week spending
    - Add "View Full History" button at bottom of expansion
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Implement weekly spending computation
    - Create function to aggregate transactions by ISO week
    - Group transactions by month and compute weekly totals
    - Calculate transaction counts per week
    - Cache computed data per month for performance
    - _Requirements: 2.3_

  - [ ]* 3.3 Write unit tests for weekly breakdown
    - Test accordion expansion/collapse animation
    - Test weekly spending computation with various transaction datasets
    - Test edge cases (empty weeks, single transaction)
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement DeepLedger and GhostTable
  - [x] 5.1 Create DeepLedger modal/full-page view
    - Build modal or full-page container with close functionality
    - Add filter and search controls at top
    - Implement state management for deepLedgerVisible
    - Wire up "View Full History" button to open DeepLedger
    - _Requirements: 2.5, 2.6_

  - [ ] 5.2 Implement GhostTable component with virtualization
    - Create table with columns: Date/Time, Category, Origin Entity, Destination Entity, Amount, Status
    - Apply 40% opacity styling and monospace font
    - Integrate react-window or react-virtual for virtualization
    - Implement lazy loading in batches of 100 transactions
    - Add debounced search/filter (300ms)
    - _Requirements: 2.7, 2.8, 2.9, 2.10_

  - [ ]* 5.3 Write performance tests for DeepLedger
    - Test render time with 1000+ transactions (target: < 500ms)
    - Test scroll performance (target: 60fps)
    - Test search/filter debouncing
    - _Requirements: 2.9, 2.10_

- [ ] 6. Refactor Bot Hub to single button
  - [ ] 6.1 Replace fragmented bot interface with single button
    - Remove Voice, Receipt, and Text input buttons
    - Create "EXECUTE BOT COMMANDS" button with high-visibility styling
    - Implement click handler to open Telegram deep-link in new window
    - Apply contrast and prominent positioning
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write integration tests for Bot Hub
    - Test button rendering and styling
    - Test deep-link generation with correct token
    - Test new window opening behavior
    - _Requirements: 3.2, 3.3_

- [ ] 7. Transform Analyst AI to Monthly Summary
  - [ ] 7.1 Create MonthlySummary component
    - Remove chat input interface from existing Analyst AI section
    - Rename section to "Monthly Summary"
    - Build human-readable briefing display
    - Implement month-over-month comparison display
    - Add anomaly highlighting (green for positive, red/amber for negative)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.2 Implement monthly summary computation
    - Create function to compute current month financial data
    - Calculate comparison percentages against previous month
    - Detect spending anomalies (>20% above historical average)
    - Flag categories exceeding 10% increase as significant
    - Generate human-readable summary text
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [ ] 7.3 Add automatic update trigger
    - Implement update logic on new transaction processing
    - Add monthly rollover detection
    - Ensure UI updates reflect new data
    - _Requirements: 4.8_

  - [ ]* 7.4 Write unit tests for Monthly Summary
    - Test summary text generation with various financial scenarios
    - Test anomaly detection logic
    - Test month-over-month comparison calculations
    - Test edge cases (first month, no previous data)
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Enhance Pending Invoices Card with liability management
  - [ ] 9.1 Add accordion expansion to Pending Invoices Card
    - Implement touch/click handler for card expansion
    - Add Framer Motion accordion animation (300ms)
    - Create ActiveLiabilities component with categorized sections
    - Display total count badge on collapsed card
    - _Requirements: 5.1, 5.2, 5.10_

  - [ ] 9.2 Implement liability categorization
    - Create FixedLiabilities section for subscriptions and SaaS
    - Create VariableLiabilities section for personal debts
    - Implement data structure for both liability types
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 9.3 Add urgency highlighting
    - Implement urgency calculation function (overdue, urgent, normal)
    - Apply red styling for overdue items (dueDate < today)
    - Apply amber styling for items due within 7 days
    - Use "old-gen" styling without bubble notifications
    - _Requirements: 5.6, 5.7, 5.8_

  - [ ] 9.4 Implement payment removal flow
    - Add payment action handler
    - Implement fade-out animation (300ms) on payment
    - Remove liability from list within 5 seconds
    - Update total count badge
    - _Requirements: 5.9_

  - [ ]* 9.5 Write integration tests for liability management
    - Test accordion expansion/collapse
    - Test urgency highlighting with various due dates
    - Test payment removal flow and timing
    - Test badge count updates
    - _Requirements: 5.1, 5.2, 5.6, 5.7, 5.9, 5.10_

- [ ] 10. Add animation enhancements
  - [ ] 10.1 Implement Framer Motion animations
    - Add accordion animations for MonthlySpentCard and PendingInvoicesCard
    - Add card hover animations (whileHover: y: -2)
    - Add tap animations (whileTap: scale: 0.98)
    - Add list update animations with AnimatePresence
    - Add pulsing animation for urgency indicators
    - _Requirements: 2.2, 5.1_

  - [ ] 10.2 Add reduced motion support
    - Detect prefers-reduced-motion preference
    - Disable animations when reduced motion is preferred
    - Provide CSS transition fallbacks
    - _Requirements: 2.2, 5.1_

  - [ ]* 10.3 Write performance tests for animations
    - Test accordion animation smoothness (target: 60fps)
    - Test scroll performance with animations
    - Test animation performance on low-end devices
    - _Requirements: 2.2, 2.10_

- [ ] 11. Final integration and polish
  - [ ] 11.1 Wire all components together
    - Integrate all new components into Dashboard
    - Ensure state management flows correctly
    - Verify all interactions work end-to-end
    - Test data flow from mock data to UI
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [ ] 11.2 Add error handling
    - Implement error handling for user profile loading
    - Add error handling for Deep Ledger loading
    - Add error handling for monthly summary generation
    - Add error handling for liability payment failures
    - Display appropriate error messages and retry options
    - _Requirements: 2.9, 2.10, 5.9_

  - [ ]* 11.3 Write end-to-end integration tests
    - Test complete monthly spending flow (expand → weekly breakdown → Deep Ledger)
    - Test complete liability payment flow
    - Test Bot Hub flow
    - Test Monthly Summary update flow
    - _Requirements: 2.1, 2.5, 3.3, 4.8, 5.9_

  - [ ]* 11.4 Perform accessibility audit
    - Test keyboard navigation for all interactive elements
    - Add ARIA labels for expandable sections
    - Test focus management for modals
    - Verify color contrast for urgency indicators (WCAG AA)
    - Test with screen readers
    - _Requirements: 2.10, 5.6, 5.7_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The implementation maintains the existing terminal aesthetic throughout
- All animations use Framer Motion for consistency
- Performance targets: Deep Ledger < 500ms render, 60fps scrolling, 200ms interaction response
- Accessibility compliance is built in from the start
