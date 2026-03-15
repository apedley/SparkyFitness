# SparkyFitnessMobile — Test Coverage Report

*Generated: 2026-03-15*

## Summary

| Metric | Value |
|--------|-------|
| Source files | 164 |
| Test files | 59 |
| Total test cases | 1,152 |
| File-level coverage | 36% |

## Coverage by Category

| Category | Source Files | Test Files | Test Cases | Coverage |
|----------|-------------|------------|------------|----------|
| Services | 34 | 27 | 713 | 79% |
| Hooks | 43 | 28 | 377 | 65% |
| Constants | 2 | 1 | 5 | 50% |
| Calculations | 1 | 1 | 17 | 100% |
| Utilities | 10 | 3 | 19 | 30% |
| Components | 36 | 3 | 41 | 8% |
| Screens | 15 | 1 | 2 | 7% |
| **Total** | **164** | **59** | **1,152** | **36%** |

## Strengths

- **Health data integration** — 101 tests across HealthKit (iOS) and Health Connect (Android) covering data transformation, aggregation, preferences, and background delivery.
- **API layer** — 374 tests covering `apiClient`, `authService`, `healthDataApi`, `exerciseApi`, `measurementsApi`, and `externalFoodSearchApi` with auth flows, retries, and error handling.
- **Storage & security** — 92 tests on `storage.ts` covering AsyncStorage, SecureStore, config persistence, and encryption.
- **Calculation logic** — BMR (Mifflin-St Jeor, Harris-Benedict), Navy body fat, step-to-calorie conversion, and calorie balance are fully tested.
- **TanStack Query hooks** — Mutation and query hooks for water intake, measurements, daily summary, food search, and exercise history are well covered.

---

## Critical Gaps (Priority Order)

### 1. Screens — 0 of 15 screens tested (CRITICAL)

No screen has meaningful test coverage. Only `SyncScreen` has 2 trivial render tests.

| Screen | Complexity | Risk |
|--------|-----------|------|
| `DashboardScreen` | High | Main entry point; aggregates data from multiple hooks |
| `DiaryScreen` | High | Core daily tracking view with food + exercise entries |
| `FoodEntryAddScreen` | Medium | Multi-step food entry flow; form validation |
| `ActivityFormScreen` | Medium | Exercise logging with set/rep/duration inputs |
| `WorkoutFormScreen` | Medium | Workout creation with exercise selection |
| `FoodFormScreen` | Medium | Custom food creation with macro inputs |
| `SettingsScreen` | Medium | Config changes affect app-wide behavior |
| `ExerciseSearchScreen` | Medium | Search + selection flow |
| `FoodSearchScreen` | Medium | Search + barcode scan integration |

**Why this matters:** Screens compose hooks, services, and components together. Bugs in composition logic (prop threading, conditional rendering, navigation) are invisible to unit tests.

### 2. Components — 3 of 36 components tested (CRITICAL)

Only `LoginModal` (33 tests), `ChartTouchOverlay` (8 tests), and `WorkoutCard` (1 test) have coverage.

**Highest-priority untested components:**

| Component | Why it matters |
|-----------|---------------|
| `FoodForm` | Core data entry; validation logic, serving calculations |
| `HealthDataSync` | Orchestrates iOS/Android sync; user-facing sync status |
| `ServerConfigModal` | Auth config changes can lock users out |
| `ServingAdjustSheet` | Numeric input with unit conversions; calculation bugs |
| `CalorieRingCard` | Visual accuracy of macro/calorie display |
| `SwipeableFoodRow` | Gesture-based delete; accidental deletion risk |
| `AddSheet` | Entry point for all new entries; navigation logic |
| `DateNavigator` | Date state drives the entire diary view |

### 3. Untested Hooks — 20 of 43 hooks lack tests (HIGH)

Hooks with meaningful business logic that lack tests:

| Hook | Risk |
|------|------|
| `useAddFoodEntry` | Core mutation; includes optional "save to library" side-effect |
| `useExerciseMutations` | CRUD mutations for exercises; cache invalidation |
| `useDraftPersistence` | Auto-save drafts to storage; data loss risk if buggy |
| `useSaveFood` | Saves custom foods; deduplication and validation |
| `useMeals` / `useMealSearch` | Meal management used across diary |
| `useExternalExerciseSearch` | External API integration with error states |
| `useFoodVariants` | Variant selection logic for food entries |

### 4. Utility Functions — 7 of 10 utils untested (MEDIUM)

| Utility | Risk |
|---------|------|
| `dateUtils.ts` | Date formatting used everywhere; timezone edge cases |
| `unitConversions.ts` | Weight/distance unit math; rounding errors |
| `workoutSession.ts` | Session duration, set formatting; 93 LOC of transformation logic |

### 5. Untested Services — 7 of 34 services lack tests (LOW-MEDIUM)

| Service | Risk |
|---------|------|
| `externalExerciseSearchApi.ts` | External API; error/timeout handling |
| `externalProvidersApi.ts` | OAuth/external auth flows |
| `themeService.ts` | Theme persistence; affects entire UI |
| `seedHealthData.ios.ts` | iOS-specific seeding; platform edge cases |

### 6. No End-to-End or Integration Tests (HIGH)

There are no tests that exercise a full user journey (e.g., "open app → search food → add entry → verify diary updates"). All 1,152 tests are unit-level.

---

## Recommended Action Plan

### Phase 1 — High-impact, low-effort wins
1. Add tests for `dateUtils.ts` and `unitConversions.ts` — pure functions, easy to test, used everywhere.
2. Add tests for `useAddFoodEntry` and `useExerciseMutations` — core mutations with cache side-effects.
3. Add tests for `useDraftPersistence` — data loss risk.

### Phase 2 — Component testing foundation
4. Add tests for `FoodForm`, `ServingAdjustSheet`, and `DateNavigator` — components with calculation/state logic.
5. Add tests for `HealthDataSync` and `ServerConfigModal` — components with side-effects.

### Phase 3 — Screen-level smoke tests
6. Add render + basic interaction tests for `DashboardScreen`, `DiaryScreen`, and `FoodEntryAddScreen`.
7. Add navigation flow tests for the food entry and exercise logging paths.

### Phase 4 — Integration testing
8. Evaluate Detox or Maestro for E2E flows covering login → diary → add food → verify.
