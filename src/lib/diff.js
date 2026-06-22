/**
 * Lightweight word-level diffing to highlight additions.
 * Returns an array of tokens: { text: string, added: boolean }
 */
export function diffPrompt(original, optimized) {
  const origWords = original.split(/(\s+)/);
  const optWords = optimized.split(/(\s+)/);

  const dp = Array(origWords.length + 1)
    .fill(null)
    .map(() => Array(optWords.length + 1).fill(0));

  for (let i = 1; i <= origWords.length; i++) {
    for (let j = 1; j <= optWords.length; j++) {
      if (origWords[i - 1] === optWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result = [];
  let i = origWords.length;
  let j = optWords.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === optWords[j - 1]) {
      result.unshift({ text: origWords[i - 1], added: false });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // It was added in optimized
      result.unshift({ text: optWords[j - 1], added: true });
      j--;
    } else {
      // It was removed from original, we ignore removals as we only display optimized additions
      i--;
    }
  }

  // Merge consecutive segments of same type to clean up the output
  const merged = [];
  for (const token of result) {
    if (merged.length > 0 && merged[merged.length - 1].added === token.added) {
      merged[merged.length - 1].text += token.text;
    } else {
      merged.push({ ...token });
    }
  }

  return merged;
}
