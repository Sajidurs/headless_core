import type { ComponentType } from "react";

import type { Section } from "@/lib/types";

/**
 * THE SECTION REGISTRY.
 *
 * Maps a GraphQL type name to the React component that renders it. ACF
 * Flexible Content produces one type per layout, named from the field path:
 *
 *   field group "pageBuilder" -> field "sections" -> layout "hero"
 *   becomes   PageBuilderSectionsHeroLayout
 *
 * Adding a section type to the site is four steps, always all four:
 *
 *   1. ACF        — add the layout under the `sections` Flexible Content field
 *   2. queries.ts — add its inline fragment to NODE_BY_URI
 *   3. components/sections/<name>.tsx — build it
 *   4. here       — register it
 *
 * Skip step 2 and the section renders blank: the component is found, but the
 * data was never requested. That is the single most common bug in this
 * architecture, which is why the dev-only warning below is loud.
 */

// Phase 10 fills this in as each section component is built.
const REGISTRY: Record<string, ComponentType<never>> = {
  // PageBuilderSectionsHeroLayout: Hero,
  // PageBuilderSectionsServicesGridLayout: ServicesGrid,
};

export default function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section, index) => {
        const Component = REGISTRY[section.__typename];

        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            return (
              <div
                key={`${section.__typename}-${index}`}
                className="mx-auto my-4 max-w-3xl border-2 border-dashed border-red-500 bg-red-50 p-4 text-sm text-red-900"
              >
                <p className="font-semibold">Unmapped section</p>
                <p className="mt-1 font-mono text-xs">{section.__typename}</p>
                <p className="mt-2 text-xs">
                  Add a component and register it in{" "}
                  <code>src/components/sections.tsx</code>.
                </p>
              </div>
            );
          }
          // Never show a broken section to a visitor.
          return null;
        }

        // The registry is intentionally loosely typed — each section component
        // declares and validates its own props.
        const Render = Component as ComponentType<Section & { key?: string }>;

        return <Render key={`${section.__typename}-${index}`} {...section} />;
      })}
    </>
  );
}
