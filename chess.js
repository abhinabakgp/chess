const boardElement = document.getElementById('board');
const capturedWhiteElement = document.getElementById('captured-white');
const capturedBlackElement = document.getElementById('captured-black');

let positionHistory = {};
let moveHistory = [];

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

function rematch(){
    location.reload();
    document.getElementById("result-overlay").classList.add("hidden");
}

function createBoard() {
    boardElement.innerHTML = '';
    const files = 'abcdefgh';
    const ranks = '87654321';

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


                img.src = `https://www.chess.com/chess-themes/pieces/${piecetype}/100/${pieceImages[piece]}`;
                img.alt = piece;
                img.addEventListener('mousedown', (e) => handleMouseDown(e, row, col));
                
                square.appendChild(img);
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);

            // Add rank (left side)
            if (col === 0) {
                const rankLabel = document.createElement('div');
                rankLabel.classList.add('rank-label');
                rankLabel.textContent = ranks[row]; // 8 to 1
                square.appendChild(rankLabel);
            }

            // Add file (bottom side)
            if (row === 7) {
                const fileLabel = document.createElement('div');
                fileLabel.classList.add('file-label');
                fileLabel.textContent = files[col]; // a to h
                square.appendChild(fileLabel);
            }
        }
    }

    highlightCheckedKing();
}


function handleManualMove() {
    const inputField = document.getElementById("move-input");
    const errorMessage = document.getElementById("error-message");
    const move = inputField.value.trim();

    if (!/^[a-h][1-8][a-h][1-8]$/.test(move)) {
        errorMessage.textContent = "Invalid format! Use format like e2e4.";
        return;
    }

    const fromFile = move[0];
    const fromRank = move[1];
    const toFile = move[2];
    const toRank = move[3];

    const files = "abcdefgh";
    const ranks = "87654321";

    const fromCol = files.indexOf(fromFile);
    const fromRow = ranks.indexOf(fromRank);
    const toCol = files.indexOf(toFile);
    const toRow = ranks.indexOf(toRank);

    const piece = boardState[fromRow][fromCol];

    if (!piece || (currentPlayer === "white" && piece !== piece.toUpperCase()) || 
        (currentPlayer === "black" && piece !== piece.toLowerCase())) {
        errorMessage.textContent = "Invalid move: No valid piece at selected square.";
        return;
    }

    if (isValidMove(fromRow, fromCol, toRow, toCol, piece)) {
        movePiece(fromRow, fromCol, toRow, toCol, boardState);
        inputField.value = "";
        errorMessage.textContent = "";
    } else {
        errorMessage.textContent = "Invalid move!";
    }
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




// Helper function to create a deep copy of the board
function copyBoardState(board) {
    return JSON.parse(JSON.stringify(board));
}

// Main validation function - now completely robust
function isValidMove(fromRow, fromCol, toRow, toCol, piece) {
    // 1. Basic validation - can't stay in place or capture own pieces
    if ((fromRow === toRow && fromCol === toCol) ||
        (boardState[toRow][toCol] !== '' &&
         ((currentPlayer === 'white' && boardState[toRow][toCol] === boardState[toRow][toCol].toUpperCase()) ||
          (currentPlayer === 'black' && boardState[toRow][toCol] === boardState[toRow][toCol].toLowerCase())))) {
        return false;
    }

    // 2. Validate piece movement rules
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);
    let basicMoveValid = false;

    switch (piece.toLowerCase()) {
        case 'p': 
            basicMoveValid = validatePawnMove(fromRow, fromCol, toRow, toCol, piece);
            break;
        case 'r':
            basicMoveValid = validateRookMove(fromRow, fromCol, toRow, toCol);
            break;
        case 'n':
            basicMoveValid = (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
            break;
        case 'b':
            basicMoveValid = dx === dy && isPathClear(fromRow, fromCol, toRow, toCol);
            break;
        case 'q':
            basicMoveValid = (dx === dy || dx === 0 || dy === 0) && isPathClear(fromRow, fromCol, toRow, toCol);
            break;
        case 'k':
            if (dx === 2 && dy === 0) {
                return canCastle(fromRow, fromCol, toCol); // Castling has its own validation
            }
            basicMoveValid = dx <= 1 && dy <= 1;
            break;
        default:
            return false;
    }

    if (!basicMoveValid) return false;

    // 3. Create temporary board to test the move
    const tempBoard = copyBoardState(boardState);
    const movingPiece = tempBoard[fromRow][fromCol];

    // Handle special moves
    if (movingPiece.toLowerCase() === 'p') {
        // En passant capture
        if (enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
            tempBoard[toRow][toCol] = movingPiece;
            tempBoard[fromRow][fromCol] = '';
            const capturedPawnRow = currentPlayer === 'white' ? toRow + 1 : toRow - 1;
            tempBoard[capturedPawnRow][toCol] = '';
            return !isKingInCheck(currentPlayer, tempBoard);
        }
        
        // Promotion (we'll handle this separately in movePiece)
        if ((movingPiece === 'P' && toRow === 0) || (movingPiece === 'p' && toRow === 7)) {
            tempBoard[toRow][toCol] = movingPiece; // Actual promotion handled later
            tempBoard[fromRow][fromCol] = '';
            return !isKingInCheck(currentPlayer, tempBoard);
        }
    }

    // Standard move
    tempBoard[toRow][toCol] = movingPiece;
    tempBoard[fromRow][fromCol] = '';

    // 4. Final check - cannot leave king in check
    return !isKingInCheck(currentPlayer, tempBoard);
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

    // Check if king is in check or would pass through check
    for (let i = 0; i <= 2; i++) {
    const tempBoard = copyBoardState(boardState);
    const col = kingCol + i * direction;
    tempBoard[row][kingCol] = '';
    tempBoard[row][col] = currentPlayer === 'white' ? 'K' : 'k';
    if (isKingInCheck(currentPlayer, tempBoard)) return false;
}

    return true;
}

// Enhanced showPossibleMoves with complete validation
function showPossibleMoves(row, col, piece) {
    clearPossibleMoves();

    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(row, col, toRow, toCol, piece)) {
                const square = document.querySelector(`.square[data-row="${toRow}"][data-col="${toCol}"]`);
                if (square) {
                    if (boardState[toRow][toCol] === '') {
                        const circle = document.createElement('div');
                        circle.classList.add('possible-move');
                        square.appendChild(circle);
                    } else {
                        square.classList.add('capturable');
                    }
                }
            }
        }
    }
}


// Enhanced isKingInCheck with complete attack detection
function isKingInCheck(color, customBoard = boardState) {
    const king = color === 'white' ? 'K' : 'k';
    let kingPos = null;

    // Find the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (customBoard[row][col] === king) {
                kingPos = { row, col };
                break;
            }
        }
        if (kingPos) break;
    }

    if (!kingPos) return true; // Shouldn't happen in normal game

    // Check all enemy pieces that can attack the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = customBoard[row][col];
            if (piece && 
                ((color === 'white' && piece === piece.toLowerCase()) ||
                 (color === 'black' && piece === piece.toUpperCase()))) {
                
                // Special case for pawn attacks
                if (piece.toLowerCase() === 'p') {
                    const pawnDir = piece === 'p' ? 1 : -1;
                    if (Math.abs(col - kingPos.col) === 1 && 
                        row + pawnDir === kingPos.row) {
                        return true;
                    }
                    continue;
                }

                // For other pieces, use their movement rules
                if (isValidMoveWithoutCheck(row, col, kingPos.row, kingPos.col, piece, customBoard)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// Helper function for check detection (doesn't consider checks)
function isValidMoveWithoutCheck(fromRow, fromCol, toRow, toCol, piece, board) {
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);

    switch (piece.toLowerCase()) {
        case 'p':
            // Only check diagonal captures for pawn attacks
            return (dx === 1 && dy === 1) && 
                   ((piece === 'P' && toRow < fromRow) || 
                    (piece === 'p' && toRow > fromRow));
        case 'r':
            return (fromRow === toRow || fromCol === toCol) && 
                   isPathClear(fromRow, fromCol, toRow, toCol, board);
        case 'n':
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        case 'b':
            return dx === dy && isPathClear(fromRow, fromCol, toRow, toCol, board);
        case 'q':
            return (dx === dy || dx === 0 || dy === 0) && 
                   isPathClear(fromRow, fromCol, toRow, toCol, board);
        case 'k':
            return dx <= 1 && dy <= 1;
        default:
            return false;
    }
}

// Modified isPathClear to work with custom boards
function isPathClear(fromRow, fromCol, toRow, toCol, board = boardState) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol] !== '') {
            return false;
        }
        currentRow += rowStep;
        currentCol += colStep;
    }

    return true;
}



function highlightCheckedKing() {

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
                movePiece(fromRow, fromCol, row, col, boardState);
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


function performCastling(fromRow, fromCol, toRow, toCol) {
    const isKingside = toCol > fromCol;
    const rookCol = isKingside ? 7 : 0;
    const rookNewCol = isKingside ? toCol - 1 : toCol + 1;

    
    // Move the rook
    movePiece(fromRow, rookCol, toRow, rookNewCol, boardState);

    // Move the king
    movePiece(fromRow, fromCol, toRow, toCol, boardState);


    // Update castling rights
    castlingRights[currentPlayer].kingside = false;
    castlingRights[currentPlayer].queenside = false;

    // Switch the player
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    switchTimer();
}

function performEnPassant(fromRow, fromCol, toRow, toCol) {
    const capturedPawnRow = currentPlayer === 'white' ? toRow + 1 : toRow - 1;
    const capturedPiece = boardState[capturedPawnRow][toCol];

    if (capturedPiece) {
        capturePiece(capturedPawnRow, toCol); // capture before deleting
        boardState[capturedPawnRow][toCol] = '';
    }

    movePiece(fromRow, fromCol, toRow, toCol, boardState);
}


function getPositionKey() {
    return JSON.stringify(boardState) + currentPlayer;
}

function recordPosition() {
    const key = getPositionKey();
    positionHistory[key] = (positionHistory[key] || 0) + 1;

    if (positionHistory[key] === 3) {
        setTimeout(() => {
            showResultMessage("Draw by threefold repetition!");
            // document.getElementById('board').style.pointerEvents = 'none';
        }, 10);
    }
}

function movePiece(fromRow, fromCol, toRow, toCol,boardState,supressNotation = false) {
    const piece = boardState[fromRow][fromCol];
    const prevc = boardState[toRow][toCol];


    moveHistory.push({
    board: copyBoardState(boardState),
    currentPlayer,
    castlingRights: JSON.parse(JSON.stringify(castlingRights)),
    enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null
    });

    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = '';
    
    // Pawn promotion
    if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
        showPromotionDialog(toRow, toCol, currentPlayer === 'white');
        return; // Delay the rest of movePiece() until promotion selection is done
    }

    // Update en passant target
    if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
    } else {
        enPassantTarget = null;
    }

    // Update castling rights if king or rook moves

    // if (piece === 'K') {
    //     castlingRights.white.kingside = false;
    //     castlingRights.white.queenside = false;
    // } else if (piece === 'k') {
    //     castlingRights.black.kingside = false;
    //     castlingRights.black.queenside = false;
    // } else if (piece === 'R') {
    //     if (fromCol === 0) castlingRights.white.queenside = false;
    //     if (fromCol === 7) castlingRights.white.kingside = false;
    // } else if (piece === 'r') {
    //     if (fromCol === 0) castlingRights.black.queenside = false;
    //     if (fromCol === 7) castlingRights.black.kingside = false;
    // }

    updateCastlingRights(fromRow, fromCol, piece);

    createBoard();

    // const oldPlayer = currentPlayer;
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';



    // Generate algebraic notation --------------------------------------
    
    let notation;

    if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
        notation = (toCol > fromCol) ? 'O-O' : 'O-O-O';
    } else {
        notation = getAlgebraicNotation(fromCol, toRow, toCol, piece, prevc);

        // Add promotion suffix if applicable
        if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
            notation += '=Q'; // Default to queen; update dynamically later if needed
        }
    }

    const moveHistoryDiv = document.getElementById("move-history");
    const lastMovePair = moveHistoryDiv.lastElementChild;

    if (currentPlayer === "black" || !lastMovePair) {
        const moveEntry = document.createElement("div");
        moveEntry.textContent = `${Math.ceil((moveHistoryDiv.children.length + 1))}. ${notation}`;
        moveHistoryDiv.appendChild(moveEntry);
    } else {
        lastMovePair.innerHTML += ` \xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0             ${notation}`;
    }

    // Check for checkmate/stalemate
    if (checkGameEnd()) {
        // Game ended, disable further moves
        document.getElementById('board').style.pointerEvents = 'none';
        return;
    }

    switchTimer();
    highlightLastMove(fromRow, fromCol, toRow, toCol);

    recordPosition();
}




function showResultMessage(message) {
    const overlay = document.getElementById("result-overlay");
    const text = document.getElementById("result-text");

    text.textContent = message;
    overlay.classList.remove("hidden");

    document.getElementById('board').style.pointerEvents = 'none';
}


function undoMove() {
    if (moveHistory.length === 0) return;

    const last = moveHistory.pop();
    boardState = last.board;
    currentPlayer = last.currentPlayer;
    castlingRights = last.castlingRights;
    enPassantTarget = last.enPassantTarget;
    createBoard();
    switchTimer(); // optionally switch back timer

    // Remove last entry from move history display
    const moveHistoryDiv = document.getElementById("move-history");
    moveHistoryDiv.removeChild(moveHistoryDiv.lastElementChild);

    // Remove position record (not strictly necessary but cleaner)
    const key = getPositionKey();
    if (positionHistory[key] > 0) positionHistory[key]--;
}

// Add these new functions to your chess365.js file:

// Check for checkmate or stalemate after each move
function checkGameEnd() {
    const opponent = currentPlayer === 'white' ? 'white' : 'black';
    
    if (isCheckmate(opponent)) {
        setTimeout(() => {
            showResultMessage(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`);
        }, 10);
        return true;
    }
    
    if (isStalemate(opponent)) {
        setTimeout(() => {
            showResultMessage("Stalemate! The game is a draw.");
        }, 10);
        return true;
    }
    
    return false;
}



function isCheckmate(color) {
    if (!isKingInCheck(color)) return false;

    return !hasLegalMoves(color);
}

function isStalemate(color) {
    if (isKingInCheck(color)) return false;

    return !hasLegalMoves(color);
}

function hasLegalMoves(color) {
    const tempPlayer = currentPlayer;
    currentPlayer = color; // Temporarily switch for validation

    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = boardState[fromRow][fromCol];
            if (!piece || (color === 'white' && piece !== piece.toUpperCase()) ||
                          (color === 'black' && piece !== piece.toLowerCase())) {
                continue;
            }

            for (let toRow = 0; toRow < 8; toRow++) {
                for (let toCol = 0; toCol < 8; toCol++) {
                    if (isValidMove(fromRow, fromCol, toRow, toCol, piece)) {
                        currentPlayer = tempPlayer;
                        return true;
                    }
                }
            }
        }
    }

    currentPlayer = tempPlayer;
    return false;
}



function updateCastlingRights(fromRow, fromCol, piece) {
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
}



function getAlgebraicNotation(fromCol, toRow, toCol, piece, capturedPiece) {
    const files = 'abcdefgh';
    const ranks = '87654321';

    let notation = '';
    if (piece.toLowerCase() !== 'p') {
        notation += piece.toUpperCase(); // Piece letter (except for pawns)
    }
    
    if (capturedPiece !== '') {
        if (piece.toLowerCase() === 'p') {
            notation += files[fromCol]; // Pawn captures show file letter
        }
        notation += 'x'; // Capture notation
    }

    notation += files[toCol] + ranks[toRow]; // Destination square
    return notation;
}

function capturePiece(row, col) {
    const capturedPiece = boardState[row][col];
    const img = `<img src="https://www.chess.com/chess-themes/pieces/classic/300/${pieceImages[capturedPiece]}" alt="${capturedPiece}"/>`;
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


createBoard();

let timers = {
    player1: 100 * 60, // 10 minutes in seconds
    player2: 100 * 60
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

function showPromotionDialog(row, col, isWhite) {
    const dialog = document.getElementById("promotion-dialog");
    
    const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    const rect = square.getBoundingClientRect();

    dialog.style.position = 'absolute';
    dialog.style.left = `${rect.left + window.scrollX}px`;
    dialog.style.top = `${rect.top + window.scrollY}px`;
    dialog.classList.remove("hidden");


    const buttons = dialog.querySelectorAll("button");
    buttons.forEach(btn => {
        btn.onclick = () => {
            const selected = btn.dataset.piece;

            boardState[row][col] = isWhite ? selected.toUpperCase() : selected.toLowerCase();
            dialog.classList.add("hidden");
            createBoard();

            const moveHistoryDiv = document.getElementById("move-history");
            const lastMoveEntry = moveHistoryDiv.lastElementChild;
            if (lastMoveEntry && lastMoveEntry.textContent.includes('=Q')) {
                lastMoveEntry.textContent = lastMoveEntry.textContent.replace('=Q', `=${selected.toUpperCase()}`);
            }

            currentPlayer = isWhite ? 'black' : 'white';
            switchTimer();

        };
    });
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

            const winner = activeTimer === 'player1' ? 'White' : 'Black';
            const loser = activeTimer === 'player1' ? 'Black' : 'White';

            showResultMessage(`${loser} ran out of time! ${winner} wins!`);
            document.getElementById('board').style.pointerEvents = 'none';
        }

    }, 1000);
}


function handleMouseUp(e) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    if (!draggingPiece || !selectedSquare) return;

    // Find the square under the cursor
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const squareElement = targetElement?.closest('.square');

    const { row: fromRow, col: fromCol } = selectedSquare;
    const piece = boardState[fromRow][fromCol];

    if (squareElement) {
        const toRow = parseInt(squareElement.dataset.row, 10);
        const toCol = parseInt(squareElement.dataset.col, 10);

        // Validate the move
        const valid = isValidMove(fromRow, fromCol, toRow, toCol, piece);
        const isCastle = piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2 && canCastle(fromRow, fromCol, toCol);
        const isEnPassant = piece.toLowerCase() === 'p' && enPassantTarget &&
                            toRow === enPassantTarget.row && toCol === enPassantTarget.col;

        if (isCastle) {
            performCastling(fromRow, fromCol, toRow, toCol);
        } else if (isEnPassant) {
            performEnPassant(fromRow, fromCol, toRow, toCol);
        } else if (valid) {
            if (boardState[toRow][toCol]) {
                capturePiece(toRow, toCol);
            }
            movePiece(fromRow, fromCol, toRow, toCol, boardState);
        }
    }

    // Clean up visual drag piece
    if (draggingPiece && draggingPiece.parentNode) {
        draggingPiece.parentNode.removeChild(draggingPiece);
    }

    // Unhide the original image if move was invalid
    const originalSquare = document.querySelector(`.square[data-row="${selectedSquare.row}"][data-col="${selectedSquare.col}"]`);
    const originalImg = originalSquare?.querySelector('img');
    if (originalImg) originalImg.style.visibility = 'visible';

    draggingPiece = null;
    selectedSquare = null;
    clearPossibleMoves();


    // new added

    document.querySelectorAll('.square.hovered').forEach(sq =>
    sq.classList.remove('hovered')
);

}


let draggingPiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function handleMouseDown(e, row, col) {
    const piece = boardState[row][col];
    if (!piece) return;

    if ((currentPlayer === 'white' && piece !== piece.toUpperCase()) ||
        (currentPlayer === 'black' && piece !== piece.toLowerCase())) {
        return;
    }

    selectedSquare = { row, col };
    showPossibleMoves(row, col, piece);

    // Clear previous highlights
    document.querySelectorAll('.square.highlight').forEach(sq =>
    sq.classList.remove('highlight')
    );

    // Highlight the current square
    const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    if (square) square.classList.add('highlight');

    draggingPiece = e.target.cloneNode(true);
    draggingPiece.style.position = 'absolute';
    draggingPiece.style.pointerEvents = 'none';
    draggingPiece.style.zIndex = 1000;
    draggingPiece.style.width = e.target.offsetWidth + 'px';
    draggingPiece.style.height = e.target.offsetHeight + 'px';

    document.body.appendChild(draggingPiece);

    const rect = e.target.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    moveDraggedPiece(e.pageX, e.pageY);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    e.preventDefault();
    e.stopPropagation();
    e.target.style.visibility = 'hidden';
}

function handleMouseMove(e) {
    moveDraggedPiece(e.pageX, e.pageY);

    // Remove previous hover styles
    document.querySelectorAll('.square.hovered').forEach(sq =>
        sq.classList.remove('hovered')
    );

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const square = target?.closest('.square');
    if (square) {
        square.classList.add('hovered');
    }
}


function moveDraggedPiece(pageX, pageY) {
    if (draggingPiece) {
        draggingPiece.style.left = pageX - dragOffsetX + 'px';
        draggingPiece.style.top = pageY - dragOffsetY + 'px';
    }
}

updateDisplay();
