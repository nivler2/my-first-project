const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const matchTimerEl = document.getElementById("matchTimer");
const comboEl = document.getElementById("combo");
const comboTimerEl = document.getElementById("comboTimer");
const coreHealthEl = document.getElementById("coreHealth");
const playerHealthEl = document.getElementById("playerHealth");
const statusEl = document.getElementById("status");

const COLOR_SET = {
  red: { hex: "#ff4862", key: "1" },
  blue: { hex: "#51adff", key: "2" },
  green: { hex: "#43e77b", key: "3" },
};
const COLOR_KEYS = Object.keys(COLOR_SET);

const state = {
  score: 0,
  matchTime: 180,
  comboCount: 0,
  comboTime: 0,
  coreHealth: 100,
  playerHealth: 100,
  spawnClock: 0,
  fireClock: 0,
  gameOver: false,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2 + 120,
  radius: 14,
  speed: 260,
  color: "red",
  dashCooldown: 0,
  pulseCooldown: 0,
};

const core = { x: canvas.width / 2, y: canvas.height / 2, radius: 34 };
const enemies = [];
const bullets = [];
const keys = new Set();
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnEnemy(intensity) {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = rand(0, canvas.width);
    y = -20;
  } else if (edge === 1) {
    x = canvas.width + 20;
    y = rand(0, canvas.height);
  } else if (edge === 2) {
    x = rand(0, canvas.width);
    y = canvas.height + 20;
  } else {
    x = -20;
    y = rand(0, canvas.height);
  }

  const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
  enemies.push({
    x,
    y,
    radius: rand(10, 16),
    speed: rand(55, 105) + intensity * 7,
    health: 22 + intensity * 2,
    color,
  });
}

function fireBullet() {
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * 580,
    vy: Math.sin(angle) * 580,
    radius: 4,
    color: player.color,
    life: 0.9,
  });
}

function pulse() {
  if (player.pulseCooldown > 0) return;
  player.pulseCooldown = 3;
  enemies.forEach((enemy) => {
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (d < 130 && enemy.color === player.color) {
      enemy.health -= 28;
    }
  });
}

function dash() {
  if (player.dashCooldown > 0) return;
  player.dashCooldown = 1.7;
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  player.x += Math.cos(angle) * 110;
  player.y += Math.sin(angle) * 110;
  player.x = Math.min(canvas.width - 8, Math.max(8, player.x));
  player.y = Math.min(canvas.height - 8, Math.max(8, player.y));
}

function registerKill(matched) {
  state.score += matched ? 150 : 70;
  state.comboCount += 1;
  state.comboTime = 2.4;
}

function update(dt) {
  if (state.gameOver) return;

  state.matchTime -= dt;
  state.spawnClock += dt;
  state.fireClock -= dt;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.pulseCooldown = Math.max(0, player.pulseCooldown - dt);

  if (state.comboTime > 0) {
    state.comboTime -= dt;
  } else {
    state.comboCount = 0;
  }

  const intensity = Math.floor((180 - state.matchTime) / 30);
  const spawnInterval = Math.max(0.2, 0.82 - intensity * 0.07);
  if (state.spawnClock >= spawnInterval) {
    state.spawnClock = 0;
    const pack = 1 + Math.floor(intensity / 2);
    for (let i = 0; i < pack; i += 1) spawnEnemy(intensity);
  }

  let moveX = 0;
  let moveY = 0;
  if (keys.has("ArrowUp") || keys.has("w")) moveY -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) moveY += 1;
  if (keys.has("ArrowLeft") || keys.has("a")) moveX -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) moveX += 1;
  const len = Math.hypot(moveX, moveY) || 1;
  player.x += (moveX / len) * player.speed * dt;
  player.y += (moveY / len) * player.speed * dt;
  player.x = Math.min(canvas.width - player.radius, Math.max(player.radius, player.x));
  player.y = Math.min(canvas.height - player.radius, Math.max(player.radius, player.y));

  if (mouse.down && state.fireClock <= 0) {
    fireBullet();
    state.fireClock = 0.09;
  }

  bullets.forEach((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  });

  enemies.forEach((enemy) => {
    const toCoreX = core.x - enemy.x;
    const toCoreY = core.y - enemy.y;
    const mag = Math.hypot(toCoreX, toCoreY) || 1;
    enemy.x += (toCoreX / mag) * enemy.speed * dt;
    enemy.y += (toCoreY / mag) * enemy.speed * dt;

    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius) {
      state.playerHealth -= 20 * dt;
    }
    if (Math.hypot(enemy.x - core.x, enemy.y - core.y) < enemy.radius + core.radius) {
      state.coreHealth -= 25 * dt;
    }
  });

  bullets.forEach((b) => {
    enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;
      const hit = Math.hypot(enemy.x - b.x, enemy.y - b.y) < enemy.radius + b.radius;
      if (!hit) return;

      const matched = enemy.color === b.color;
      enemy.health -= matched ? 24 : 9;
      b.life = 0;
      if (enemy.health <= 0) registerKill(matched);
    });
  });

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].health <= 0) enemies.splice(i, 1);
  }
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const out = bullets[i].x < -30 || bullets[i].x > canvas.width + 30 || bullets[i].y < -30 || bullets[i].y > canvas.height + 30;
    if (out || bullets[i].life <= 0) bullets.splice(i, 1);
  }

  if (state.matchTime <= 0) {
    state.matchTime = 0;
    state.gameOver = true;
    statusEl.textContent = state.coreHealth > 0 ? "Round clear! Core defended." : "Timer hit zero, but the core was destroyed.";
  }

  if (state.coreHealth <= 0 || state.playerHealth <= 0) {
    state.gameOver = true;
    statusEl.textContent = state.coreHealth <= 0 ? "Core destroyed. Swarm victory." : "Hull failure. Pilot down.";
  }

  const comboMult = 1 + Math.floor(state.comboCount / 5);
  scoreEl.textContent = Math.round(state.score * comboMult);
  matchTimerEl.textContent = state.matchTime.toFixed(0);
  comboEl.textContent = comboMult;
  comboTimerEl.textContent = Math.max(0, state.comboTime).toFixed(1);
  coreHealthEl.textContent = Math.max(0, state.coreHealth).toFixed(0);
  playerHealthEl.textContent = Math.max(0, state.playerHealth).toFixed(0);
}

function drawArena() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 8; i += 1) {
    ctx.strokeStyle = `hsl(${205 + i * 8} 100% 60%)`;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 70 + i * 36, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(core.x, core.y, core.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#9ef3ff";
  ctx.shadowColor = "#7ceeff";
  ctx.shadowBlur = 26;
  ctx.fill();
  ctx.shadowBlur = 0;

  enemies.forEach((enemy) => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_SET[enemy.color].hex;
    ctx.shadowColor = COLOR_SET[enemy.color].hex;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_SET[b.color].hex;
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_SET[player.color].hex;
  ctx.shadowColor = COLOR_SET[player.color].hex;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;

  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  ctx.strokeStyle = "#f2f7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(angle) * 20, player.y + Math.sin(angle) * 20);
  ctx.stroke();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  drawArena();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(event.key);
  keys.add(key);
  if (key === COLOR_SET.red.key) player.color = "red";
  if (key === COLOR_SET.blue.key) player.color = "blue";
  if (key === COLOR_SET.green.key) player.color = "green";
  if (event.code === "Space") dash();
  if (event.key === "Shift") pulse();
  if (state.gameOver && key === "r") window.location.reload();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener("mousedown", () => {
  mouse.down = true;
});

canvas.addEventListener("mouseup", () => {
  mouse.down = false;
});

statusEl.textContent = "Defend the core. Press R to restart after defeat.";
requestAnimationFrame(loop);
