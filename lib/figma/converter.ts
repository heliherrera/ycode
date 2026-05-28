'use client';

import type { Layer, DesignProperties } from '@/types';
import type { YcodeFigmaPayload, FigmaNode, FigmaNodeType } from '@/lib/figma/types';
import { generateId } from '@/lib/utils';
import { designToClassString } from '@/lib/tailwind-class-mapper';
import { mapLayout } from '@/lib/figma/layout-mapper';
import { mapDesign } from '@/lib/figma/design-mapper';
import { mapText } from '@/lib/figma/text-mapper';
import { uploadFigmaImage, uploadFigmaSvg } from '@/lib/figma/image-handler';

const CONTAINER_TYPES: Set<FigmaNodeType> = new Set([
  'FRAME', 'GROUP', 'SECTION', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
]);

const VECTOR_TYPES: Set<FigmaNodeType> = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'STAR', 'REGULAR_POLYGON',
]);

function getLayerName(node: FigmaNode): string {
  if (node.type === 'TEXT') return 'text';
  return 'div';
}

function sanitizeCustomName(name: string): string {
  return name.trim().slice(0, 100);
}

async function convertNode(node: FigmaNode): Promise<Layer> {
  const id = generateId('lyr');
  const design: DesignProperties = {};

  const { layout, spacing, sizing, positioning } = mapLayout(node);
  if (layout) design.layout = layout;
  if (spacing) design.spacing = spacing;
  if (sizing) design.sizing = sizing;
  if (positioning) design.positioning = positioning;

  const { backgrounds, borders, effects } = mapDesign(node);
  if (backgrounds) design.backgrounds = backgrounds;
  if (borders) design.borders = borders;
  if (effects) design.effects = effects;

  if (node.opacity < 1) {
    design.effects = {
      ...design.effects,
      isActive: true,
      opacity: String(Math.round(node.opacity * 100) / 100),
    };
  }

  const layerName = getLayerName(node);
  const layer: Layer = {
    id,
    name: layerName,
    customName: sanitizeCustomName(node.name),
    classes: '',
    design,
  };

  if (node.type === 'TEXT' && node.text) {
    const { typography, tiptapContent } = mapText(node.text);
    design.typography = typography;
    layer.variables = {
      text: {
        type: 'dynamic_rich_text',
        data: { content: tiptapContent },
      },
    };
    layer.restrictions = { editText: true };
  }

  if (node.imageData) {
    const filename = `${node.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    const assetId = await uploadFigmaImage(node.imageData, filename);

    if (assetId) {
      const hasImageFill = node.fills.some((f) => f.type === 'IMAGE' && f.visible);
      if (hasImageFill || VECTOR_TYPES.has(node.type)) {
        layer.name = 'image';
        layer.variables = {
          ...layer.variables,
          image: {
            src: { type: 'asset', data: { asset_id: assetId } },
            alt: { type: 'dynamic_text', data: { content: node.name } },
          },
        };
      } else {
        layer.variables = {
          ...layer.variables,
          backgroundImage: {
            src: { type: 'asset', data: { asset_id: assetId } },
          },
        };
      }
    }
  }

  if (node.svgData) {
    const filename = `${node.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
    const assetId = await uploadFigmaSvg(node.svgData, filename);

    if (assetId) {
      layer.name = 'image';
      layer.variables = {
        ...layer.variables,
        image: {
          src: { type: 'asset', data: { asset_id: assetId } },
          alt: { type: 'dynamic_text', data: { content: node.name } },
        },
      };
    }
  }

  if (CONTAINER_TYPES.has(node.type) || node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
    layer.children = [];
    if (node.children?.length) {
      const childLayers = await Promise.all(node.children.map(convertNode));
      layer.children = childLayers;
    }
  }

  layer.classes = designToClassString(design);

  if (!node.visible) {
    layer.settings = { ...layer.settings, hidden: true };
  }

  return layer;
}

export async function convertFigmaToLayers(payload: YcodeFigmaPayload): Promise<Layer[]> {
  return Promise.all(payload.nodes.map(convertNode));
}
