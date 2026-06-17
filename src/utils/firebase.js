import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase, ref, set, get, update, onValue, off, remove } from "firebase/database";
import { scrambleWord } from "./dictionary.js";

let app = null;
let db = null;

// User default configuration
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCt0G41m7kcj0MM4YOOteT2Yzwd71Faldg",
  authDomain: "anagram-fbc07.firebaseapp.com",
  databaseURL: "https://anagram-fbc07-default-rtdb.firebaseio.com",
  projectId: "anagram-fbc07",
  storageBucket: "anagram-fbc07.firebasestorage.app",
  messagingSenderId: "141538665503",
  appId: "1:141538665503:web:f81b516475c2949f9ce12a"
};

// Get saved config from localStorage
export const getSavedFirebaseConfig = () => {
  try {
    const config = localStorage.getItem("anagram_magic_firebase_config");
    return config ? JSON.parse(config) : DEFAULT_FIREBASE_CONFIG;
  } catch {
    return DEFAULT_FIREBASE_CONFIG;
  }
};

export const saveFirebaseConfig = (config) => {
  localStorage.setItem("anagram_magic_firebase_config", JSON.stringify(config));
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem("anagram_magic_firebase_config");
};

// Initialize dynamic connection
export const connectFirebase = (config = null) => {
  const finalConfig = config || getSavedFirebaseConfig();
  if (!finalConfig) return false;

  try {
    // If already initialized, just get it
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(finalConfig);
    }
    db = getDatabase(app);
    return true;
  } catch (error) {
    console.error("Firebase connection error:", error);
    return false;
  }
};

// Auto connect on import if config exists
connectFirebase();

export const isFirebaseConnected = () => {
  return db !== null;
};

// Firebase Realtime DB helper actions
export const createRoom = async (roomId, hostId, hostName, isPublic = false) => {
  if (!db) return false;
  
  const roomRef = ref(db, `rooms/${roomId}`);
  const initialRoom = {
    roomId,
    status: "waiting", // waiting | selecting | playing | round_over | game_over
    currentRound: 1,
    picker: hostId,
    pickerName: hostName,
    letters: [],
    multipliers: { x2: -1, x3: -1 },
    timerStart: 0,
    timerDuration: 0,
    conundrumWord: "",
    conundrumSolvedBy: "",
    conundrumSolvedByName: "",
    hostId: hostId,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        score: 0,
        currentSubmission: "",
        roundScores: [0, 0, 0, 0, 0],
        roundWords: ["", "", "", "", ""]
      }
    }
  };

  await set(roomRef, initialRoom);

  if (isPublic) {
    const publicRoomRef = ref(db, `public_rooms/${roomId}`);
    await set(publicRoomRef, {
      hostId,
      hostName,
      timestamp: Date.now()
    });
  }

  return true;
};

export const joinRoom = async (roomId, playerId, playerName) => {
  if (!db) return false;

  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    throw new Error("Room does not exist.");
  }

  const roomData = snapshot.val();
  if (roomData.status !== "waiting") {
    throw new Error("Game already started or in progress.");
  }

  const players = roomData.players || {};
  const playerIds = Object.keys(players);

  if (playerIds.length >= 2 && !players[playerId]) {
    throw new Error("Room is full.");
  }

  // Add the joining player
  const updatedPlayers = {
    ...players,
    [playerId]: {
      id: playerId,
      name: playerName,
      score: 0,
      currentSubmission: "",
      roundScores: [0, 0, 0, 0, 0],
      roundWords: ["", "", "", "", ""]
    }
  };

  // If we now have 2 players, transition state to selecting
  const newStatus = Object.keys(updatedPlayers).length === 2 ? "selecting" : "waiting";

  await update(roomRef, {
    players: updatedPlayers,
    status: newStatus,
    timerStart: Date.now(),
    timerDuration: 15 // letter selection timer
  });

  // Remove from public rooms
  const publicRoomRef = ref(db, `public_rooms/${roomId}`);
  await remove(publicRoomRef);

  return true;
};

export const submitLetter = async (roomId, letter) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return;

  const room = snapshot.val();
  const currentLetters = room.letters || [];
  if (currentLetters.length >= 9) return;

  const updatedLetters = [...currentLetters, letter.toUpperCase()];

  const updates = { letters: updatedLetters };

  // If 9 letters are reached, setup multipliers and start the playing phase
  if (updatedLetters.length === 9) {
    // Pick two random indexes on the board
    const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const idx2 = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
    const idx3 = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];

    updates.multipliers = { x2: idx2, x3: idx3 };
    updates.status = "playing";
    updates.timerStart = Date.now();
    updates.timerDuration = 30; // 30 seconds to solve
  }

  await update(roomRef, updates);
};

export const submitAllLetters = async (roomId, letters, multipliers) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, {
    letters,
    multipliers,
    status: "playing",
    timerStart: Date.now(),
    timerDuration: 30
  });
};

export const submitWord = async (roomId, playerId, word) => {
  if (!db) return;
  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
  await update(playerRef, {
    currentSubmission: word.toUpperCase()
  });
};

export const endPlayingPhase = async (roomId, finalPlayersData) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  
  // Update round scores and words for all players based on their currentSubmission
  await update(roomRef, {
    status: "round_over",
    players: finalPlayersData
  });
};

export const advanceToNextRound = async (roomId, nextRound, pickerId, pickerName, conundrumWord = "") => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return;

  const room = snapshot.val();
  const updatedPlayers = {};

  // Reset player currentSubmissions for next round
  Object.keys(room.players).forEach(pId => {
    updatedPlayers[pId] = {
      ...room.players[pId],
      currentSubmission: ""
    };
  });

  const updates = {
    currentRound: nextRound,
    players: updatedPlayers,
    letters: [],
    multipliers: { x2: -1, x3: -1 },
    conundrumWord: "",
    conundrumSolvedBy: "",
    conundrumSolvedByName: ""
  };

  if (nextRound === 5) {
    updates.status = "playing"; // Conundrum is playing immediately
    updates.conundrumWord = conundrumWord;
    updates.letters = scrambleWord(conundrumWord).split('');
    updates.timerStart = Date.now();
    updates.timerDuration = 45; // 45 seconds for conundrum
  } else {
    updates.status = "selecting";
    updates.picker = pickerId;
    updates.pickerName = pickerName;
    updates.timerStart = Date.now();
    updates.timerDuration = 15;
  }

  await update(roomRef, updates);
};

export const solveConundrumGame = async (roomId, playerId, playerName, scoreGained) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return;

  const room = snapshot.val();
  const player = room.players[playerId];
  if (!player) return;

  const updatedPlayers = { ...room.players };
  
  // Set score for conundrum in roundScores index 4
  const scores = [...player.roundScores];
  scores[4] = scoreGained;
  const words = [...player.roundWords];
  words[4] = room.conundrumWord;

  const totalScore = player.score + scoreGained;

  updatedPlayers[playerId] = {
    ...player,
    score: totalScore,
    roundScores: scores,
    roundWords: words
  };

  await update(roomRef, {
    conundrumSolvedBy: playerId,
    conundrumSolvedByName: playerName,
    status: "game_over",
    players: updatedPlayers
  });
};

export const endConundrumPhaseTimeout = async (roomId, finalPlayersData) => {
  if (!db) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, {
    status: "game_over",
    players: finalPlayersData
  });
};

export const listenToRoom = (roomId, callback) => {
  if (!db || !roomId) return () => {};
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });

  return () => off(roomRef);
};

export const leaveRoom = async (roomId, playerId) => {
  if (!db || !roomId) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return;

  const room = snapshot.val();
  const players = room.players || {};
  const playerIds = Object.keys(players);

  if (playerIds.length <= 1) {
    // If last player leaves, delete room
    await remove(roomRef);
    // Also remove from public rooms
    await remove(ref(db, `public_rooms/${roomId}`));
  } else {
    // Remove player
    const updatedPlayers = { ...players };
    delete updatedPlayers[playerId];

    // If host leaves, make the other player host
    let newHostId = room.hostId;
    if (room.hostId === playerId) {
      newHostId = Object.keys(updatedPlayers)[0];
    }

    await update(roomRef, {
      players: updatedPlayers,
      hostId: newHostId,
      status: "game_over" // end the game if someone leaves
    });
  }
};

export const findPublicRoom = async (playerId) => {
  if (!db) return null;
  const publicRoomsRef = ref(db, "public_rooms");
  const snapshot = await get(publicRoomsRef);
  if (!snapshot.exists()) return null;

  const roomsData = snapshot.val();
  // Find a room where the host is not the current player
  const matchingRoomId = Object.keys(roomsData).find(roomId => {
    return roomsData[roomId].hostId !== playerId;
  });

  return matchingRoomId || null;
};

export const joinBotToRoom = async (roomId, botId, botName, botDifficulty) => {
  if (!db) return false;
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return false;

  const roomData = snapshot.val();
  const players = roomData.players || {};

  const updatedPlayers = {
    ...players,
    [botId]: {
      id: botId,
      name: botName,
      score: 0,
      currentSubmission: "",
      roundScores: [0, 0, 0, 0, 0],
      roundWords: ["", "", "", "", ""]
    }
  };

  await update(roomRef, {
    players: updatedPlayers,
    status: "selecting",
    botDifficulty,
    timerStart: Date.now(),
    timerDuration: 15
  });

  // Remove from public rooms
  const publicRoomRef = ref(db, `public_rooms/${roomId}`);
  await remove(publicRoomRef);

  return true;
};
