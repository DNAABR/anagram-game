import { describe, it, expect } from "vitest";
import { validateWord, calculateScore, scrambleWord } from "./dictionary";

describe("Word Validation & Scoring Tests", () => {
  
  // Mock dictionary with a few select words
  const mockDict = new Set(["CAT", "DOG", "JANE", "JEAN", "MAGIC", "SPELL"]);

  describe("validateWord", () => {
    it("should validate correct words formed from board letters", () => {
      const board = ["C", "A", "T", "D", "O", "G", "X", "Y", "Z"];
      expect(validateWord("CAT", board, mockDict)).toBe(true);
      expect(validateWord("DOG", board, mockDict)).toBe(true);
    });

    it("should reject words not in the dictionary", () => {
      const board = ["C", "A", "T", "D", "O", "G", "X", "Y", "Z"];
      expect(validateWord("TAG", board, mockDict)).toBe(false); // TAG is not in mockDict
    });

    it("should reject words that cannot be formed from board letters", () => {
      const board = ["C", "A", "X", "D", "O", "G", "X", "Y", "Z"]; // No 'T'
      expect(validateWord("CAT", board, mockDict)).toBe(false);
    });

    it("should reject words that use more occurrences of a letter than available on the board", () => {
      const board = ["C", "A", "T", "D", "O", "G", "X", "Y", "Z"]; // Only one 'A'
      const customDict = new Set(["CAT", "CAAT"]);
      expect(validateWord("CAT", board, customDict)).toBe(true);
      expect(validateWord("CAAT", board, customDict)).toBe(false); // Requires two 'A's
    });
  });

  describe("calculateScore", () => {
    it("should score a basic word with no multipliers (1 pt per letter)", () => {
      const board = ["C", "A", "T", "X", "Y", "Z", "W", "Q", "P"];
      const multipliers = { x2: -1, x3: -1 };
      
      // CAT = 3 letters, all 1 pt each
      expect(calculateScore("CAT", board, multipliers)).toBe(3);
    });

    it("should apply x2 multiplier correctly", () => {
      const board = ["C", "A", "T", "X", "Y", "Z", "W", "Q", "P"];
      // Let's set 'A' (index 1) to be x2
      const multipliers = { x2: 1, x3: -1 };
      
      // CAT = C(1) + A(2) + T(1) = 4
      expect(calculateScore("CAT", board, multipliers)).toBe(4);
    });

    it("should apply x3 multiplier correctly", () => {
      const board = ["C", "A", "T", "X", "Y", "Z", "W", "Q", "P"];
      // Let's set 'C' (index 0) to be x3
      const multipliers = { x2: -1, x3: 0 };
      
      // CAT = C(3) + A(1) + T(1) = 5
      expect(calculateScore("CAT", board, multipliers)).toBe(5);
    });

    it("should apply both x2 and x3 multipliers if both letters are used", () => {
      const board = ["C", "A", "T", "X", "Y", "Z", "W", "Q", "P"];
      const multipliers = { x2: 1, x3: 0 }; // A is x2, C is x3
      
      // CAT = C(3) + A(2) + T(1) = 6
      expect(calculateScore("CAT", board, multipliers)).toBe(6);
    });

    it("should optimize scoring by picking the highest multiplier tile when duplicate letters are on board", () => {
      const board = ["A", "A", "T", "X", "Y", "Z", "W", "Q", "P"];
      // Two 'A's at index 0 and 1. Index 0 has x3 multiplier, index 1 is normal.
      const multipliers = { x2: -1, x3: 0 };
      
      // If we play 'AT' = A(3) + T(1) = 4 (optimizes by picking index 0 over index 1)
      expect(calculateScore("AT", board, multipliers)).toBe(4);
    });
  });

  describe("scrambleWord", () => {
    it("should generate a valid anagram of the input word", () => {
      const original = "DEVELOPMENT";
      const scrambled = scrambleWord(original);
      
      expect(scrambled.length).toBe(original.length);
      expect(scrambled.split("").sort().join("")).toBe(original.split("").sort().join(""));
      expect(scrambled).not.toBe(original);
    });
  });
});
