const boardElement = document.getElementById('board');
const capturedWhiteElement = document.getElementById('captured-white');
const capturedBlackElement = document.getElementById('captured-black');

const pieceImages = {
    'r': 'br.png', 'n': 'bn.png', 'b': 'bb.png', 'q': 'bq.png', 'k': 'bk.png', 'p': 'bp.png',
    'R': 'wr.png', 'N': 'wn.png', 'B': 'wb.png', 'Q': 'wq.png', 'K': 'wk.png', 'P': 'wp.png'
};

const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let currentPlayer = 'white';
let selectedSquare = null;
let boardState = JSON.parse(JSON.stringify(initialBoard));
let capturedWhite = [];
let capturedBlack = [];
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let enPassantTarget = null;

function startGame() {
    switchTimer();
    document.getElementById('board').style.pointerEvents = 'all';
}



function createBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 === 0 ? 'white' : 'black');
            square.dataset.row = row;
            square.dataset.col = col;

            const piece = boardState[row][col];
            if (piece) {
                const img = document.createElement('img');
                const selector = document.getElementById("options");
                const piecetype = selector.value;
                img.src = `https://www.chess.com/chess-themes/pieces/${piecetype}/300/${pieceImages[piece]}`;
                img.alt = piece;
                img.draggable = true;
                img.addEventListener('dragstart', (e) => handleDragStart(e, row, col));

                square.appendChild(img);
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);

            square.addEventListener('dragover', (e) => e.preventDefault());
            square.addEventListener('drop', (e) => handleDrop(e, row, col));
            boardElement.appendChild(square);
        }
    }

    highlightCheckedKing(); // Highlight the king in check
}


function assignClassToSquare(square, newClass) {
    const allClasses = ['last-move-from', 'last-move-to', 'capturable', 'possible-move'];
    allClasses.forEach(cls => {
        if (cls !== newClass) {
            square.classList.remove(cls);
        }
    });
    square.classList.add(newClass);
}


function highlightLastMove(fromRow, fromCol, toRow, toCol) {
    // Get all squares
    const squares = document.querySelectorAll('.square');

    // Clear all previous highlights
    squares.forEach(square => square.classList.remove('last-move-from', 'last-move-to'));

    // Add the new classes using the utility function
    const fromSquare = document.querySelector(`.square[data-row="${fromRow}"][data-col="${fromCol}"]`);
    const toSquare = document.querySelector(`.square[data-row="${toRow}"][data-col="${toCol}"]`);

    if (fromSquare) assignClassToSquare(fromSquare, 'last-move-from');
    if (toSquare) assignClassToSquare(toSquare, 'last-move-to');
}





function handleDragStart(event, fromRow, fromCol) {

    if ((currentPlayer === 'white' && boardState[fromRow][fromCol] === boardState[fromRow][fromCol].toUpperCase()) ||
        (currentPlayer === 'black' && boardState[fromRow][fromCol] === boardState[fromRow][fromCol].toLowerCase())) {
        selectedSquare = { row: fromRow, col: fromCol };
        event.dataTransfer.setData('text/plain', JSON.stringify({ fromRow, fromCol }));
        showPossibleMoves(fromRow, fromCol, boardState[fromRow][fromCol]);
    } else {
        event.preventDefault();
    }
    square.classList.remove('last-move-from', 'last-move-to');
}




function handleDrop(event, toRow, toCol) {
    event.preventDefault();
    const { fromRow, fromCol } = JSON.parse(event.dataTransfer.getData('text/plain'));

    const validMove = document.querySelector(`.square[data-row="${toRow}"][data-col="${toCol}"] .possible-move`);
    const capturable = document.querySelector(`.square[data-row="${toRow}"][data-col="${toCol}"].capturable`);

    if (validMove || capturable) {
        if (boardState[toRow][toCol] !== '') {
            capturePiece(toRow, toCol);
        }
        movePiece(fromRow, fromCol, toRow, toCol);
        selectedSquare = null;
        clearPossibleMoves();
    } else {
        clearPossibleMoves();
    }
}



function highlightCheckedKing() {
    // Remove existing highlights
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => square.classList.remove('king-check'));

    const opponent = currentPlayer === 'white' ? 'black' : 'white';
    if (isKingInCheck(opponent)) {
        const king = opponent === 'white' ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardState[row][col] === king) {
                    const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
                    if (square) {
                        square.classList.add('king-check');
                    }
                }
            }
        }
    }
}

function handleSquareClick(row, col) {
    const piece = boardState[row][col];
    if (selectedSquare) {
        const fromRow = selectedSquare.row;
        const fromCol = selectedSquare.col;
        const selectedPiece = boardState[fromRow][fromCol];
        const validMove = document.querySelector(`.square[data-row="${row}"][data-col="${col}"] .possible-move`);
        const capturable = document.querySelector(`.square[data-row="${row}"][data-col="${col}"].capturable`);

        if (validMove || capturable) {
            if (boardState[row][col] !== '') {
                capturePiece(row, col);
            }
            if (selectedPiece.toLowerCase() === 'k' && Math.abs(col - fromCol) === 2) {
                performCastling(fromRow, fromCol, row, col);
            } else if (selectedPiece.toLowerCase() === 'p' && enPassantTarget && row === enPassantTarget.row && col === enPassantTarget.col) {
                performEnPassant(fromRow, fromCol, row, col);
            } else {
                movePiece(fromRow, fromCol, row, col);
            }
            selectedSquare = null;
            clearPossibleMoves();
        } else {
            selectedSquare = null;
            clearPossibleMoves();
        }
    } else {
        if ((currentPlayer === 'white' && piece === piece.toUpperCase()) ||
            (currentPlayer === 'black' && piece === piece.toLowerCase())) {
            selectedSquare = { row, col };
            showPossibleMoves(row, col, piece);
        }
    }

    highlightSelectedSquare();
    
}

// (Rest of the code remains the same, excluding non-relevant functions)


function performCastling(fromRow, fromCol, toRow, toCol) {
    const isKingside = toCol > fromCol;
    const rookCol = isKingside ? 7 : 0;
    const rookNewCol = isKingside ? toCol - 1 : toCol + 1;

    // Move the king
    movePiece(fromRow, fromCol, toRow, toCol);

    // Move the rook
    movePiece(fromRow, rookCol, toRow, rookNewCol);

    // Update castling rights
    castlingRights[currentPlayer].kingside = false;
    castlingRights[currentPlayer].queenside = false;

    // Switch the player
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    switchTimer();
}

function performEnPassant(fromRow, fromCol, toRow, toCol) {
    const capturedPawnRow = currentPlayer === 'white' ? toRow + 1 : toRow - 1;
    boardState[capturedPawnRow][toCol] = '';
    movePiece(fromRow, fromCol, toRow, toCol);
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = boardState[fromRow][fromCol];
    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = '';

    // Pawn promotion
    if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
        boardState[toRow][toCol] = currentPlayer === 'white' ? 'Q' : 'q';
    }

    // Update en passant target
    if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
    } else {
        enPassantTarget = null;
    }

    // Update castling rights if king or rook moves
    if (piece === 'K') {
        castlingRights.white.kingside = false;
        castlingRights.white.queenside = false;
    } else if (piece === 'k') {
        castlingRights.black.kingside = false;
        castlingRights.black.queenside = false;
    } else if (piece === 'R') {
        if (fromCol === 0) castlingRights.white.queenside = false;
        if (fromCol === 7) castlingRights.white.kingside = false;
    } else if (piece === 'r') {
        if (fromCol === 0) castlingRights.black.queenside = false;
        if (fromCol === 7) castlingRights.black.kingside = false;
    }

    createBoard();
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    if (isKingInCheck('white')){
        alert("White King in Check");
        return;
    }
    
    switchTimer();
    highlightLastMove(fromRow, fromCol, toRow, toCol);
}


// ----------------------------------------------------------






// Function to check if a move is legal (avoids check)
function isLegalMove(fromRow, fromCol, toRow, toCol) {
    const tempBoard = JSON.parse(JSON.stringify(boardState));
    const piece = tempBoard[fromRow][fromCol];
    tempBoard[toRow][toCol] = piece;
    tempBoard[fromRow][fromCol] = '';

    return !isKingInCheck(currentPlayer, tempBoard);
}





// Modified function to display possible moves
function showPossibleMoves(row, col, piece) {
    
    const previous_move = document.querySelectorAll('.last-move-to','.last-move-from');
    previous_move.forEach(square => square.classList.remove('last-move-to','last-move-from'));

    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (
                isValidMove(row, col, toRow, toCol, piece)
                 && isLegalMove(row, col, toRow, toCol)
            ) {
                const square = document.querySelector(
                    `.square[data-row="${toRow}"][data-col="${toCol}"]`
                );
                if (square) {
                    if (boardState[toRow][toCol] === '') {
                        const circle = document.createElement('div');
                        circle.classList.add('possible-move');
                        square.appendChild(circle);
                    } else if (
                        (currentPlayer === 'white' &&
                            boardState[toRow][toCol] ===
                                boardState[toRow][toCol].toLowerCase()) ||
                        (currentPlayer === 'black' &&
                            boardState[toRow][toCol] ===
                                boardState[toRow][toCol].toUpperCase())
                    ) {
                        square.classList.add('capturable');
                    }
                }
            }
        }
    }
}



// Updated isKingInCheck function to accept a custom board state
function isKingInCheck(opponent, customBoard = boardState) {
    const king = opponent === 'white' ? 'K' : 'k';
    let kingPosition = null;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (customBoard[row][col] === king) {
                kingPosition = { row, col };
                break;
            }
        }
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = customBoard[row][col];
            if (
                (opponent === 'white' && piece === piece.toLowerCase()) ||
                (opponent === 'black' && piece === piece.toUpperCase())
            ) {
                if (
                    isValidMove(row, col, kingPosition.row, kingPosition.col, piece)
                ) {
                    return true; // The king is in check
                }
            }
        }
    }

    return false; // King is not in check
}




function capturePiece(row, col) {
    const capturedPiece = boardState[row][col];
    const img = `<img src="https://www.chess.com/chess-themes/pieces/neo/300/${pieceImages[capturedPiece]}" alt="${capturedPiece}"/>`;
    if (capturedPiece === capturedPiece.toUpperCase()) {
        capturedBlack.push(img);
        capturedBlackElement.innerHTML = capturedBlack.join(' ');
    } else {
        capturedWhite.push(img);
        capturedWhiteElement.innerHTML = capturedWhite.join(' ');
    }
}


function clearPossibleMoves() {
    const circles = document.querySelectorAll('.possible-move');
    circles.forEach(circle => circle.remove());

    const capturables = document.querySelectorAll('.capturable');
    capturables.forEach(capturable => capturable.classList.remove('capturable'));
}


function highlightSelectedSquare() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => square.classList.remove('highlight'));
    if (selectedSquare) {
        const { row, col } = selectedSquare;
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        if (square && boardState[row][col] !== '') {
            square.classList.add('highlight');
        }
    }
}


function isValidMove(fromRow, fromCol, toRow, toCol, piece) {
    if (boardState[toRow][toCol] !== '' &&
        ((currentPlayer === 'white' && boardState[toRow][toCol] === boardState[toRow][toCol].toUpperCase()) ||
         (currentPlayer === 'black' && boardState[toRow][toCol] === boardState[toRow][toCol].toLowerCase()))) {
        return false;
    }

    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);

    switch (piece.toLowerCase()) {
        case 'p':
            return validatePawnMove(fromRow, fromCol, toRow, toCol, piece);
        case 'r':
            return validateRookMove(fromRow, fromCol, toRow, toCol);
        case 'n':
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        case 'b':
            return dx === dy && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'q':
            return (dx === dy || dx === 0 || dy === 0) && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'k':
            if (dx === 2 && dy === 0) {
                return canCastle(fromRow, fromCol, toCol);
            }
            return dx <= 1 && dy <= 1;
        default:
            return false;
    }
}

function canCastle(row, kingCol, targetCol) {
    const isKingside = targetCol > kingCol;
    const rookCol = isKingside ? 7 : 0;
    const direction = isKingside ? 1 : -1;

    if (currentPlayer === 'white' && row === 7) {
        if ((isKingside && !castlingRights.white.kingside) || (!isKingside && !castlingRights.white.queenside)) {
            return false;
        }
    } else if (currentPlayer === 'black' && row === 0) {
        if ((isKingside && !castlingRights.black.kingside) || (!isKingside && !castlingRights.black.queenside)) {
            return false;
        }
    } else {
        return false;
    }

    // Check that spaces between king and rook are empty
    for (let col = kingCol + direction; col !== rookCol; col += direction) {
        if (boardState[row][col] !== '') return false;
    }

    return true;
}

function validatePawnMove(fromRow, fromCol, toRow, toCol, piece) {
    const direction = piece === 'P' ? -1 : 1;
    const startRow = piece === 'P' ? 6 : 1;

    if (toCol === fromCol && boardState[toRow][toCol] === '') {
        if (toRow === fromRow + direction) {
            return true;
        }
        if (fromRow === startRow && toRow === fromRow + 2 * direction && boardState[fromRow + direction][fromCol] === '') {
            return true;
        }
    } else if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction &&
               (boardState[toRow][toCol] !== '' || (enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col))) {
        return true;
    }

    return false;
}

function validateRookMove(fromRow, fromCol, toRow, toCol) {
    return (fromRow === toRow || fromCol === toCol) && isPathClear(fromRow, fromCol, toRow, toCol);
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (boardState[currentRow][currentCol] !== '') {
            return false;
        }
        currentRow += rowStep;
        currentCol += colStep;
    }

    return true;
}

createBoard();

let timers = {
    player1: 10 * 60, // 20 minutes in seconds
    player2: 10 * 60
};

let activeTimer = 'player1';
let interval = null;

function updateDisplay() {
    for (const [key, seconds] of Object.entries(timers)) {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
        document.getElementById(key).textContent = `${minutes}:${remainingSeconds}`;
    }
}

function switchTimer() {
    if (interval) clearInterval(interval);

    // Toggle active timer
    if (activeTimer === 'player1') {
        activeTimer = 'player2';
    } else {
        activeTimer = 'player1';
    }

    interval = setInterval(() => {
        if (timers[activeTimer] > 0) {
            timers[activeTimer]--;
            updateDisplay();
        } else {
            clearInterval(interval);
            alert(`${activeTimer} is out of time!`);
        }
    }, 1000);
}

updateDisplay();
