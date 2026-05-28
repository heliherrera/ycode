/**
 * Figma → Ycode Clipboard Data Contract
 *
 * Shared types that define the JSON payload the Figma plugin writes
 * to the clipboard and the Ycode builder reads on paste.
 */

// ─── Clipboard Envelope ─────────────────────────────────────────────────────

export const YCODE_FIGMA_SIGNATURE = '__ycode_figma__';

export interface YcodeFigmaPayload {
  signature: typeof YCODE_FIGMA_SIGNATURE;
  version: 1;
  source: 'figma-plugin';
  nodes: FigmaNode[];
}

// ─── Node Tree ───────────────────────────────────────────────────────────────

export type FigmaNodeType =
  | 'FRAME'
  | 'GROUP'
  | 'SECTION'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'STAR'
  | 'REGULAR_POLYGON'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'TEXT'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'SLICE';

export interface FigmaNode {
  type: FigmaNodeType;
  name: string;
  visible: boolean;

  width: number;
  height: number;
  x: number;
  y: number;

  layout?: FigmaLayout;

  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  layoutGrow?: number;
  layoutAlign?: string;

  fills: FigmaFill[];
  strokes: FigmaStroke[];
  effects: FigmaEffect[];
  opacity: number;
  blendMode?: string;
  clipsContent?: boolean;

  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];

  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  individualStrokeWeights?: FigmaStrokeWeights;

  constraints?: { horizontal: string; vertical: string };

  text?: FigmaTextData;

  imageData?: string;
  svgData?: string;

  minWidth?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;

  children?: FigmaNode[];
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export interface FigmaLayout {
  mode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  primaryAlign: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAlign: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAlignContent?: 'AUTO' | 'SPACE_BETWEEN';
  gap: number;
  counterAxisSpacing?: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  wrap: boolean;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumnCount?: number;
  gridRowCount?: number;
}

// ─── Fills ───────────────────────────────────────────────────────────────────

export type FigmaFillType =
  | 'SOLID'
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'
  | 'IMAGE'
  | 'EMOJI';

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaColorStop {
  position: number;
  color: FigmaColor;
}

export interface FigmaFill {
  type: FigmaFillType;
  visible: boolean;
  opacity: number;
  color?: FigmaColor;
  gradientStops?: FigmaColorStop[];
  gradientTransform?: number[][];
  scaleMode?: string;
  imageHash?: string;
  imageData?: string;
}

// ─── Strokes ─────────────────────────────────────────────────────────────────

export interface FigmaStroke {
  type: FigmaFillType;
  visible: boolean;
  opacity: number;
  color?: FigmaColor;
}

export interface FigmaStrokeWeights {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ─── Effects ─────────────────────────────────────────────────────────────────

export type FigmaEffectType =
  | 'DROP_SHADOW'
  | 'INNER_SHADOW'
  | 'LAYER_BLUR'
  | 'BACKGROUND_BLUR';

export interface FigmaEffect {
  type: FigmaEffectType;
  visible: boolean;
  radius: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

// ─── Text ────────────────────────────────────────────────────────────────────

export interface FigmaTextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  letterSpacing?: { value: number; unit: 'PIXELS' | 'PERCENT' };
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textCase: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  fills: FigmaFill[];
}

export interface FigmaTextStyleOverride {
  start: number;
  end: number;
  style: Partial<FigmaTextStyle>;
}

export interface FigmaTextData {
  characters: string;
  style: FigmaTextStyle;
  styleOverrides?: FigmaTextStyleOverride[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isYcodeFigmaPayload(data: unknown): data is YcodeFigmaPayload {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.signature === YCODE_FIGMA_SIGNATURE &&
    obj.version === 1 &&
    obj.source === 'figma-plugin' &&
    Array.isArray(obj.nodes)
  );
}
