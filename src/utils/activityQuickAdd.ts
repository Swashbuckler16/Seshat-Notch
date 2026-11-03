/** Plain-language activity commands. Task syntax remains handled by quickAddParser. */
export function parseActivityCommand(input: string): { action: 'tick' | 'create'; title: string } | null {
  const match = /^(tick|activity)\s+(.+)$/i.exec(input.trim());
  return match ? { action: match[1].toLowerCase() === 'tick' ? 'tick' : 'create', title: match[2].trim() } : null;
}
