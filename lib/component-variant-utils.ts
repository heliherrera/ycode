/**
 * Component variant utilities.
 *
 * Kept in a small, dependency-free module so it can be imported from both
 * `lib/layer-utils.ts` and `lib/component-utils.ts` without creating a
 * circular import.
 */

import type { Component, Layer } from '@/types';

/**
 * Resolve the layer tree for a specific variant of a component.
 *
 * Falls back to the first variant when `variantId` is undefined or points at a
 * variant that no longer exists (e.g. it was deleted while instances were still
 * referencing it). Falls back to the legacy `component.layers` field for
 * components persisted before the variants migration.
 */
export function getComponentVariantLayers(
  component: Component,
  variantId?: string,
): Layer[] {
  const variants = component.variants;
  if (variants && variants.length > 0) {
    const match = variantId ? variants.find(v => v.id === variantId) : undefined;
    return (match ?? variants[0]).layers ?? [];
  }
  return component.layers ?? [];
}
