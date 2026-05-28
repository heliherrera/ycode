'use client';

/**
 * Figma Paste Hook
 *
 * Intercepts paste events to detect Figma plugin clipboard data.
 * When detected, converts the Figma payload into Ycode layers and
 * inserts them into the current page. Falls through to the normal
 * paste handler when no Figma data is present.
 */

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { YCODE_FIGMA_SIGNATURE, isYcodeFigmaPayload } from '@/lib/figma/types';
import type { YcodeFigmaPayload } from '@/lib/figma/types';
import type { Layer } from '@/types';

interface UseFigmaPasteOptions {
  enabled: boolean;
  currentPageId: string | null;
  selectedLayerId: string | null;
  editingComponentId: string | null;
  insertLayers: (layers: Layer[]) => void;
}

function extractFigmaPayload(clipboardData: DataTransfer): YcodeFigmaPayload | null {
  const html = clipboardData.getData('text/html');
  if (!html) return null;

  // The Figma plugin wraps the JSON in a hidden div with a data attribute
  const match = html.match(/data-ycode-figma="([^"]*)"/);
  if (match?.[1]) {
    try {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (isYcodeFigmaPayload(parsed)) return parsed;
    } catch { /* not valid */ }
  }

  // Fallback: check text/plain for raw JSON payload
  const text = clipboardData.getData('text/plain');
  if (text?.includes(YCODE_FIGMA_SIGNATURE)) {
    try {
      const parsed = JSON.parse(text);
      if (isYcodeFigmaPayload(parsed)) return parsed;
    } catch { /* not valid */ }
  }

  return null;
}

export function useFigmaPaste({
  enabled,
  currentPageId,
  selectedLayerId,
  editingComponentId,
  insertLayers,
}: UseFigmaPasteOptions) {
  const isProcessingRef = useRef(false);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!enabled || isProcessingRef.current) return;
    if (!currentPageId && !editingComponentId) return;
    if (!e.clipboardData) return;

    const payload = extractFigmaPayload(e.clipboardData);
    if (!payload) return;

    e.preventDefault();
    e.stopPropagation();
    isProcessingRef.current = true;

    const nodeCount = payload.nodes.length;
    const toastId = toast.loading(
      `Importing ${nodeCount} layer${nodeCount !== 1 ? 's' : ''} from Figma...`
    );

    try {
      const { convertFigmaToLayers } = await import('@/lib/figma/converter');
      const layers = await convertFigmaToLayers(payload);

      if (layers.length === 0) {
        toast.error('No valid layers found in Figma data', { id: toastId });
        return;
      }

      insertLayers(layers);

      toast.success(
        `Imported ${layers.length} layer${layers.length !== 1 ? 's' : ''} from Figma`,
        { id: toastId }
      );
    } catch (error) {
      console.error('Figma import failed:', error);
      toast.error('Failed to import from Figma', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [enabled, currentPageId, editingComponentId, insertLayers]);

  useEffect(() => {
    if (!enabled) return;

    // Use capture phase to intercept before the normal paste handler
    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, [enabled, handlePaste]);
}
