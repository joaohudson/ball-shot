(function(){

	const colors = ['red', 'green', 'blue'];
	const canvas = document.getElementById('canvas');
	const gl = canvas.getContext('2d');
	const audios = {};
	const images = {};
	
	const GAME_DURATION = 400;
	
	const BACKGROUND_SPEED = .3;
	
	const WEAPON_SIZE = 32;
	const WEAPON_SPEED = .5;
	
	const BULLET_LIFE_TIME = 500;
	const BULLET_SIZE = 5;
	const BULLET_SPEED = 20;
	
	const BALL_SIZE = 16;
	const BALL_PENALTY = 1;
	
	const PLAYER_SPEED = 5;
	const PLAYER_SIZE = 32;
	
	const WEAPON_RIFLE = {
		label: 'RIFLE',
		ammo: Infinity,
		fireRate: 15,
		piercing: false,
		spread: 0,
		fragmentCount: 0
	}
	
	const WEAPON_UZI = {
		label: 'UZI',
		ammo: 200,
		fireRate: 2,
		piercing: false,
		spread: 0,
		fragmentCount: 0
	}
	
	const WEAPON_SNIPER = {
		label: 'SNIPER',
		ammo: 40,
		fireRate: 25,
		piercing: true,
		spread: 0,
		fragmentCount: 0
	}
	
	const WEAPON_SHOTGUN = {
		label: 'SHOTGUN',
		ammo: 30,
		fireRate: 35,
		piercing: false,
		spread: 8,
		fragmentCount: 0
	}
	
	const WEAPON_PICA_DAS_GALAXIAS = {
		label: 'PICA DAS GALAXIAS',
		ammo: 200,
		fireRate: 4,
		piercing: true,
		spread: 32,
		fragmentCount: 0
	}
	
	const WEAPON_GRANADE_LAUNCHER = {
		label: 'GRENADE LAUNCHER',
		ammo: 40,
		fireRate: 30,
		piercing: false,
		spread: 0,
		fragmentCount: 8
	}
	
	const WEAPONS_LIST = [
		WEAPON_SNIPER,
		WEAPON_UZI,
		WEAPON_SHOTGUN,
		WEAPON_PICA_DAS_GALAXIAS,
		WEAPON_GRANADE_LAUNCHER
	]
	
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
		player: {x: 200, y: 460, points: 100, weapon: WEAPON_RIFLE, fireRate: 0, ammo: Infinity, smokeRate: 0},
		background: {offset: 0}
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
	
	function drawImage(x, y, image, blend){
		const xo = x - image.width * .5;
		const yo = y - image.height * .5;
		const defaultBlend = gl.globalCompositeOperation;
	
		if(blend){
			gl.globalCompositeOperation = blend;
		}

		gl.beginPath();
		gl.fillStyle = 'white';
		gl.drawImage(image, xo, yo);
		gl.closePath();

		gl.globalCompositeOperation = defaultBlend;
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
	
	function disorderedRemove(array, index){
		const value = array[index];
		const last = array.length - 1;
		array[index] = array[last];
		array[last] = value;
		array.length--;
	}
	
	function randomInt(max){
		return Math.floor(Math.random() * max);
	}
		
	function randomWeapon(){
		const index = randomInt(WEAPONS_LIST.length);
		
		return WEAPONS_LIST[index];
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
		
	function newBullet(x, y, dx, dy, fragmentCount){
		gameState.bullets.push({
			x: x,
			y: y,
			dir: {x: dx, y: dy},
			lifeTime: BULLET_LIFE_TIME,
			fragmentCount: fragmentCount
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

	function removePlayerPoints(points){
		gameState.player.points -= points;
		if(gameState.player.points <= 0){
			gameState.gameFinished = true;
		}
	}
	
	function updateCloud(){
		const ch = images.cloud.height;
	
		gameState.background.offset = (gameState.background.offset + BACKGROUND_SPEED) % ch;
	
		const offset = gameState.background.offset;
	
		gl.drawImage(images.cloud, 0, offset - ch);
	}
	
	function updateBalls(){
		for(let i = 0; i < gameState.balls.length; i++){
			let ball = gameState.balls[i];
			ball.y += ball.dir.y;
			ball.x += ball.dir.x;
	
			if(ball.y > 600){
				disorderedRemove(gameState.balls, i);
				removePlayerPoints(BALL_PENALTY);
				i--;
				continue;
			}
			
			if(!ball.alive){
				disorderedRemove(gameState.balls, i);
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
				disorderedRemove(gameState.particles, i);
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
				disorderedRemove(gameState.bullets, i);
				i--;
				continue;
			}
			
			for(let j = 0; j < gameState.balls.length; j++){
				const ball = gameState.balls[j];
				const dx = (ball.x - bullet.x);
				const dy = (ball.y - bullet.y);
				const distance = dx * dx + dy * dy;
				const collisioned = distance < BULLET_SIZE * BULLET_SIZE + BALL_SIZE * BALL_SIZE;
				
				if(collisioned && ball.alive){
					ball.alive = false;
					if(!gameState.player.weapon.piercing){
						bullet.lifeTime = 0;
					}
					
					for(let i = 0; i < bullet.fragmentCount; i++){
						const angle = Math.random() * Math.PI * 2;
						const dx = Math.cos(angle) * BULLET_SPEED;
						const dy = Math.sin(angle) * -BULLET_SPEED;
						newBullet(bullet.x, bullet.y, dx, dy, 0);
					}
	
					gameState.player.points++;
				}
			}
			
			drawImage(bullet.x, bullet.y, images.projectile, 'lighter');
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
				disorderedRemove(gameState.droppedWeapons, i);
				i--;
					
				changePlayerWeapon(droppedWeapon.info);
				audios.collect.play();
			}
		}
	}
		
	function updatePlayer(){
		const playerDir = inputs.right + inputs.left;
		let sprite = images.spaceship;
		
		gameState.player.x += PLAYER_SPEED * playerDir;
	
		if(playerDir > 0){
			sprite = images.spaceshipRight;
		}
		else if(playerDir < 0){
			sprite = images.spaceshipLeft;
		}
		
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
			const weapon = gameState.player.weapon;
			const player = gameState.player;
	
			if(weapon.spread == 0){
				newBullet(player.x, player.y, 0, -BULLET_SPEED, weapon.fragmentCount);	
			}
			else{
				for(let i = 0; i < weapon.spread; i++){
					const angle = Math.random() * Math.PI * .25 + Math.PI * .4;
					const dx = Math.cos(angle) * BULLET_SPEED;
					const dy = Math.sin(angle) * -BULLET_SPEED;
					newBullet(player.x, player.y, dx, dy);
				}
			}
			
			player.fireRate = weapon.fireRate;
			player.ammo--;
			if(player.ammo <= 0){
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
		
		drawImage(gameState.player.x, gameState.player.y, sprite);
		
		drawText(10, 10, 'POINTS: ' + gameState.player.points);
		
		drawText(canvas.width - 10, 10, gameState.player.weapon.label + ' : ' + gameState.player.ammo, 'right');
	}
	
	function updateGameTime(){
		drawText(canvas.width * .5, 10, 'TIME: ' + gameState.gameTime);
	}
	
	function update(){
		clearScreen();
		updateCloud();
		
		if(gameState.gamePaused){
			const xc = canvas.width * .5;
			const yc = canvas.height * .5;
			drawText(xc, yc, 'PRESS ENTER TO START', 'center');
			return;
		}
		
		if(gameState.gameFinished){
			const xc = canvas.width * .5;
			const yc = canvas.height * .5;
			const finishedText = gameState.player.points <= 0 ? 'GAME OVER' : 'TOTAL POINTS : ' + gameState.player.points;
			drawText(xc, yc, finishedText, 'center');
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
		
		if(gameState.gameTime > GAME_DURATION * .5){
			newBall(randomRange(min, max), -100, 0, 8);
		}
		else{
			newBall(randomRange(min, max), -100, 0, 8);
			newBall(randomRange(min, max), -100, 0, 8);
		}
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
		images.spaceshipLeft = await newImage('images/spaceship-left(64x64).png');
		images.spaceshipRight = await newImage('images/spaceship-right(64x64).png');
		images.airammo = await newImage('images/air-ammo(64x64).png');
		images.cloud = await newImage('images/cloud.png');
		images.projectile = await newImage('images/projectile(16x16).png');
		
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
		}, 350);
		gameState.timers.push(timer);
		
		timer = setInterval(() => {
			const max = canvas.width - PLAYER_SIZE;
			const min = PLAYER_SIZE;
			newWeapon(randomRange(min, max), -20, randomWeapon());
		}, 40000);
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

	function delay(time){
		return new Promise((res, rej) => {
			setTimeout(res, time);
		});
	}
	
	async function main(){
		
		//loading screen
		drawText(canvas.width * .5, canvas.height * .5, 'LOADING...', 'center');

		//evita mundaça súbita
		await delay(1000);

		await loadResources();
		
		setInterval(() => {
			update();
		}, 10);
	}
	
	main();
	
	})();
	