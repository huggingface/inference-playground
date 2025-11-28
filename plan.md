# Layout Redesign Improvements Plan

## Issues to Fix

### Top Bar Adjustments

- [x] Move model and provider select to be the first items in the top bar
- [x] Remove project name from the top bar (redundant since it's selected in sidebar)
- [x] Move collapse sidebar button from top bar to the sidebar itself

### Sidebar Improvements

- [x] Make sidebar resizable (use example from visual playground branch)
- [x] Position collapse button on the sidebar side

### Layout Fixes

- [x] Fix "View docs" and "Give feedback" links overlapping with trash icon
  - Moved links to bottom bar next to trash icon

## Additional Potential Issues & Improvements

### Usability

- [x] Add keyboard shortcut for collapsing sidebar (Cmd+B / Ctrl+B)
- [x] Persist sidebar collapsed state in localStorage
- [x] Persist sidebar width when resizable

### Visual Polish

- [x] Add transition animation when sidebar collapses/expands
- [ ] Ensure proper spacing between top bar elements
- [ ] Check dark mode styling consistency

### Responsive Design

- [ ] Test and fix mobile layout
- [ ] Ensure settings popover doesn't overflow on smaller screens
- [ ] Handle long project names in sidebar gracefully

### Functionality

- [ ] Ensure system prompt changes are saved properly
- [ ] Verify model/provider selection works in new top bar position
- [ ] Test compare mode with new layout

### Accessibility

- [ ] Add proper ARIA labels for interactive elements
- [ ] Ensure keyboard navigation works properly
- [ ] Test with screen readers

## Implementation Order

1. **Top Bar Reorganization** (First Priority)

   - Move model/provider select to first position
   - Remove project name
   - Relocate sidebar toggle

2. **Resizable Sidebar** (Second Priority)

   - Implement resize functionality
   - Add persistence

3. **Fix Overlapping Elements** (Third Priority)

   - Resolve footer links position issue

4. **Polish & Testing** (Final)
   - Add animations
   - Test all functionality
   - Fix any remaining issues

---

**Current Status**: Resizable sidebar with persistence implemented. Provider select now visible in top bar alongside model select.
