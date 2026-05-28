import type { TypographyDesign } from '@/types';
import type { FigmaTextData, FigmaTextStyle, FigmaTextStyleOverride, FigmaFill } from '@/lib/figma/types';
import { figmaColorToRgba } from '@/lib/figma/design-mapper';

interface TipTapMark {
  type: string;
}

interface TipTapTextNode {
  type: 'text';
  text: string;
  marks?: TipTapMark[];
}

interface TipTapParagraph {
  type: 'paragraph';
  content?: TipTapTextNode[];
}

interface TipTapDoc {
  type: 'doc';
  content: TipTapParagraph[];
}

function getTextColor(fills: FigmaFill[]): string | undefined {
  const solidFill = fills.find((f) => f.visible && f.type === 'SOLID' && f.color);
  if (!solidFill || !solidFill.color) return undefined;
  return figmaColorToRgba(solidFill.color, solidFill.opacity);
}

function mapFontWeight(weight: number): string {
  return String(weight);
}

function mapLineHeight(lh?: FigmaTextStyle['lineHeight']): string | undefined {
  if (!lh || lh.unit === 'AUTO') return undefined;
  if (lh.unit === 'PIXELS') return `${Math.round(lh.value * 100) / 100}px`;
  if (lh.unit === 'PERCENT') return String(Math.round(lh.value) / 100);
  return undefined;
}

function mapLetterSpacing(ls?: FigmaTextStyle['letterSpacing']): string | undefined {
  if (!ls || ls.value === 0) return undefined;
  if (ls.unit === 'PIXELS') return `${Math.round(ls.value * 100) / 100}px`;
  if (ls.unit === 'PERCENT') return `${Math.round(ls.value / 100 * 100) / 100}em`;
  return undefined;
}

function mapTextAlign(align: FigmaTextStyle['textAlignHorizontal']): string | undefined {
  const map: Record<string, string> = {
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right',
    JUSTIFIED: 'justify',
  };
  return map[align];
}

function mapTextDecoration(dec: FigmaTextStyle['textDecoration']): string | undefined {
  if (dec === 'UNDERLINE') return 'underline';
  if (dec === 'STRIKETHROUGH') return 'line-through';
  return undefined;
}

function mapTextCase(tc: FigmaTextStyle['textCase']): string | undefined {
  const map: Record<string, string> = {
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
  };
  return map[tc];
}

function mapTypography(style: FigmaTextStyle): TypographyDesign {
  const result: TypographyDesign = { isActive: true };

  if (style.fontFamily) result.fontFamily = `"${style.fontFamily}"`;
  result.fontWeight = mapFontWeight(style.fontWeight);
  result.fontSize = `${style.fontSize}px`;

  const lh = mapLineHeight(style.lineHeight);
  if (lh) result.lineHeight = lh;

  const ls = mapLetterSpacing(style.letterSpacing);
  if (ls) result.letterSpacing = ls;

  const ta = mapTextAlign(style.textAlignHorizontal);
  if (ta) result.textAlign = ta;

  const td = mapTextDecoration(style.textDecoration);
  if (td) result.textDecoration = td;

  const tc = mapTextCase(style.textCase);
  if (tc) result.textTransform = tc;

  const color = getTextColor(style.fills);
  if (color) result.color = color;

  return result;
}

function buildMarks(style: Partial<FigmaTextStyle>, baseStyle: FigmaTextStyle): TipTapMark[] {
  const marks: TipTapMark[] = [];

  const weight = style.fontWeight ?? baseStyle.fontWeight;
  if (weight >= 700) marks.push({ type: 'bold' });

  const dec = style.textDecoration ?? baseStyle.textDecoration;
  if (dec === 'UNDERLINE') marks.push({ type: 'underline' });
  if (dec === 'STRIKETHROUGH') marks.push({ type: 'strike' });

  return marks;
}

function textToParagraphs(text: string, marks: TipTapMark[]): TipTapParagraph[] {
  const lines = text.split('\n');
  return lines.map((line) => {
    if (line.length === 0) return { type: 'paragraph' as const };
    const textNode: TipTapTextNode = { type: 'text', text: line };
    if (marks.length > 0) textNode.marks = marks;
    return { type: 'paragraph' as const, content: [textNode] };
  });
}

function buildTipTapContent(textData: FigmaTextData): TipTapDoc {
  const { characters, style, styleOverrides } = textData;

  if (!styleOverrides || styleOverrides.length === 0) {
    return {
      type: 'doc',
      content: textToParagraphs(characters, buildMarks(style, style)),
    };
  }

  return buildOverriddenContent(characters, style, styleOverrides);
}

function buildOverriddenContent(
  characters: string,
  baseStyle: FigmaTextStyle,
  overrides: FigmaTextStyleOverride[],
): TipTapDoc {
  const segments = splitByOverrides(characters, overrides, baseStyle);
  const paragraphs: TipTapParagraph[] = [];
  let currentNodes: TipTapTextNode[] = [];

  for (const segment of segments) {
    const lines = segment.text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        paragraphs.push({
          type: 'paragraph',
          content: currentNodes.length > 0 ? currentNodes : undefined,
        });
        currentNodes = [];
      }

      const line = lines[i];
      if (line.length > 0) {
        const node: TipTapTextNode = { type: 'text', text: line };
        if (segment.marks.length > 0) node.marks = segment.marks;
        currentNodes.push(node);
      }
    }
  }

  paragraphs.push({
    type: 'paragraph',
    content: currentNodes.length > 0 ? currentNodes : undefined,
  });

  return { type: 'doc', content: paragraphs };
}

interface TextSegment {
  text: string;
  marks: TipTapMark[];
}

function splitByOverrides(
  characters: string,
  overrides: FigmaTextStyleOverride[],
  baseStyle: FigmaTextStyle,
): TextSegment[] {
  const sorted = [...overrides].sort((a, b) => a.start - b.start);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const override of sorted) {
    if (override.start > cursor) {
      segments.push({
        text: characters.slice(cursor, override.start),
        marks: buildMarks(baseStyle, baseStyle),
      });
    }

    segments.push({
      text: characters.slice(override.start, override.end),
      marks: buildMarks(override.style, baseStyle),
    });

    cursor = override.end;
  }

  if (cursor < characters.length) {
    segments.push({
      text: characters.slice(cursor),
      marks: buildMarks(baseStyle, baseStyle),
    });
  }

  return segments;
}

export function mapText(textData: FigmaTextData): {
  typography: TypographyDesign;
  tiptapContent: object;
} {
  return {
    typography: mapTypography(textData.style),
    tiptapContent: buildTipTapContent(textData),
  };
}
