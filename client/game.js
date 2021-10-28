(function(){

const colors = ['red', 'green', 'blue'];
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('2d');
const audios = {};
const images = {};

const GAME_DURATION = 200;

const WEAPON_SIZE = 32;
const WEAPON_SPEED = .5;

const BULLET_LIFE_TIME = 500;
const BULLET_COLOR = 'yellow';
const BULLET_SIZE = 5;
const BULLET_SPEED = 20;

const BALL_SIZE = 16;

const PLAYER_SPEED = 5;
const PLAYER_SIZE = 32;

const WEAPON_RIFLE = {
	label: 'RIFLE',
	ammo: Infinity,
	fireRate: 15,
	piercing: false,
	spread: 0
}

const WEAPON_UZI = {
	label: 'UZI',
	ammo: 200,
	fireRate: 2,
	piercing: false,
	spread: 0
}

const WEAPON_SNIPER = {
	label: 'SNIPER',
	ammo: 40,
	fireRate: 25,
	piercing: true,
	spread: 0
}

const WEAPON_SHOTGUN = {
	label: 'SHOTGUN',
	ammo: 30,
	fireRate: 35,
	piercing: false,
	spread: 8
}

const WEAPON_PICADASGALAXIAS = {
	label: 'PICA DAS GALAXIAS',
	ammo: 1000,
	fireRate: 4,
	piercing: true,
	spread: 32
}

const inputs = {right: 0, left: 0, fire: false};
const gameState = {
	timers: [],
	balls: [],
	particles: [],
	bullets: [],
	droppedWeapons: [],
	gameTime: GAME_DURATION,
	gameFinished: false,
	gamePaused: true,
	player: {x: 200, y: 460, points: 0, weapon: WEAPON_RIFLE, fireRate: 0, ammo: Infinity, smokeRate: 0}
};
	
function drawCircle(x, y, color, size){
	const w = canvas.width;
	const h = canvas.height;

	if(x < 0 || y < 0 || x > w || y > h)
		return;
	gl.beginPath();
	gl.fillStyle = color;
	gl.arc(x, y, size, 0, 360);
	gl.fill();
	gl.closePath();
}

function drawImage(x, y, image){
	const xo = x - image.width * .5;
	const yo = y - image.height * .5;
	
	gl.beginPath();
	gl.fillStyle = 'white';
	gl.drawImage(image, xo, yo);
	gl.closePath();
}
	

function drawText(x, y, text, align, color){
	
	if(!align)
		align = 'left';
	
	if(!color)
		color = 'white';
	
	let xo = 0;
	let yo = 0;
	const dim = gl.measureText(text);
	
	switch(align){
		
		case 'left':
		xo = x;
		yo = y;
		break;
		
		case 'center':
		xo = x - dim.width * .5;
		yo = y;
		break;
		
		case 'right':
		xo = x - dim.width;
		yo = y;
		break;
	}
	
	gl.beginPath();
	gl.fillStyle = color;
	gl.fillText(text, xo, yo);
	gl.fill();
	gl.closePath();
}

function randomInt(max){
	return Math.floor(Math.random() * max);
}
	
function randomWeapon(){
	const index = randomInt(4);
	
	switch(index){
		case 0:
			return WEAPON_UZI;
			
		case 1:
			return WEAPON_SNIPER;
			
		case 2:
			return WEAPON_SHOTGUN;
			
		case 3:
			return WEAPON_PICADASGALAXIAS;
	}
}

function randomColor(){
	const index = Math.floor(Math.random() * colors.length);
	return colors[index];
}

function colorToBallSprite(color){
	switch(color){
		case 'red':
		return images.ballRed;
		
		case 'green':
		return images.ballGreen;
		
		case 'blue':
		return images.ballBlue;
	}
}

function randomRange(min, max){
	return Math.random() * (max - min) + min;
}

function newParticle(x, y, color){
	gameState.particles.push({
		x: x,
		y: y,
		size: Math.random() * 5 + 5,
		dir: {x: Math.random() * 8 - 4, y: Math.random() * 8 - 4},
		color: color
	});
}

function newParticleSmoke(x, y){
	gameState.particles.push({
		x: x,
		y: y,
		size: Math.random() * 3 + 5,
		dir: {x: Math.random() * .5, y: 1},
		color: '#4444AA33'
	});
}

function newSmoke(x, y){
	for(let i = 0; i < 8; i++){
		newParticleSmoke(x, y);
	}
}

function newExplosion(x, y, color){
	for(let i = 0; i < 32; i++){
		newParticle(x, y, color);
	}
}
	function newBall(x, y){
	const color = randomColor();
	gameState.balls.push({
		x: x,
		y: y,
		size: BALL_SIZE,
		dir: {x: 0, y: 1},
		color: color,
		sprite: colorToBallSprite(color),
		alive: true
	});
}
	
function newBullet(x, y, dx, dy){
	gameState.bullets.push({
		x: x,
		y: y,
		dir: {x: dx, y: dy},
		lifeTime: BULLET_LIFE_TIME
	});
}

function newWeapon(x, y, info){
	gameState.droppedWeapons.push({
		x: x,
		y: y,
		info: info
	});
}

function clearScreen(){
	gl.beginPath();
	gl.fillStyle = 'white';
	gl.drawImage(images.background, 0, 0);
	gl.closePath();
}

function changePlayerWeapon(weapon){
	gameState.player.weapon = weapon;
	gameState.player.ammo = weapon.ammo;
}

function updateBalls(){
	for(let i = 0; i < gameState.balls.length; i++){
		let ball = gameState.balls[i];
		ball.y += ball.dir.y;
		ball.x += ball.dir.x;

		if(ball.y > 600){
			gameState.balls.splice(i, 1);
			i--;
			continue;
		}
		
		if(!ball.alive){
			gameState.balls.splice(i, 1);
			i--;
			newExplosion(ball.x, ball.y, ball.color);
			if(audios.splash.currentTime > 0.05)
				audios.splash.currentTime = 0;
			audios.splash.play();
			
			continue;
		}
		
		drawImage(ball.x, ball.y, ball.sprite);
	}
}

function updateParticles(){
	for(let i = 0; i < gameState.particles.length; i++){
		let particle = gameState.particles[i];
		particle.y += particle.dir.y;
		particle.x += particle.dir.x;
		particle.size -= 0.2;
		
		if(particle.size <= 0){
			gameState.particles.splice(i, 1);
			i--;
			continue;
		}
		
		drawCircle(particle.x, particle.y, particle.color, particle.size);
	}
}

function updateBullets(){
	for(let i = 0; i < gameState.bullets.length; i++){
		const bullet = gameState.bullets[i];
		bullet.x += bullet.dir.x;
		bullet.y += bullet.dir.y;
		bullet.lifeTime--;
		
		if(bullet.lifeTime <= 0){
			gameState.bullets.splice(i, 1);
			i--;
			continue;
		}
		
		for(let j = 0; j < gameState.balls.length; j++){
			const ball = gameState.balls[j];
			const dx = (ball.x - bullet.x);
			const dy = (ball.y - bullet.y);
			const distance = dx * dx + dy * dy;
			
			if(distance < BULLET_SIZE * BULLET_SIZE + BALL_SIZE * BALL_SIZE){
				ball.alive = false;
				if(!gameState.player.weapon.piercing){
					bullet.lifeTime = 0;
				}
				
				gameState.player.points++;
			}
		}
		
		drawCircle(bullet.x, bullet.y, BULLET_COLOR, BULLET_SIZE);
	}
}

function updateDroppedWeapons(){
	for(let i = 0; i < gameState.droppedWeapons.length; i++){
		const droppedWeapon = gameState.droppedWeapons[i];
		const dx = (gameState.player.x - droppedWeapon.x);
		const dy = (gameState.player.y - droppedWeapon.y);
		const distance = dx * dx + dy * dy;
		
		droppedWeapon.y += WEAPON_SPEED;
		
		drawImage(droppedWeapon.x, droppedWeapon.y, images.airammo);
		
		if(distance < WEAPON_SIZE * WEAPON_SIZE + PLAYER_SIZE * PLAYER_SIZE){
			gameState.droppedWeapons.splice(i, 1);
			i--;
				
			changePlayerWeapon(droppedWeapon.info);
			audios.collect.play();
		}
	}
}
	
function updatePlayer(){
	const playerDir = inputs.right + inputs.left;
	
	gameState.player.x += PLAYER_SPEED * playerDir;
	
	if(gameState.player.x < PLAYER_SIZE){
		gameState.player.x = PLAYER_SIZE;
	}
	
	if(gameState.player.x > canvas.width - PLAYER_SIZE){
		gameState.player.x = canvas.width - PLAYER_SIZE;
	}
	
	if(gameState.player.fireRate > 0){
		gameState.player.fireRate--;
	}
	
	if(inputs.fire && gameState.player.fireRate <= 0){
		
		if(gameState.player.weapon.spread == 0){
			newBullet(gameState.player.x, gameState.player.y, 0, -BULLET_SPEED);	
		}
		else{
			for(let i = 0; i < gameState.player.weapon.spread; i++){
				const angle = Math.random() * Math.PI * .25 + Math.PI * .4;
				const dx = Math.cos(angle) * BULLET_SPEED;
				const dy = Math.sin(angle) * -BULLET_SPEED;
				newBullet(gameState.player.x, gameState.player.y, dx, dy);
			}
		}
		
		gameState.player.fireRate = gameState.player.weapon.fireRate;
		gameState.player.ammo--;
		if(gameState.player.ammo <= 0){
			changePlayerWeapon(WEAPON_RIFLE);
		}
	}

	if(gameState.player.smokeRate < 40){
		gameState.player.smokeRate++;
	}

	if(gameState.player.smokeRate >= 5){
		gameState.player.smokeRate = 0;
		newSmoke(gameState.player.x, gameState.player.y + 20);
	}
	
	drawImage(gameState.player.x, gameState.player.y, images.spaceship);
	
	drawText(10, 10, 'POINTS: ' + gameState.player.points);
	
	drawText(canvas.width - 10, 10, gameState.player.weapon.label + ' : ' + gameState.player.ammo, 'right');
}

function updateGameTime(){
	drawText(canvas.width * .5, 10, 'TIME: ' + gameState.gameTime);
}

function update(){
	clearScreen();
	
	if(gameState.gamePaused){
		const xc = canvas.width * .5;
		const yc = canvas.height * .5;
		drawText(xc, yc, 'PRESS ENTER TO START', 'center');
		return;
	}
	
	if(gameState.gameFinished){
		const xc = canvas.width * .5;
		const yc = canvas.height * .5;
		drawText(xc, yc, 'TOTAL SCORES : ' + gameState.player.points, 'center');
		drawText(xc, yc + 20, 'PRESS R TO RESTART', 'center');
		return;
	}
	
	updateBalls();
	
	updateParticles();
		
	updateBullets();
		
	updateDroppedWeapons();
		
	updatePlayer();
		
	updateGameTime();
}
	
function spawnerBall(){
	const max = canvas.width - PLAYER_SIZE;
	const min = PLAYER_SIZE;
	
	newBall(randomRange(min, max), -100, 0, 8);
}

async function newImage(url){
	const img = new Image();
	img.src = url;
	
	return new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
	});
}

async function loadResources(){
	images.background = await newImage('images/night.png');
	images.ballRed = await newImage('images/ball-red(32x32).png');
	images.ballGreen = await newImage('images/ball-green(32x32).png');
	images.ballBlue = await newImage('images/ball-blue(32x32).png');
	images.spaceship = await newImage('images/spaceship(64x64).png');
	images.airammo = await newImage('images/air-ammo(64x64).png');
	
	audios.splash = await new Audio('audios/splash.wav');
	audios.collect = await new Audio('audios/collect.wav');
	audios.end = await new Audio('audios/end.wav');
}

function startTimers(){
	let timer = null;

	timer = setInterval(() => {
		if(gameState.gameTime > 0){
			gameState.gameTime--;
		}
		else if(!gameState.gameFinished)
		{
			gameState.gameFinished = true;
			stopTimers();
			audios.end.play();
		}
	}, 1000);
	gameState.timers.push(timer);

		
	timer = setInterval(() => {
		spawnerBall();
	}, 100);
	gameState.timers.push(timer);
	
	timer = setInterval(() => {
		const max = canvas.width - PLAYER_SIZE;
		const min = PLAYER_SIZE;
		newWeapon(randomRange(min, max), -20, randomWeapon());
	}, 10000);
	gameState.timers.push(timer);
}

function stopTimers(){
	gameState.timers.forEach((t) => clearInterval(t));
	gameState.timers = [];
}

function restartGame(){
	
	gameState.balls = [];
	gameState.particles = [];
	gameState.bullets = [];
	gameState.droppedWeapons = [];
	gameState.gameTime = GAME_DURATION;
	gameState.gameFinished = false;
	gameState.player.points = 0;
	
	changePlayerWeapon(WEAPON_RIFLE);
	
	stopTimers();
	startTimers();
}

document.onkeydown = (e) => {
	
	e.preventDefault();
	
	if(gameState.gameFinished && e.key == 'r'){
		restartGame();
	}
	
	if(gameState.gamePaused && e.key == 'Enter'){
		gameState.gamePaused = false;
		startTimers();
	}
	
	if(e.key == ' '){
		inputs.fire = true;
	}
	
	if(e.key == 'ArrowRight'){
		inputs.right = 1;
	}
	
	if(e.key == 'ArrowLeft'){
		inputs.left = -1;
	}
};

document.onkeyup = (e) => {
	
	e.preventDefault();
	
	if(e.key == 'ArrowRight'){
		inputs.right = 0;
	}
	
	if(e.key == 'ArrowLeft'){
		inputs.left = 0;
	}
	
	if(e.key == ' '){
		inputs.fire = false;
	}
};

async function main(){
	await loadResources();
	
	setInterval(() => {
		update();
	}, 10);
}

main();

})();
