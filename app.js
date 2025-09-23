// ====== State ======
let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;

const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const cells = Array.from(document.querySelectorAll(".cell"));

// ====== Init ======
function initializeGame() {
  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;
  renderBoard();
  setStatus(`Player ${currentPlayer}'s turn`);
}

function renderBoard() {
  cells.forEach((cell, idx) => {
    cell.textContent = board[idx];
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ====== Gameplay ======
function handleCellClick(index) {
  if (gameOver) return;
  if (board[index] !== "") return; // already taken

  board[index] = currentPlayer;
  renderBoard();

  checkWinnerOrDraw();

  if (!gameOver) {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    setStatus(`Player ${currentPlayer}'s turn`);
  }
}

function checkWinnerOrDraw() {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      gameOver = true;
      setStatus(`${board[a]} wins!`);
      return;
    }
  }

  if (!board.includes("")) {
    gameOver = true;
    setStatus("It's a draw!");
  }
}

// ====== Events ======
cells.forEach((cell, idx) => {
  cell.addEventListener("click", () => handleCellClick(idx));
});
resetBtn.addEventListener("click", initializeGame);

// Start the game
initializeGame();
