const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const statusEl = document.getElementById("status");

const winModal = document.getElementById("winModal");
const siteInput = document.getElementById("siteInput");
const goButton = document.getElementById("goButton");
const cancelButton = document.getElementById("cancelButton");

const paddle = {
  width: 125,
  height: 16,
  x: canvas.width / 2 - 62.5,
  y: canvas.height - 28,
  speed: 9,
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 55,
  radius: 17,
  dx: 4,
  dy: -4,
};

const brick = {
  rows: 5,
  cols: 9,
  width: 72,
  height: 28,
  gap: 12,
  top: 68,
  left: 36,
};

const bricks = [];
let score = 0;
let lives = 3;
let gameOver = false;
let gameWon = false;

function buildBricks() {
  for (let r = 0; r < brick.rows; r += 1) {
    bricks[r] = [];
    for (let c = 0; c < brick.cols; c += 1) {
      bricks[r][c] = {
        x: brick.left + c * (brick.width + brick.gap),
        y: brick.top + r * (brick.height + brick.gap),
        visible: true,
      };
    }
  }
}

function drawBanana(x, y, width, height) {
  ctx.save();
  const cx = x + width / 2;
  const cy = y + height / 2;
  ctx.translate(cx, cy);
  ctx.scale(width / 80, height / 40);

  ctx.beginPath();
  ctx.moveTo(-30, 10);
  ctx.quadraticCurveTo(0, -18, 30, 10);
  ctx.quadraticCurveTo(0, 17, -30, 10);
  ctx.closePath();
  ctx.fillStyle = "#f8e85a";
  ctx.fill();
  ctx.strokeStyle = "#e3bc1f";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-28, 8);
  ctx.quadraticCurveTo(0, -9, 28, 8);
  ctx.strokeStyle = "#f5f4d0";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();
}

function drawStrawberry(x, y, radius) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#df3153";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - radius * 0.7, y - radius * 0.4);
  ctx.quadraticCurveTo(x, y + radius * 1.1, x + radius * 0.7, y - radius * 0.4);
  ctx.closePath();
  ctx.fillStyle = "#e83e61";
  ctx.fill();

  ctx.fillStyle = "#ffd95f";
  for (let i = 0; i < 14; i += 1) {
    const angle = (Math.PI * 2 * i) / 14;
    const sx = x + Math.cos(angle) * (radius * 0.65);
    const sy = y + Math.sin(angle) * (radius * 0.5);
    ctx.fillRect(sx - 1.2, sy - 1.2, 2.4, 2.4);
  }

  ctx.beginPath();
  ctx.ellipse(x, y - radius * 0.82, radius * 0.58, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3ea947";
  ctx.fill();

  ctx.restore();
}

function drawPaddle() {
  ctx.fillStyle = "#15253b";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBricks() {
  bricks.forEach((row) => {
    row.forEach((b) => {
      if (b.visible) {
        drawBanana(b.x, b.y, brick.width, brick.height);
      }
    });
  });
}

function resetBallAndPaddle() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 55;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
  ball.dy = -4;
  paddle.x = canvas.width / 2 - paddle.width / 2;
}

function collisionDetection() {
  bricks.forEach((row) => {
    row.forEach((b) => {
      if (!b.visible) return;

      const overlapsX = ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + brick.width;
      const overlapsY = ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + brick.height;

      if (overlapsX && overlapsY) {
        b.visible = false;
        ball.dy *= -1;
        score += 10;
        scoreEl.textContent = `Score: ${score}`;
      }
    });
  });

  if (score === brick.rows * brick.cols * 10) {
    gameWon = true;
    statusEl.textContent = "All bananas cleared!";
    winModal.classList.remove("hidden");
    siteInput.focus();
  }
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawPaddle();
  drawStrawberry(ball.x, ball.y, ball.radius);

  if (gameOver || gameWon) return;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1;
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
  }

  if (
    ball.y + ball.radius > paddle.y &&
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.width
  ) {
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.dx = hitPos * 5;
    ball.dy = -Math.abs(ball.dy);
  }

  if (ball.y + ball.radius > canvas.height) {
    lives -= 1;
    livesEl.textContent = `Lives: ${lives}`;

    if (lives <= 0) {
      gameOver = true;
      statusEl.textContent = "Game over! Refresh to play Fruit Out again.";
      return;
    }

    resetBallAndPaddle();
  }

  collisionDetection();

  requestAnimationFrame(drawFrame);
}

const keys = { left: false, right: false };

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    keys.left = true;
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    keys.right = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    keys.left = false;
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    keys.right = false;
  }
});

function updatePaddle() {
  if (keys.left) {
    paddle.x = Math.max(0, paddle.x - paddle.speed);
  }

  if (keys.right) {
    paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
  }

  if (!gameOver && !gameWon) {
    requestAnimationFrame(updatePaddle);
  }
}

function destinationFromInput(rawValue) {
  const value = rawValue.trim();
  if (!value) return null;

  const hasProtocol = /^https?:\/\//i.test(value);
  if (hasProtocol) {
    return value;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

goButton.addEventListener("click", () => {
  const destination = destinationFromInput(siteInput.value);
  if (!destination) {
    siteInput.focus();
    return;
  }

  window.location.href = destination;
});

cancelButton.addEventListener("click", () => {
  winModal.classList.add("hidden");
});

siteInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    goButton.click();
  }
});

buildBricks();
scoreEl.textContent = `Score: ${score}`;
livesEl.textContent = `Lives: ${lives}`;
requestAnimationFrame(drawFrame);
requestAnimationFrame(updatePaddle);
