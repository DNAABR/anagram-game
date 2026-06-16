// Dictionary & Scoring Utilities

// Curated 11-letter conundrum words (must be exactly 11 letters, common, and solvable)
export const CONUNDRUMS = [
  "DEVELOPMENT", "INFORMATION", "CELEBRATION", "MATHEMATICS", "ENVIRONMENT",
  "TEMPERATURE", "GRANDMOTHER", "ALTERNATIVE", "APPLICATION", "INDEPENDENT",
  "TRANSLATION", "COOPERATION", "DECLARATION", "EXAMINATION", "PERFORMANCE",
  "PERSONALITY", "POSSIBILITY", "PREPARATION", "REPLACEMENT", "RESPONSIBLE",
  "SIGNIFICANT", "SUPERMARKET", "UNDERSTANDS", "AGRICULTURE", "APPOINTMENT",
  "CERTIFICATE", "INTERACTION", "MEASUREMENT", "OBSERVATION", "DESTRUCTION",
  "EXPLANATION", "IMPROVEMENT", "INSTRUCTION", "ASSOCIATION", "COMBINATION",
  "COMPETITION", "DESCRIPTION", "ADVERTISING", "ACQUISITION", "IMMEDIATELY",
  "LEGISLATION", "METHODOLOGY", "TRANSPORTER", "WONDERFULLY", "ACCOMPLISH",
  "ALTERNATIVE", "CONSEQUENCE", "CONTRIBUTE", "DIFFERENCES", "EXPERIENCED",
  "GOVERNMENTAL", "ILLUSTRATED", "IMAGINATION", "IMMEDIATELY", "IMPORTANCE",
  "INDIVIDUALS", "INFORMATION", "INHERITANCE", "INTELLIGENT", "INTERESTING",
  "LEGISLATION", "MATHEMATICS", "NEIGHBORHOOD", "OBSERVATION", "OPPORTUNITY",
  "PARTICIPATE", "PREPARATION", "PROBABILITY", "RECOGNITION", "RECOMMENDED",
  "REPRESENTED", "REQUIREMENTS", "RESPONSIBLE", "SIGNIFICANT", "SPECTACULAR",
  "STRAIGHTEN", "SUCCESSFULLY", "SUPERMARKET", "TEMPERATURE", "TRANSLATION",
  "UNDERSTANDS", "WONDERFULLY", "REVOLUTION", "PUBLICATION", "LEGISLATION",
  "RESERVATION", "RESTORATION", "DISTRIBUTION", "CONTRIBUTION", "COMBINATION",
  "EXPECTATION", "APPLICATION", "PREPARATION", "CELEBRATION", "EXAMINATION"
].map(w => w.toUpperCase()).filter(w => w.length === 11);

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
    console.log(`Loaded ${dictSet.size} words into dictionary cache.`);
    return dictSet;
  } catch (error) {
    console.error("Error loading dictionary:", error);
    // Return empty set as fallback so the app doesn't crash
    return new Set();
  }
};

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

  // 2. Check if the word can be made from the board letters
  const lettersPool = [...boardLetters];
  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];
    const idx = lettersPool.indexOf(char);
    if (idx === -1) return false; // Letter not on board or used too many times
    lettersPool.splice(idx, 1);
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
