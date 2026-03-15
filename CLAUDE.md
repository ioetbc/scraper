# Habitz

TikTok brand promotion discovery tool using Apify for video scraping and LLM-powered classification.

## File Structure

This codebase follows a modular folder structure where each service/feature has its own folder containing co-located files by concern.

### Pattern

```
src/services/[feature]/
├── index.ts              # Re-exports everything (allows clean imports)
├── [feature].ts          # Main implementation
├── [feature].types.ts    # Type definitions
├── [feature].schema.ts   # Zod schemas (if applicable)
└── [feature].prompt.ts   # LLM prompts (if applicable)
```

### Import Convention

The `index.ts` file exports all public APIs, allowing clean imports without stuttering:

```typescript
// Good - import from folder
import { searchTikTok, TikTokVideo } from './services/apify';

// Avoid - importing from nested file
import { searchTikTok } from './services/apify/apify';
```

### Services

**apify/** - TikTok video scraping via Apify API
- `apify.ts` - Search functions (searchTikTok, searchByMention, searchByHashtag)
- `apify.types.ts` - TikTokVideo type, ApifyError class

**classifier/** - LLM-powered brand promotion detection
- `classifier.ts` - classifyVideo function
- `classifier.types.ts` - ClassificationInput, ClassificationResult types
- `classifier.schema.ts` - Zod schema for structured LLM output
- `classifier.prompt.ts` - System and user prompts

**brand-explorer/** - High-level brand analysis orchestration
- `brand-explorer.ts` - exploreBrand function
- `brand-explorer.types.ts` - BrandExplorerInput, BrandExplorerResult types

### Type Conventions

- Always use `type` instead of `interface`
- Co-locate types with their feature in `[feature].types.ts`
- Shared types live in `src/types/index.ts`
- Never use `as` type assertions (e.g., `result as SearchResult`). Fix type mismatches at the source by updating type definitions to match actual runtime values

### Adding a New Service

1. Create folder: `src/services/[name]/`
2. Create files:
   - `[name].types.ts` - Types and error classes
   - `[name].ts` - Main implementation
   - `index.ts` - Re-export public API
3. Add optional files as needed:
   - `[name].schema.ts` - Zod schemas
   - `[name].prompt.ts` - LLM prompts
