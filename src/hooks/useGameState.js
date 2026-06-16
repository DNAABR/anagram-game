import { useState, useEffect, useRef, useCallback } from "react";
import { 
  listenToRoom, 
  submitLetter, 
  submitAllLetters,
  submitWord, 
  endPlayingPhase,
  advanceToNextRound, 
  solveConundrumGame,
  endConundrumPhaseTimeout,
  leaveRoom,
  isFirebaseConnected
} from "../utils/firebase";
import { playSound } from "../utils/audio";
import { validateWord, calculateScore, CONUNDRUMS, scrambleWord, getDictionaryIndex } from "../utils/dictionary";

// Helper letter banks
const VOWELS = ["A", "E", "I", "O", "U"];
const CONSONANTS = [
  "B", "C", "D", "F", "G", "H", "J", "K", "L", "M", 
  "N", "P", "Q", "R", "S", "T", "V", "W", "X", "Y", "Z"
];

const getRandomLetter = (isVowel) => {
  const bank = isVowel ? VOWELS : CONSONANTS;
  return bank[Math.floor(Math.random() * bank.length)];
};

// Generate random multiplier positions on the board
const generateMultipliers = () => {
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const idx2 = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
  const idx3 = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
  return { x2: idx2, x3: idx3 };
};

// Factory for initial room state to avoid duplication
const createInitialRoom = (roomId, playerId, playerName) => ({
  roomId,
  status: "selecting",
  currentRound: 1,
  picker: playerId,
  pickerName: playerName,
  letters: [],
  multipliers: { x2: -1, x3: -1 },
  timerStart: Date.now(),
  timerDuration: 15,
  conundrumWord: "",
  conundrumSolvedBy: "",
  conundrumSolvedByName: "",
  players: {
    [playerId]: {
      id: playerId, name: playerName, score: 0,
      currentSubmission: "", roundScores: [0,0,0,0,0], roundWords: ["","","","",""]
    },
    "bot": {
      id: "bot", name: "Spellweaver AI", score: 0,
      currentSubmission: "", roundScores: [0,0,0,0,0], roundWords: ["","","","",""]
    }
  }
});

// Bot Helper: Finds valid words using pre-indexed dictionary (by word length)
const getBotWord = (boardLetters, difficulty = "medium") => {
  const dictionaryIndex = getDictionaryIndex();
  if (!dictionaryIndex) return "";

  const boardCount = {};
  boardLetters.forEach(l => boardCount[l] = (boardCount[l] || 0) + 1);

  const validWords = [];

  // Iterate longest-first so hard mode can exit early
  for (let len = 9; len >= 3; len--) {
    const candidates = dictionaryIndex[len];
    if (!candidates) continue;

    for (const word of candidates) {
      const wordCount = {};
      let ok = true;
      for (const char of word) {
        wordCount[char] = (wordCount[char] || 0) + 1;
        if (!boardCount[char] || wordCount[char] > boardCount[char]) {
          ok = false;
          break;
        }
      }
      if (ok) validWords.push(word);
    }

    // Hard mode: stop as soon as we have the longest words
    if (difficulty === "hard" && validWords.length > 0) break;
  }

  if (validWords.length === 0) return "";

  // Already ordered longest-first, pick from appropriate pool
  let pool;
  if (difficulty === "easy") {
    pool = validWords.filter(w => w.length <= 5);
  } else if (difficulty === "medium") {
    pool = validWords.slice(Math.floor(validWords.length * 0.25), Math.floor(validWords.length * 0.7));
  } else {
    pool = validWords.slice(0, Math.max(1, Math.floor(validWords.length * 0.1)));
  }

  if (pool.length === 0) pool = validWords;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const useGameState = (roomId, playerId, playerName, isMultiplayer = false, dictionary = null, botDifficulty = "medium") => {
  const [room, setRoom] = useState(() => {
    if (isMultiplayer && isFirebaseConnected()) return null;
    return createInitialRoom(roomId, playerId, playerName);
  });

  const [timeLeft, setTimeLeft] = useState(0);
  const [localWord, setLocalWord] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [activeIndices, setActiveIndices] = useState([]); // indices on the board used for current local word

  // Keep references for intervals & timers
  const intervalRef = useRef(null);
  const botTimerRef = useRef(null);
  const botSelectionIntervalRef = useRef(null);
  const localStateRef = useRef(null);
  const dictionaryRef = useRef(dictionary);
  const errorTimerRef = useRef(null);

  // Sync state references for async operations
  useEffect(() => {
    localStateRef.current = room;
  }, [room]);
  useEffect(() => {
    dictionaryRef.current = dictionary;
  }, [dictionary]);

  // Clean up error timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Derived picker state to avoid synchronous state triggers
  const isPicker = room?.picker === playerId;

  // M7: Shared helper to evaluate all players' round submissions
  const evaluateRoundSubmissions = useCallback((currentRoom, dict) => {
    const finalPlayers = {};
    const roundIdx = currentRoom.currentRound - 1;
    Object.keys(currentRoom.players).forEach(pId => {
      const p = currentRoom.players[pId];
      const word = p.currentSubmission || "";
      const isValid = validateWord(word, currentRoom.letters, dict);
      const scoreGained = isValid ? calculateScore(word, currentRoom.letters, currentRoom.multipliers) : 0;
      const scores = [...p.roundScores];
      scores[roundIdx] = scoreGained;
      const words = [...p.roundWords];
      words[roundIdx] = isValid ? word : (word ? `(${word})` : "");
      finalPlayers[pId] = { ...p, score: p.score + scoreGained, roundScores: scores, roundWords: words };
    });
    return finalPlayers;
  }, []);

  // Handle phase timeouts
  const handleTimeout = useCallback(() => {
    const currentRoom = localStateRef.current;
    const dict = dictionaryRef.current;
    if (!currentRoom) return;

    if (currentRoom.status === "selecting") {
      // Autocomplete remaining letters
      if (isMultiplayer) {
        if (currentRoom.picker === playerId) {
          const lettersPool = [...currentRoom.letters];
          while (lettersPool.length < 9) {
            const isVowel = Math.random() > 0.45;
            lettersPool.push(getRandomLetter(isVowel));
          }
          submitAllLetters(roomId, lettersPool, generateMultipliers());
        }
      } else {
        // Local autocomplete
        setRoom(prev => {
          if (prev.status !== "selecting") return prev;
          const lettersPool = [...prev.letters];
          while (lettersPool.length < 9) {
            const isVowel = Math.random() > 0.45;
            lettersPool.push(getRandomLetter(isVowel));
          }
          return {
            ...prev,
            letters: lettersPool,
            multipliers: generateMultipliers(),
            status: "playing",
            timerStart: Date.now(),
            timerDuration: 30
          };
        });
      }
    } else if (currentRoom.status === "playing") {
      if (currentRoom.currentRound === 5) {
        // Conundrum timeout
        if (isMultiplayer) {
          if (currentRoom.hostId === playerId) {
            const finalPlayers = { ...currentRoom.players };
            Object.keys(finalPlayers).forEach(pId => {
              const p = finalPlayers[pId];
              const scores = [...p.roundScores];
              scores[4] = 0;
              const words = [...p.roundWords];
              words[4] = "";
              finalPlayers[pId] = { ...p, roundScores: scores, roundWords: words };
            });
            endConundrumPhaseTimeout(roomId, finalPlayers);
          }
        } else {
          // Local conundrum timeout
          setRoom(prev => {
            const finalPlayers = { ...prev.players };
            Object.keys(finalPlayers).forEach(pId => {
              const p = finalPlayers[pId];
              const scores = [...p.roundScores];
              scores[4] = 0;
              const words = [...p.roundWords];
              words[4] = "";
              finalPlayers[pId] = { ...p, roundScores: scores, roundWords: words };
            });
            return { ...prev, status: "game_over", players: finalPlayers };
          });
        }
      } else {
        // Standard playing timeout — use shared evaluation helper
        if (isMultiplayer) {
          if (currentRoom.hostId === playerId) {
            endPlayingPhase(roomId, evaluateRoundSubmissions(currentRoom, dict));
          }
        } else {
          setRoom(prev => ({
            ...prev,
            status: "round_over",
            players: evaluateRoundSubmissions(prev, dict)
          }));
        }
      }
    }
  }, [roomId, playerId, isMultiplayer, evaluateRoundSubmissions]);

  // 1. Initial State Setup
  useEffect(() => {
    if (isMultiplayer && isFirebaseConnected()) {
      const unsubscribe = listenToRoom(roomId, (roomData) => {
        if (roomData) {
          setRoom(roomData);
        }
      });
      return () => {
        unsubscribe();
        leaveRoom(roomId, playerId);
      };
    }
  }, [roomId, playerId, isMultiplayer]);

  // 2. Timer Loop
  useEffect(() => {
    if (!room) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    const checkTime = () => {
      const elapsed = Math.floor((Date.now() - room.timerStart) / 1000);
      const remaining = Math.max(0, room.timerDuration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0 && room.status === "playing") {
        playSound("tick_warning");
      } else if (remaining > 5 && room.status === "playing") {
        playSound("tick");
      }

      if (remaining === 0) {
        clearInterval(intervalRef.current);
        handleTimeout();
      }
    };

    checkTime();
    intervalRef.current = setInterval(checkTime, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.timerStart, room?.timerDuration, room?.status, handleTimeout]);

  // 4. Local practice bot actions (Letter Selection & Word Submissions)
  useEffect(() => {
    if (isMultiplayer || !room) return;

    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (botSelectionIntervalRef.current) clearInterval(botSelectionIntervalRef.current);

    if (room.status === "selecting" && room.picker === "bot") {
      const pickNextLetter = () => {
        setRoom(prev => {
          if (prev.letters.length >= 9 || prev.status !== "selecting") {
            clearInterval(botSelectionIntervalRef.current);
            return prev;
          }

          const isVowel = Math.random() > 0.45;
          const letter = getRandomLetter(isVowel);
          playSound("select_letter");
          
          const newLetters = [...prev.letters, letter];
          const newRoom = { ...prev, letters: newLetters };

          if (newLetters.length === 9) {
            newRoom.multipliers = generateMultipliers();
            newRoom.status = "playing";
            newRoom.timerStart = Date.now();
            newRoom.timerDuration = 30;
          }
          return newRoom;
        });
      };

      botSelectionIntervalRef.current = setInterval(pickNextLetter, 1200);
    }

    if (room.status === "playing" && room.currentRound < 5) {
      const thinkTime = 5000 + Math.random() * 10000;
      
      botTimerRef.current = setTimeout(() => {
        const currentRoom = localStateRef.current;
        if (!currentRoom || currentRoom.status !== "playing") return;
        const botWord = getBotWord(currentRoom.letters, botDifficulty);
        
        setRoom(prev => {
          if (prev.status !== "playing") return prev;
          return {
            ...prev,
            players: {
              ...prev.players,
              bot: {
                ...prev.players.bot,
                currentSubmission: botWord
              }
            }
          };
        });
      }, thinkTime);
    }

    if (room.status === "playing" && room.currentRound === 5) {
      let solveChance = 0.9;
      let solveDelay = 8000 + Math.random() * 10000;
      
      if (botDifficulty === "easy") {
        solveChance = 0.3;
        solveDelay = 30000 + Math.random() * 10000;
      } else if (botDifficulty === "medium") {
        solveChance = 0.6;
        solveDelay = 15000 + Math.random() * 15000;
      }

      if (Math.random() < solveChance) {
        botTimerRef.current = setTimeout(() => {
          setRoom(prev => {
            if (prev.status !== "playing" || prev.conundrumSolvedBy) return prev;
            
            playSound("fail");
            
            const botPlayer = prev.players.bot;
            const updatedScores = [...botPlayer.roundScores];
            updatedScores[4] = 11;
            const updatedWords = [...botPlayer.roundWords];
            updatedWords[4] = prev.conundrumWord;

            return {
              ...prev,
              status: "game_over",
              conundrumSolvedBy: "bot",
              conundrumSolvedByName: "Spellweaver AI",
              players: {
                ...prev.players,
                bot: {
                  ...botPlayer,
                  score: botPlayer.score + 11,
                  roundScores: updatedScores,
                  roundWords: updatedWords
                }
              }
            };
          });
        }, solveDelay);
      }
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      if (botSelectionIntervalRef.current) clearInterval(botSelectionIntervalRef.current);
    };
    // C3 fix: depend on specific room properties, not the whole object.
    // Bot reads current room via localStateRef to avoid stale closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.picker, room?.currentRound, room?.conundrumSolvedBy,
      isMultiplayer, botDifficulty]);

  // 5. Player Actions
  const pickLetter = (isVowel) => {
    if (!room || room.status !== "selecting" || !isPicker) return;

    const letter = getRandomLetter(isVowel);
    playSound("select_letter");

    if (isMultiplayer) {
      submitLetter(roomId, letter);
    } else {
      setRoom(prev => {
        const newLetters = [...prev.letters, letter];
        const newRoom = { ...prev, letters: newLetters };

        if (newLetters.length === 9) {
          newRoom.multipliers = generateMultipliers();
          newRoom.status = "playing";
          newRoom.timerStart = Date.now();
          newRoom.timerDuration = 30;
        }
        return newRoom;
      });
    }
  };

  const pickAllLettersRandomly = () => {
    if (!room || room.status !== "selecting" || !isPicker) return;

    const selected = [];
    for (let i = 0; i < 4; i++) selected.push(getRandomLetter(true));
    for (let i = 0; i < 5; i++) selected.push(getRandomLetter(false));
    
    selected.sort(() => Math.random() - 0.5);
    playSound("select_letter");

    const multipliers = generateMultipliers();

    if (isMultiplayer) {
      submitAllLetters(roomId, selected, multipliers);
    } else {
      setRoom(prev => ({
        ...prev,
        letters: selected,
        multipliers,
        status: "playing",
        timerStart: Date.now(),
        timerDuration: 30
      }));
    }
  };

  const handleWordSubmit = (word) => {
    if (!room || room.status !== "playing") return;
    const clean = word.trim().toUpperCase();

    if (room.currentRound === 5) {
      if (clean === room.conundrumWord) {
        playSound("conundrum_solved");
        setConfettiTrigger(prev => prev + 1);

        if (isMultiplayer) {
          solveConundrumGame(roomId, playerId, playerName, 11);
        } else {
          setRoom(prev => {
            const player = prev.players[playerId];
            const updatedScores = [...player.roundScores];
            updatedScores[4] = 11;
            const updatedWords = [...player.roundWords];
            updatedWords[4] = prev.conundrumWord;

            return {
              ...prev,
              status: "game_over",
              conundrumSolvedBy: playerId,
              conundrumSolvedByName: playerName,
              players: {
                ...prev.players,
                [playerId]: {
                  ...player,
                  score: player.score + 11,
                  roundScores: updatedScores,
                  roundWords: updatedWords
                }
              }
            };
          });
        }
      } else {
        playSound("fail");
        setErrorMessage("Incorrect conundrum guess!");
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setErrorMessage(""), 2000);
      }
    } else {
      const isValid = validateWord(clean, room.letters, dictionary);
      if (isValid) {
        playSound("success");
        setLocalWord(clean);
        
        if (isMultiplayer) {
          submitWord(roomId, playerId, clean);
        } else {
          setRoom(prev => ({
            ...prev,
            players: {
              ...prev.players,
              [playerId]: {
                ...prev.players[playerId],
                currentSubmission: clean
              }
            }
          }));
        }
      } else {
        playSound("fail");
        setErrorMessage("Word is invalid or cannot be formed!");
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setErrorMessage(""), 2000);
      }
    }
  };

  const handleNextRound = () => {
    if (!room || room.status !== "round_over") return;

    const nextRound = room.currentRound + 1;
    let nextPickerId = room.hostId;
    let nextPickerName = room.players[room.hostId]?.name || "Player 1";

    if (isMultiplayer) {
      const playerIds = Object.keys(room.players);
      const hostIndex = playerIds.indexOf(room.hostId);
      const otherIndex = hostIndex === 0 ? 1 : 0;
      
      const otherId = playerIds[otherIndex];
      const otherName = room.players[otherId]?.name;

      if (nextRound % 2 === 0) {
        nextPickerId = otherId;
        nextPickerName = otherName;
      }
      
      const conundrumWord = nextRound === 5 ? CONUNDRUMS[Math.floor(Math.random() * CONUNDRUMS.length)] : "";
      advanceToNextRound(roomId, nextRound, nextPickerId, nextPickerName, conundrumWord);
    } else {
      if (nextRound % 2 === 0) {
        nextPickerId = "bot";
        nextPickerName = "Spellweaver AI";
      }

      const conundrumWord = nextRound === 5 ? CONUNDRUMS[Math.floor(Math.random() * CONUNDRUMS.length)] : "";
      const updatedPlayers = {};
      Object.keys(room.players).forEach(pId => {
        updatedPlayers[pId] = {
          ...room.players[pId],
          currentSubmission: ""
        };
      });

      setRoom(prev => {
        const updates = {
          ...prev,
          currentRound: nextRound,
          players: updatedPlayers,
          letters: [],
          multipliers: { x2: -1, x3: -1 },
          conundrumWord: "",
          conundrumSolvedBy: "",
          conundrumSolvedByName: ""
        };

        if (nextRound === 5) {
          updates.status = "playing";
          updates.conundrumWord = conundrumWord;
          updates.letters = scrambleWord(conundrumWord).split('');
          updates.timerStart = Date.now();
          updates.timerDuration = 45;
        } else {
          updates.status = "selecting";
          updates.picker = nextPickerId;
          updates.pickerName = nextPickerName;
          updates.timerStart = Date.now();
          updates.timerDuration = 15;
        }
        return updates;
      });
    }
  };

  const restartLocalGame = () => {
    if (isMultiplayer) return;
    setRoom(createInitialRoom(roomId, playerId, playerName));
    setLocalWord("");
    setActiveIndices([]);
  };

  return {
    room,
    timeLeft,
    isPicker,
    localWord,
    setLocalWord,
    errorMessage,
    confettiTrigger,
    activeIndices,
    setActiveIndices,
    pickLetter,
    pickAllLettersRandomly,
    submitWord: handleWordSubmit,
    nextRound: handleNextRound,
    restartLocalGame
  };
};
export default useGameState;
