# Sound Fitness member page outline

Approved member app structure. Domain hubs are peers; Nutrition and Recovery do not sit beneath Sessions. This is the target outline, not a claim that every branch is implemented.

```text
Member App
├── Dashboard — overview across all hubs
├── Profile
├── Goals — shared across all hubs
├── Training Plans — overall planning hub; /dashboard/training-plans
├── Training / Sessions
│   ├── Training plans
│   ├── Workout builder & exercise library
│   ├── Active workout
│   └── Workout history
├── Nutrition
│   ├── Nutrition plans
│   ├── Meals & recipes
│   └── Food & hydration history
├── Recovery
│   ├── Recovery plans
│   ├── Mobility & stretching
│   └── Check-ins & recovery history
├── Performance
│   ├── Cardio plans & activity tracker
│   └── PRs & benchmarks
├── Education
│   └── Courses & lessons
└── Rewards
    ├── Balances & earned rewards
    └── Avatar items & customization
```

Each hub uses the shared dashboard header and scrolling menu shell. Profile and Goals also have their own scrolling menus. Small actions such as logging water, adding a check-in or viewing an exercise open in popups within the appropriate hub.

The member journey is Profile → Goals → Training Plans (choose/build) → Sessions → Progress & Rewards. Goals inform all domain plans; verified activity records drive plan signals, levels and rewards. The website and app share the versioned plan catalog.

Improve header responsiveness before restructuring routes. Preserve existing working shells and backend services while consolidating pages into these hubs. TrainerHub remains a separate app.

Training Plans is the third foundation step after Profile and Goals. Its scrolling shell has Overview, Programs, Schedule and Domains. It reuses the shared program catalog and existing weekly plan builder/manager; domain hubs remain peers. Profile navigation groups Profile, Goals and Training Plans together, while Sessions remains the default header selection.
