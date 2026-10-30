export interface ScriptChunk {
  id: string;
  type: 'vip_greeting' | 'text';
  tag?: string;
  tagIndex?: number;
  text?: string;
}

export function parseRawSpeechWithTags(rawText: string): { chunks: ScriptChunk[]; allTags: string[] } {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const chunks: ScriptChunk[] = [];
  const tagsSet: string[] = [];

  let currentTag = 'บทนำ';
  let chunkCount = 1;

  for (const line of lines) {
    const tagMatch = line.match(/^<(.+?)>$/);
    if (tagMatch) {
      currentTag = tagMatch[1];
      if (!tagsSet.includes(currentTag)) {
        tagsSet.push(currentTag);
      }
    } else {
      if (!tagsSet.includes(currentTag)) {
        tagsSet.push(currentTag);
      }
      chunks.push({
        id: `chunk-${chunkCount++}`,
        type: 'text',
        tag: currentTag,
        tagIndex: tagsSet.indexOf(currentTag),
        text: line,
      });
    }
  }

  return { chunks, allTags: tagsSet };
}