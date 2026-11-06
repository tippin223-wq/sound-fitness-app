# Coach dashboard

/coach/dashboard now reuses DashboardExperience's revolving row shell and shared header. Seven rows: Today, Members, Sessions, Programming, Communication, Business and Settings. Today prioritizes the schedule and four direct row shortcuts. Cards use a responsive grid with local scrolling on short screens. Inactive rows are inert. No avatar is mounted in the coach rows.

The old illustrative clients, nearby offers, earnings and ratings were removed. Operational cards open the existing website /provider workspace and its verified views in new tabs, retaining its own authorization and source of truth. This is a layout and navigation integration; live operational records are not yet embedded into the app. The website may require separate sign-in. Programming uses the shared published plan catalog and /coach/library. Trainer Hub is a separate franchisee education product and is not used as the coaching workspace.

The member login form now has a prominent Coach sign in card linking to the existing /coach/login route. The coach layout accepts coach/admin roles and retains route/session protection; no local authentication bypass was added. The duplicate protected header is suppressed on the revolving dashboard, remaining on other coach pages.
