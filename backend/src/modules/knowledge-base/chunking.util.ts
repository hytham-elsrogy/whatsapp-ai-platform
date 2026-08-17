const TARGET_TOKENS_PER_CHUNK = 500;
// No tokenizer dependency — approximate 1 token ≈ 0.75 words, which is
// close enough for chunk sizing (not billing).
const WORDS_PER_CHUNK = Math.round(TARGET_TOKENS_PER_CHUNK * 0.75);

/** Splits text into paragraphs, then greedily packs paragraphs into ~500-token chunks. */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const paragraph of paragraphs) {
    const wordCount = paragraph.split(/\s+/).filter(Boolean).length;

    if (currentWords > 0 && currentWords + wordCount > WORDS_PER_CHUNK) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentWords = 0;
    }

    current.push(paragraph);
    currentWords += wordCount;
  }
  if (current.length) chunks.push(current.join('\n\n'));

  return chunks;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75);
}
