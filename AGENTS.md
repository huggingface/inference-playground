# Agent Guidelines for inference-playground

## Build/Test/Lint Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run prettier and eslint checks
- `npm run format` - Format code with prettier
- `npm run check` - Run svelte-check for type checking
- `npm run test` or `npm run test:unit` - Run unit tests with vitest
- `npm run test:e2e` - Run e2e tests with playwright

## Code Style Guidelines

- **Formatting**: Uses tabs (tabWidth: 2), printWidth: 120, trailing commas, avoid arrow parens
- **Imports**: Use `.js` extensions for local imports (enforced by custom eslint rule)
- **Path aliases**: Use `$lib/` for src/lib imports
- **Types**: Strict TypeScript with `noUncheckedIndexedAccess`, no explicit `any` allowed
- **Naming**: Use camelCase for variables/functions, PascalCase for components/classes
- **Files**: `.svelte` for components, `.svelte.ts` for reactive state files
- **Icons**: Import from `~icons/carbon/` or `~icons/lucide/` or other unplugin-icons import
- **Error handling**: Use try/catch blocks, display user-friendly error messages via toasts
- **State**: Use Svelte 5 runes (`$state`, `$derived`) and reactive patterns
- **Unused vars**: Prefix with `_` to ignore eslint warnings
- **Object syntax**: Use object shorthand notation when possible

## Svelte general guidelines

### 1. **General Code Style**

- **Use Svelte 5 with runes** for all component state and reactivity.
- **Use snake_case** for all variable, function, and file names.
- **Do not use snake_case** for type/interface names; use **PascalCase** instead.
- **Do not use the `any` type** anywhere in the codebase.
- **Do not prefix private class properties with an underscore**.
- **Use `const` by default**; use `let` only when reassignment is necessary.
- **Prefer explicit over implicit**: always be clear about what your code is doing.

### 2. **Component Structure**

- **One component per file**. Name the file after the component, using kebab-case.
- **Export only what is necessary** from each file.

### 3. **Reactivity and State**

- **Use runes for all reactivity** (`$state`, `$derived`, etc.).
- **Avoid using Svelte’s legacy `$:` label**; prefer runes-based reactivity.
- **Keep state as local as possible**; lift state up only when needed.
- Dont start the dev server.
- **Dont use $app/stores**; use $app/state
- \*\*Dont use on:click handler; use the native onclick. this counts for all events.
- \*\*Dont use :global in the style blocks.

### 4. **TypeScript Practices**

- **Use TypeScript for all code**.
- **Never use `any`**. Use `unknown` or proper types/interfaces.
- **Type names must be PascalCase** (e.g., `UserProfile`).
- **Prefer type inference** where possible, but always type function arguments and return values.

### 5. **Class and Object Practices**

- **Do not prefix private properties with an underscore**.
- **Favor composition over inheritance**.

### 6. **File and Folder Organization**

- **Use kebab-case for all file and folder names**.
- **Group related components, stores, and helpers** in folders.
- **Keep a flat structure unless complexity demands nesting**.

### 7. **Comments and Documentation**

- **Write clear, concise comments** for complex logic.
- **Use JSDoc for function and class documentation**.
- **Remove commented-out code** before merging.

### 8. **Testing and Linting**

- **Write tests for all logic-heavy code** (use your preferred testing framework).
- **Use a linter and formatter** (e.g., ESLint, Prettier) with rules enforcing the above conventions.

### 9. **Other Good Practices**

- **Avoid magic numbers and strings**; use constants.
- **Handle errors gracefully**; never swallow errors silently.
- **Keep dependencies up to date** and avoid unnecessary packages.

- https://svelte.dev/docs/svelte/llms.txt
- https://svelte.dev/docs/kit/llms.txt
