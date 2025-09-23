/* ===========================
   Tic Tac Toe — Pro Build
   - Status text is updated inside renderBoard()  ✅ (lab requirement)
   - Custom mods: scores (persistent), AI (easy/unbeatable), emojis, sounds,
     hint, undo/redo, keyboard controls, themes, auto-generated board.
=========================== */

// ===== Options =====
const USE_EMOJIS = true; // set false for plain X / O

// ===== Persist keys =====
const LSK_SCORES   = "ttt_scores_v1";
const LSK_SETTINGS = "ttt_settings_v1";

// ===== Winning lines =====
const lines = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diagonals
];

// ===== Game state =====
let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let winningLine = null;
let aiThinking = false;

let xWins = 0, oWins = 0, draws = 0;

let settings = {
  mode: "PVP",           // PVP | PVC_EASY | PVC_UNBEATABLE
  humanAs: "X",          // X | O (when PVC)
  firstPlayer: "X",      // X | O | RANDOM
  soundOn: true,
  theme: "light"
};

let moveHistory = []; // [{idx, player}]
let redoStack = [];
let hintIndex = null;

// ===== DOM =====
const statusEl = document.getElementById("status");
const boardEl  = document.getElementById("gameBoard");

const xWinsEl  = document.getElementById("xWins");
const oWinsEl  = document.getElementById("oWins");
const drawsEl  = document.getElementById("draws");

const newGameBtn     = document.getElementById("newGame");
const undoBtn        = document.getElementById("undoBtn");
const redoBtn        = document.getElementById("redoBtn");
const hintBtn        = document.getElementById("hintBtn");
const resetScoresBtn = document.getElementById("resetScores");

const modeSel   = document.getElementById("mode");
const humanAsSel= document.getElementById("humanAs");
const firstSel  = document.getElementById("firstPlayer");
const themeSel  = document.getElementById("theme");
const soundToggle = document.getElementById("soundToggle");

// dynamic list of .cell nodes (rebuilt whenever we regenerate board)
let cells = [];

// ===== Boot =====
loadScores();
loadSettings();
applySettingsToUI();
applyTheme();
buildBoard();     // auto-generate 3x3 cells
wireControls();
initializeGame(true);

/* ===== Build board dynamically (no hardcoded cells) ===== */
function buildBoard() {
  boardEl.innerHTML = ""; // clear
  for (let r = 0; r < 3; r++) {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("role","row");

    for (let c = 0; c < 3; c++) {
      const idx = r*3 + c;
      const cell = document.createElement("div");
      cell.className = "cell empty";
      cell.id = `cell-${idx}`;
      cell.setAttribute("role","gridcell");
      cell.setAttribute("tabindex","0");
      cell.setAttribute("aria-label", `Row ${r+1} Column ${c+1}`);
      cell.dataset.idx = String(idx);

      // mouse
      cell.addEventListener("click", () => tryPlace(idx));
      // keyboard
      cell.addEventListener("keydown", (e) => handleCellKey(e, idx));

      row.appendChild(cell);
    }
    boardEl.appendChild(row);
  }
  cells = Array.from(document.querySelectorAll(".cell"));
}

/* ===== Controls wiring ===== */
function wireControls() {
  newGameBtn.addEventListener("click", () => initializeGame());
  undoBtn.addEventListener("click", () => undoMove());
  redoBtn.addEventListener("click", () => redoMove());
  hintBtn.addEventListener("click", () => showHint());
  resetScoresBtn.addEventListener("click", () => {
    xWins = oWins = draws = 0;
    saveScores();
    updateScoreboard();
  });

  // Settings
  modeSel.addEventListener("change", () => {
    settings.mode = modeSel.value;
    document.body.classList.toggle("pvc", settings.mode !== "PVP");
    saveSettings();
    initializeGame();
  });
  humanAsSel.addEventListener("change", () => {
    settings.humanAs = humanAsSel.value;
    saveSettings();
    initializeGame();
  });
  firstSel.addEventListener("change", () => {
    settings.firstPlayer = firstSel.value;
    saveSettings();
    initializeGame();
  });
  themeSel.addEventListener("change", () => {
    settings.theme = themeSel.value;
    saveSettings();
    applyTheme();
  });
  soundToggle.addEventListener("change", () => {
    settings.soundOn = soundToggle.checked;
    saveSettings();
  });
}

/* ===== Initialize / Reset ===== */
function initializeGame(firstLoad = false) {
  board = Array(9).fill("");
  currentPlayer = chooseFirstPlayer(settings.firstPlayer);
  gameOver = false;
  winningLine = null;
  aiThinking = false;
  moveHistory = [];
  redoStack = [];
  hintIndex = null;

  document.body.classList.toggle("pvc", settings.mode !== "PVP");

  // render sets the status (lab requirement)
  renderBoard();

  // If AI should start, let it move
  if (isAIsTurn()) aiMoveWithDelay();

  if (!firstLoad) playBeep(600, 0.06, "triangle", 0.04);
}

function chooseFirstPlayer(fp) {
  if (fp === "RANDOM") return Math.random() < 0.5 ? "X" : "O";
  return fp;
}

/* ===== Render (✅ updates status here) ===== */
function renderBoard() {
  cells.forEach((cell, idx) => {
    const val = board[idx];

    // What to show in the square
    const show = USE_EMOJIS
      ? (val === "X" ? "❌" : val === "O" ? "⭕" : "")
      : (val || "");

    // Ghost preview for hover
    const ghost = USE_EMOJIS
      ? (currentPlayer === "X" ? "❌" : "⭕")
      : currentPlayer;

    cell.textContent = show;
    cell.classList.toggle("empty", val === "");
    cell.classList.toggle("win", winningLine?.includes(idx) ?? false);
    cell.classList.toggle("hint", hintIndex === idx);
    cell.dataset.ghost = val === "" ? ghost : "";
    cell.setAttribute("aria-disabled", val !== "" || gameOver ? "true" : "false");
  });

  // ✅ Status text logic lives here (per lab):
  let text = "";
  if (gameOver) {
    const win = computeWinner(board);
    text = win ? `${displaySymbol(win.player)} wins!` : "It's a draw!";
  } else if (aiThinking) {
    text = `Computer (${displaySymbol(currentPlayer)}) is thinking…`;
  } else {
    text = `Player ${displaySymbol(currentPlayer)}'s turn`;
  }
  statusEl.textContent = text;

  updateScoreboard();
}

function displaySymbol(p) {
  return USE_EMOJIS ? (p === "X" ? "❌" : "⭕") : p;
}

function updateScoreboard() {
  xWinsEl.textContent = xWins;
  oWinsEl.textContent = oWins;
  drawsEl.textContent = draws;
}

/* ===== Input handling ===== */
function tryPlace(index) {
  if (gameOver || aiThinking) return;
  if (board[index] !== "") return;

  placeMark(index, currentPlayer);
  if (finalizeIfEnded()) return;

  togglePlayer();
  if (isAIsTurn()) aiMoveWithDelay();
}

function placeMark(index, player) {
  board[index] = player;
  moveHistory.push({ idx: index, player });
  redoStack = [];    // new branch, clear redo
  hintIndex = null;
  renderBoard();
  playClick();
}

function togglePlayer() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  renderBoard(); // status updated here
}

/* ===== End checks ===== */
function finalizeIfEnded() {
  const win = computeWinner(board);
  if (win) {
    gameOver = true;
    winningLine = win.line;
    if (win.player === "X") xWins++; else oWins++;
    saveScores();
    renderBoard();
    playWin();
    return true;
  }
  if (!board.includes("")) {
    gameOver = true;
    draws++;
    saveScores();
    renderBoard();
    playDraw();
    return true;
  }
  return false;
}

function computeWinner(b) {
  for (const [a, b1, c] of lines) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return { player: b[a], line: [a, b1, c] };
    }
  }
  return null;
}

/* ===== Undo / Redo ===== */
function undoMove() {
  if (moveHistory.length === 0 || aiThinking) return;
  const last = moveHistory.pop();
  board[last.idx] = "";
  redoStack.push(last);
  gameOver = false;
  winningLine = null;
  currentPlayer = last.player; // it's that player's turn again
  renderBoard();
}

function redoMove() {
  if (redoStack.length === 0 || aiThinking) return;
  const next = redoStack.pop();
  if (board[next.idx] !== "") return;
  board[next.idx] = next.player;
  moveHistory.push(next);
  // after placing, check end and toggle if needed
  if (!finalizeIfEnded()) {
    currentPlayer = next.player === "X" ? "O" : "X";
  }
  renderBoard();
  if (isAIsTurn()) aiMoveWithDelay();
}

/* ===== Hint ===== */
function showHint() {
  if (gameOver || aiThinking) return;
  hintIndex = bestMoveFor(
    currentPlayer,
    settings.mode === "PVC_EASY" ? "easy" : "unbeatable"
  );
  renderBoard();
}

/* ===== AI ===== */
function isAIsTurn() {
  if (settings.mode === "PVP") return false;
  const aiPlays = settings.humanAs === "X" ? "O" : "X";
  return currentPlayer === aiPlays;
}

function aiMoveWithDelay() {
  aiThinking = true;
  renderBoard(); // shows "Computer is thinking…"
  setTimeout(() => {
    const idx = (settings.mode === "PVC_EASY")
      ? randomEmptyIndex(board)
      : bestMoveFor(currentPlayer, "unbeatable");
    if (idx != null) {
      placeMark(idx, currentPlayer);
      if (!finalizeIfEnded()) togglePlayer();
    }
    aiThinking = false;
    renderBoard();
  }, 120); // snappy AI
}

function randomEmptyIndex(b) {
  const empties = b.map((v,i)=>v===""?i:null).filter(i=>i!=null);
  if (empties.length === 0) return null;
  return empties[(Math.random()*empties.length)|0];
}

/* Unbeatable AI with tactical shortcuts */
function bestMoveFor(player, mode) {
  if (mode === "easy") return randomEmptyIndex(board);

  // 1) Immediate win
  const winNow = findTacticalMove(player);
  if (winNow != null) return winNow;

  // 2) Immediate block
  const opp = player === "X" ? "O" : "X";
  const blockNow = findTacticalMove(opp);
  if (blockNow != null) return blockNow;

  // 3) Otherwise minimax (tiny tree)
  let bestScore = -Infinity, move = null;
  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      board[i] = player;
      const score = minimax(board, 0, false, player);
      board[i] = "";
      if (score > bestScore) { bestScore = score; move = i; }
    }
  }
  return move;
}

function findTacticalMove(p) {
  for (const [a,b,c] of lines) {
    const empties = [a,b,c].filter(i => board[i] === "");
    const marks = [board[a],board[b],board[c]].filter(v => v === p).length;
    if (marks === 2 && empties.length === 1) return empties[0];
  }
  return null;
}

// Minimax: aiPlayer is fixed; maximize for aiPlayer
function minimax(b, depth, isMax, aiPlayer) {
  const win = computeWinner(b);
  if (win) return (win.player === aiPlayer) ? (10 - depth) : (depth - 10);
  if (!b.includes("")) return 0;

  const opp = aiPlayer === "X" ? "O" : "X";

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === "") {
        b[i] = aiPlayer;
        best = Math.max(best, minimax(b, depth + 1, false, aiPlayer));
        b[i] = "";
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === "") {
        b[i] = opp;
        best = Math.min(best, minimax(b, depth + 1, true, aiPlayer));
        b[i] = "";
      }
    }
    return best;
  }
}

/* ===== Keyboard navigation ===== */
function handleCellKey(e, idx) {
  const row = Math.floor(idx / 3);
  const col = idx % 3;
  let next = idx;

  if (e.key === "ArrowRight") next = row*3 + ((col + 1) % 3);
  else if (e.key === "ArrowLeft") next = row*3 + ((col + 2) % 3);
  else if (e.key === "ArrowDown") next = ((row + 1) % 3)*3 + col;
  else if (e.key === "ArrowUp") next = ((row + 2) % 3)*3 + col;
  else if (e.key === "Enter" || e.key === " ") {
    tryPlace(idx);
    return;
  } else {
    return;
  }
  e.preventDefault();
  cells[next]?.focus();
}

/* ===== Sounds (Web Audio, no external files) ===== */
let audioCtx = null;
function ensureAudio() {
  if (!settings.soundOn) return;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
}
function playBeep(freq = 660, dur = 0.08, type = "sine", vol = 0.04) {
  if (!settings.soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  setTimeout(() => { osc.stop(); }, dur * 1000);
}
function playClick() { playBeep(520, 0.06, "triangle", 0.05); }
function playWin()   { playBeep(880, 0.08, "sine", 0.06); setTimeout(()=>playBeep(1046,0.1,"sine",0.06), 110); }
function playDraw()  { playBeep(330, 0.12, "sawtooth", 0.04); }

/* ===== Persistence ===== */
function loadScores() {
  try {
    const s = JSON.parse(localStorage.getItem(LSK_SCORES));
    if (s) { xWins = s.xWins|0; oWins = s.oWins|0; draws = s.draws|0; }
  } catch {}
}
function saveScores() {
  localStorage.setItem(LSK_SCORES, JSON.stringify({ xWins, oWins, draws }));
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(LSK_SETTINGS));
    if (s) settings = { ...settings, ...s };
  } catch {}
}
function saveSettings() {
  localStorage.setItem(LSK_SETTINGS, JSON.stringify(settings));
}
function applySettingsToUI() {
  modeSel.value = settings.mode;
  humanAsSel.value = settings.humanAs;
  firstSel.value = settings.firstPlayer;
  soundToggle.checked = !!settings.soundOn;
  themeSel.value = settings.theme;
  document.body.classList.toggle("pvc", settings.mode !== "PVP");
}
function applyTheme() { document.body.setAttribute("data-theme", settings.theme); }
