import type { BackgroundsDesign, BordersDesign, EffectsDesign } from '@/types';
import type { FigmaNode, FigmaColor, FigmaFill, FigmaColorStop } from '@/lib/figma/types';

export function figmaColorToRgba(color: FigmaColor, paintOpacity?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round((color.a ?? 1) * (paintOpacity ?? 1) * 100) / 100;

  if (a >= 1) {
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return hex;
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function px(value: number | undefined | null): string | undefined {
  if (value == null) return undefined;
  return `${Math.round(value * 100) / 100}px`;
}

function gradientAngleFromTransform(transform?: number[][]): number {
  if (!transform || transform.length < 2) return 180;
  const angle = Math.round(
    (Math.atan2(transform[0][1], transform[0][0]) * 180) / Math.PI + 90
  );
  return ((angle % 360) + 360) % 360;
}

function buildGradientStops(stops: FigmaColorStop[], paintOpacity: number): string {
  return stops
    .map((s) => {
      const color = figmaColorToRgba(s.color, paintOpacity);
      const pos = Math.round(s.position * 10000) / 100;
      return `${color} ${pos}%`;
    })
    .join(', ');
}

function mapBackgrounds(fills: FigmaFill[]): BackgroundsDesign | undefined {
  const visibleFills = fills.filter((f) => f.visible && f.type !== 'IMAGE');
  if (visibleFills.length === 0) return undefined;

  const result: BackgroundsDesign = { isActive: true };

  const solidFill = visibleFills.find((f) => f.type === 'SOLID' && f.color);
  if (solidFill && solidFill.color) {
    result.backgroundColor = figmaColorToRgba(solidFill.color, solidFill.opacity);
  }

  const gradients: string[] = [];

  for (const fill of visibleFills) {
    if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops?.length) {
      const angle = gradientAngleFromTransform(fill.gradientTransform);
      const stops = buildGradientStops(fill.gradientStops, fill.opacity);
      gradients.push(`linear-gradient(${angle}deg, ${stops})`);
    } else if (fill.type === 'GRADIENT_RADIAL' && fill.gradientStops?.length) {
      const stops = buildGradientStops(fill.gradientStops, fill.opacity);
      gradients.push(`radial-gradient(circle, ${stops})`);
    } else if (fill.type === 'GRADIENT_ANGULAR' && fill.gradientStops?.length) {
      const stops = buildGradientStops(fill.gradientStops, fill.opacity);
      gradients.push(`conic-gradient(${stops})`);
    }
  }

  if (gradients.length > 0) {
    result.backgroundImage = gradients.join(', ');
  }

  return result;
}

function mapBorders(node: FigmaNode): BordersDesign | undefined {
  const result: BordersDesign = {};
  let hasValue = false;

  const visibleStroke = node.strokes.find((s) => s.visible && s.color);
  if (visibleStroke && visibleStroke.color) {
    result.borderColor = figmaColorToRgba(visibleStroke.color, visibleStroke.opacity);
    result.borderStyle = 'solid';
    hasValue = true;
  }

  if (node.individualStrokeWeights) {
    const w = node.individualStrokeWeights;
    result.borderTopWidth = px(w.top);
    result.borderRightWidth = px(w.right);
    result.borderBottomWidth = px(w.bottom);
    result.borderLeftWidth = px(w.left);
    result.borderWidthMode = 'individual';
    hasValue = true;
  } else if (node.strokeWeight) {
    result.borderWidth = px(node.strokeWeight);
    result.borderWidthMode = 'all';
    hasValue = true;
  }

  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    const allEqual = tl === tr && tr === br && br === bl;
    if (allEqual) {
      const r = px(tl);
      if (r) { result.borderRadius = r; hasValue = true; }
    } else {
      result.borderTopLeftRadius = px(tl);
      result.borderTopRightRadius = px(tr);
      result.borderBottomRightRadius = px(br);
      result.borderBottomLeftRadius = px(bl);
      result.borderRadiusMode = 'individual';
      hasValue = true;
    }
  } else if (node.cornerRadius) {
    result.borderRadius = px(node.cornerRadius);
    hasValue = true;
  }

  if (!hasValue) return undefined;

  result.isActive = true;
  return result;
}

function mapEffects(effects: FigmaNode['effects']): EffectsDesign | undefined {
  const visible = effects.filter((e) => e.visible);
  if (visible.length === 0) return undefined;

  const result: EffectsDesign = {};
  let hasValue = false;

  const shadows: string[] = [];

  for (const effect of visible) {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const x = effect.offset?.x ?? 0;
      const y = effect.offset?.y ?? 0;
      const r = effect.radius ?? 0;
      const s = effect.spread ?? 0;
      const color = effect.color
        ? figmaColorToRgba(effect.color)
        : 'rgba(0, 0, 0, 0.25)';
      const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
      shadows.push(`${inset}${x}px ${y}px ${r}px ${s}px ${color}`);
    } else if (effect.type === 'LAYER_BLUR') {
      result.blur = px(effect.radius);
      hasValue = true;
    } else if (effect.type === 'BACKGROUND_BLUR') {
      result.backdropBlur = px(effect.radius);
      hasValue = true;
    }
  }

  if (shadows.length > 0) {
    result.boxShadow = shadows.join(', ');
    hasValue = true;
  }

  if (!hasValue) return undefined;

  result.isActive = true;
  return result;
}

export function mapDesign(node: FigmaNode): {
  backgrounds?: BackgroundsDesign;
  borders?: BordersDesign;
  effects?: EffectsDesign;
} {
  const result: {
    backgrounds?: BackgroundsDesign;
    borders?: BordersDesign;
    effects?: EffectsDesign;
  } = {};

  if (node.fills?.length) {
    result.backgrounds = mapBackgrounds(node.fills);
  }

  result.borders = mapBorders(node);

  if (node.effects?.length) {
    result.effects = mapEffects(node.effects);
  }

  return result;
}
