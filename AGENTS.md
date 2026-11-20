# Project architecture

- Keep the shared bottom navigation in equal-width columns, with a CSS height variable shared by its row and page clearance, safe-area insets, a larger tablet row and a compact horizontal row on short landscape screens; this keeps role-dependent menus usable without covering page actions.
- Give every bottom-navigation link a full accessible name, decorative icons, aria-current for the active page and a reserved selection border plus an inset keyboard focus ring; this distinguishes selection without shifting the layout.
- Keep inspection response choices in the shared parameter-options resolver and their evaluation in the shared evaluation engine; catalog editing, capture and reports must agree without rewriting historical readings.
- Store descriptive user attributes on profiles and edit them through admin-verified server functions; attributes never grant permissions, which remain in user_roles and user_sitios.