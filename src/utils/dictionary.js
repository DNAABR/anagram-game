// Dictionary & Scoring Utilities

// Curated 11-letter conundrum words — pre-validated, deduplicated
export const CONUNDRUMS = [
  "DEVELOPMENT", "INFORMATION", "CELEBRATION", "MATHEMATICS", "ENVIRONMENT",
  "TEMPERATURE", "GRANDMOTHER", "ALTERNATIVE", "APPLICATION", "INDEPENDENT",
  "TRANSLATION", "COOPERATION", "DECLARATION", "EXAMINATION", "PERFORMANCE",
  "PERSONALITY", "POSSIBILITY", "PREPARATION", "REPLACEMENT", "RESPONSIBLE",
  "SIGNIFICANT", "SUPERMARKET", "UNDERSTANDS", "AGRICULTURE", "APPOINTMENT",
  "CERTIFICATE", "INTERACTION", "MEASUREMENT", "OBSERVATION", "DESTRUCTION",
  "EXPLANATION", "IMPROVEMENT", "INSTRUCTION", "ASSOCIATION", "COMBINATION",
  "COMPETITION", "DESCRIPTION", "ADVERTISING", "ACQUISITION", "IMMEDIATELY",
  "LEGISLATION", "METHODOLOGY", "TRANSPORTER", "WONDERFULLY", "CONSEQUENCE",
  "DIFFERENCES", "EXPERIENCED", "ILLUSTRATED", "IMAGINATION", "INDIVIDUALS",
  "INHERITANCE", "INTELLIGENT", "INTERESTING", "OPPORTUNITY", "PARTICIPATE",
  "PROBABILITY", "RECOGNITION", "RECOMMENDED", "REPRESENTED", "SPECTACULAR",
  "PUBLICATION", "RESERVATION", "RESTORATION", "EXPECTATION",
];

// Scramble helper
export const scrambleWord = (word) => {
  const arr = word.split('');
  let scrambled;
  // Fisher-Yates Shuffle with a check to make sure it's not the original word
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join('');
  } while (scrambled === word && arr.length > 1);
  return scrambled;
};

// Async dictionary loader
let cachedDictionary = null;
let cachedDictionaryIndex = null;

export const loadDictionary = async () => {
  if (cachedDictionary) return cachedDictionary;

  try {
    const response = await fetch('/words.txt');
    if (!response.ok) {
      throw new Error("Failed to fetch words.txt");
    }
    const text = await response.text();
    const wordsArray = text.split(/\r?\n/);
    const dictSet = new Set(wordsArray.map(w => w.trim().toUpperCase()));
    cachedDictionary = dictSet;
    cachedDictionaryIndex = buildDictionaryIndex(dictSet);
    return dictSet;
  } catch (error) {
    console.error("Error loading dictionary:", error);
    // Return empty set as fallback so the app doesn't crash
    return new Set();
  }
};

/**
 * Pre-indexes dictionary words by length for fast bot lookup (C1 fix)
 * @param {Set<string>} dictSet
 * @returns {Object} Map of length -> word array, e.g. { 3: ["CAT",...], 4: ["DOGS",...] }
 */
export const buildDictionaryIndex = (dictSet) => {
  const byLength = {};
  for (const word of dictSet) {
    const len = word.length;
    if (len < 3 || len > 9) continue;
    if (!byLength[len]) byLength[len] = [];
    byLength[len].push(word);
  }
  return byLength;
};

export const getDictionaryIndex = () => cachedDictionaryIndex;

/**
 * Checks if a word is valid and can be formed from the board letters
 * @param {string} word - The candidate word (uppercase)
 * @param {string[]} boardLetters - Array of 9 letters on the board
 * @param {Set<string>} dictSet - The loaded dictionary set
 * @returns {boolean}
 */
export const validateWord = (word, boardLetters, dictSet) => {
  const cleanWord = word.trim().toUpperCase();
  if (cleanWord.length < 2) return false;

  // 1. Check if word is in the dictionary
  if (dictSet && !dictSet.has(cleanWord)) {
    return false;
  }

  // 2. Check if the word can be made from the board letters (count-map approach — O(n))
  const boardCount = {};
  for (const l of boardLetters) boardCount[l] = (boardCount[l] || 0) + 1;

  for (const char of cleanWord) {
    if (!boardCount[char] || boardCount[char] <= 0) return false;
    boardCount[char]--;
  }

  return true;
};

/**
 * Calculates the optimal score for a word based on board multiplier indices
 * @param {string} word - The uppercase word
 * @param {string[]} boardLetters - Array of 9 board letters
 * @param {object} multipliers - { x2: number | null, x3: number | null } representing board indices
 * @returns {number} Optimal score
 */
export const calculateScore = (word, boardLetters, multipliers) => {
  const cleanWord = word.trim().toUpperCase();
  if (cleanWord.length === 0) return 0;

  // Build the tile values pool
  // By default, every board index is worth 1 point.
  // We apply x2 and x3 multipliers at the specific indices.
  const tilesPool = boardLetters.map((letter, idx) => {
    let value = 1;
    if (multipliers) {
      if (idx === multipliers.x2) value = 2;
      else if (idx === multipliers.x3) value = 3;
    }
    return { letter, value };
  });

  let score = 0;
  
  // Greedy matching: for each letter in the word, grab the highest-value tile from the pool
  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];
    
    // Find all matching tiles
    let bestTileIdx = -1;
    let maxVal = -1;
    
    for (let j = 0; j < tilesPool.length; j++) {
      if (tilesPool[j] && tilesPool[j].letter === char) {
        if (tilesPool[j].value > maxVal) {
          maxVal = tilesPool[j].value;
          bestTileIdx = j;
        }
      }
    }
    
    if (bestTileIdx !== -1) {
      score += maxVal;
      // Consume the tile by setting to null
      tilesPool[bestTileIdx] = null;
    } else {
      // Letter not available (should be caught by validateWord, but return 0 as safety)
      return 0;
    }
  }

  return score;
};
