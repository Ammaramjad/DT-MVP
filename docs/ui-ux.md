# UI/UX Mockups, Wireframes, and Component Library

## Design System Principles
- Minimal, premium, low-cognitive-load
- High contrast and keyboard accessibility
- Fast transitions with purposeful animation
- Consistent spacing and hierarchy

## Wireframe: Dashboard

```text
+-------------------------------------------------------------+
| Sidebar                     | Top Summary                   |
| - Dashboard                 | KPI Cards (4)                 |
| - PDF Library               +-------------------------------+
| - Gap Finder                | Recent Projects | AI Modules  |
| - Experiment Planner        |                |              |
| - AI Chat                   |                |              |
| - Analytics                 +--------------------------------
| - Settings                                                 |
+-------------------------------------------------------------+
```

## Wireframe: Paper Workspace

```text
+-------------------------------------------------------------+
| Paper List | PDF Viewer + Highlighting | AI Insights Panel |
|            |                           | - TLDR             |
|            |                           | - Findings         |
|            |                           | - Limitations      |
+-------------------------------------------------------------+
```

## Component Library (Shadcn-style)

- `Button` variants: default, secondary, ghost
- `Card` primitives: header/title/content
- `StatTile`: KPI metric + trend
- `ModuleCard`: module status and launch action
- `ProjectRow`: title, progress, deadline, tags
- `ReviewPanel`: major/minor reviewer comments

## Motion Guidelines
- Navigation indicator: spring transition (`layoutId`)
- Card hover: subtle elevation and border tint
- Data updates: fade + slide up (120–180ms)
