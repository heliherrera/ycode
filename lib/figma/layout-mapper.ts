import type { LayoutDesign, SpacingDesign, SizingDesign, PositioningDesign } from '@/types';
import type { FigmaNode } from '@/lib/figma/types';

function px(value: number | undefined | null): string | undefined {
  if (value == null || value === 0) return undefined;
  return `${Math.round(value * 100) / 100}px`;
}

function pxOrZero(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

export function mapLayout(node: FigmaNode): {
  layout?: LayoutDesign;
  spacing?: SpacingDesign;
  sizing?: SizingDesign;
  positioning?: PositioningDesign;
} {
  const { layout } = node;

  if (!layout || layout.mode === 'NONE') {
    return mapAbsoluteLayout(node);
  }

  const result: {
    layout?: LayoutDesign;
    spacing?: SpacingDesign;
    sizing?: SizingDesign;
    positioning?: PositioningDesign;
  } = {};

  result.layout = mapFlexOrGridLayout(layout);
  result.spacing = mapSpacing(layout);
  result.sizing = mapSizing(node);

  return result;
}

function mapFlexOrGridLayout(layout: NonNullable<FigmaNode['layout']>): LayoutDesign {
  const result: LayoutDesign = { isActive: true };

  if (layout.mode === 'GRID') {
    result.display = 'Grid';
    if (layout.gridTemplateColumns) result.gridTemplateColumns = layout.gridTemplateColumns;
    if (layout.gridTemplateRows) result.gridTemplateRows = layout.gridTemplateRows;
    mapAlignment(layout, result);
    if (layout.gap) result.gap = pxOrZero(layout.gap);
    if (layout.counterAxisSpacing != null) {
      result.rowGap = pxOrZero(layout.counterAxisSpacing);
      result.gapMode = 'individual';
    }
    return result;
  }

  result.display = 'Flex';
  result.flexDirection = layout.mode === 'HORIZONTAL' ? 'row' : 'column';

  if (layout.wrap) result.flexWrap = 'wrap';

  mapAlignment(layout, result);

  if (layout.gap) result.gap = pxOrZero(layout.gap);

  if (layout.counterAxisSpacing != null) {
    const crossGapProp = layout.mode === 'HORIZONTAL' ? 'columnGap' : 'rowGap';
    result[crossGapProp] = pxOrZero(layout.counterAxisSpacing);
    result.gapMode = 'individual';
  }

  return result;
}

function mapAlignment(layout: NonNullable<FigmaNode['layout']>, result: LayoutDesign): void {
  const primaryMap: Record<string, string> = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    SPACE_BETWEEN: 'space-between',
  };

  const counterMap: Record<string, string> = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    BASELINE: 'baseline',
  };

  if (layout.primaryAlign && primaryMap[layout.primaryAlign]) {
    result.justifyContent = primaryMap[layout.primaryAlign];
  }

  if (layout.counterAlign && counterMap[layout.counterAlign]) {
    result.alignItems = counterMap[layout.counterAlign];
  }
}

function mapSpacing(layout: NonNullable<FigmaNode['layout']>): SpacingDesign | undefined {
  const hasAnyPadding =
    layout.paddingTop || layout.paddingRight || layout.paddingBottom || layout.paddingLeft;

  if (!hasAnyPadding) return undefined;

  const top = pxOrZero(layout.paddingTop);
  const right = pxOrZero(layout.paddingRight);
  const bottom = pxOrZero(layout.paddingBottom);
  const left = pxOrZero(layout.paddingLeft);

  const allEqual = top === right && right === bottom && bottom === left;

  if (allEqual) {
    return { isActive: true, padding: top, paddingMode: 'all' };
  }

  return {
    isActive: true,
    paddingTop: top,
    paddingRight: right,
    paddingBottom: bottom,
    paddingLeft: left,
    paddingMode: 'individual',
  };
}

function mapSizing(node: FigmaNode): SizingDesign | undefined {
  const result: SizingDesign = {};
  let hasValue = false;

  const hSizing = node.layoutSizingHorizontal;
  if (hSizing === 'FILL') {
    result.width = '100%';
    hasValue = true;
  } else if (hSizing === 'HUG') {
    result.width = 'fit-content';
    hasValue = true;
  } else if (hSizing === 'FIXED' && node.width) {
    result.width = pxOrZero(node.width);
    hasValue = true;
  }

  const vSizing = node.layoutSizingVertical;
  if (vSizing === 'FILL') {
    result.height = '100%';
    hasValue = true;
  } else if (vSizing === 'HUG') {
    result.height = 'fit-content';
    hasValue = true;
  } else if (vSizing === 'FIXED' && node.height) {
    result.height = pxOrZero(node.height);
    hasValue = true;
  }

  const minW = px(node.minWidth);
  if (minW) { result.minWidth = minW; hasValue = true; }

  const maxW = px(node.maxWidth);
  if (maxW) { result.maxWidth = maxW; hasValue = true; }

  const minH = px(node.minHeight);
  if (minH) { result.minHeight = minH; hasValue = true; }

  const maxH = px(node.maxHeight);
  if (maxH) { result.maxHeight = maxH; hasValue = true; }

  if (node.clipsContent) {
    result.overflow = 'hidden';
    hasValue = true;
  }

  if (!hasValue) return undefined;

  result.isActive = true;
  return result;
}

function mapAbsoluteLayout(node: FigmaNode): {
  sizing?: SizingDesign;
  positioning?: PositioningDesign;
} {
  const result: {
    sizing?: SizingDesign;
    positioning?: PositioningDesign;
  } = {};

  result.positioning = {
    isActive: true,
    position: 'absolute',
    top: pxOrZero(node.y),
    left: pxOrZero(node.x),
  };

  const sizing: SizingDesign = {
    isActive: true,
    width: pxOrZero(node.width),
    height: pxOrZero(node.height),
  };

  const minW = px(node.minWidth);
  if (minW) sizing.minWidth = minW;

  const maxW = px(node.maxWidth);
  if (maxW) sizing.maxWidth = maxW;

  const minH = px(node.minHeight);
  if (minH) sizing.minHeight = minH;

  const maxH = px(node.maxHeight);
  if (maxH) sizing.maxHeight = maxH;

  if (node.clipsContent) sizing.overflow = 'hidden';

  result.sizing = sizing;
  return result;
}
