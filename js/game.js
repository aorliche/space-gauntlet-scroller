
import {$, $$, drawText} from './util.js';
import {clonePoint, Point, Stage} from './stage.js';
import {addActors, addCells, addPlayerAndExit, addTrees, addWater} from './proc.js';
import {makeRooms} from './rooms.js';
	
const PLAY_PROC = true;

class Game {
    constructor(params) {
        this.stage = params.stage;
        this.stage.showGrid = false;
        this.levels = params.levels;
        this.levelIdx = 0;
    }
    
    draw() {
        this.stage.draw();
        if (this.stage.player) {
            const ctx = this.stage.ctx;
			const sprites = this.stage.sprites;
			// Draw level
			ctx.save();
			ctx.globalAlpha = 0.8;
			ctx.fillStyle = '#aaf';
			ctx.fillRect(0, 5, this.stage.canvas.width, 40);
			ctx.strokeRect(0, 5, this.stage.canvas.width, 40);
			ctx.restore();
			if (PLAY_PROC) {
				drawText(ctx, `Level ${this.levelIdx}`, new Point(this.stage.canvas.width/2, 32), 'black', '24px sans-serif');
			}
			// Draw Stats
			ctx.save();
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = '#faa';
			ctx.fillRect(0, 50, this.stage.canvas.width, 40);
			ctx.strokeRect(0, 50, this.stage.canvas.width, 40);
			ctx.restore();
			for (let i=0; i<this.stage.player.hp; i++) {
				ctx.drawImage(sprites['Health'], 10+32*i, 55, 30, 30); 
			}
			ctx.drawImage(sprites['Arrows'], this.stage.canvas.width-220, 52, 32, 32); 
			ctx.drawImage(sprites['Fireballs'], this.stage.canvas.width-150, 52, 32, 32); 
			ctx.drawImage(sprites['Key'], this.stage.canvas.width-80, 52, 32, 32); 
            const pArrows = new Point(this.stage.canvas.width-185, 80);
            const pBalls = new Point(this.stage.canvas.width-115, 80);
            const pKeys = new Point(this.stage.canvas.width-45, 80);
            pArrows.ljust = true;
            pBalls.ljust = true;
            pKeys.ljust = true;
            drawText(ctx, `${this.stage.player.arrows}`, pArrows, 'black', '24px sans-serif');
            drawText(ctx, `${this.stage.player.fb}`, pBalls, 'black', '24px sans-serif');
            drawText(ctx, `${this.stage.player.keys}`, pKeys, 'black', '24px sans-serif');
        }
    }
    
    keydown(e) {
        if (!this.stage.player) {
            return;
        }
        if (e.code === 'ArrowLeft') {
            this.stage.player.lr = -1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'ArrowRight') {
            this.stage.player.lr = 1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'ArrowUp') {
            this.stage.player.ud = 1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'ArrowDown') {
            this.stage.player.ud = -1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'Space') {
            this.stage.player.shooting = true;
            this.stage.player.shootNow(this.ts);
        }
        if (e.key === 'Alt') {
            this.stage.player.fbing = true;
            this.stage.player.fireballNow(this.ts);
        }
    }

    keyup(e) {
        if (!this.stage.player) {
            return;
        }
        if (e.code === 'ArrowLeft') {
            this.stage.player.lr = 0;
        }
        if (e.code === 'ArrowRight') {
            this.stage.player.lr = 0;
        }
        if (e.code === 'ArrowUp') {
            this.stage.player.ud = 0;
        }
        if (e.code === 'ArrowDown') {
            this.stage.player.ud = 0;
        }
        if (e.code === 'Space') {
            this.stage.player.shooting = false;
        }
        if (e.key === 'Alt') {
            this.stage.player.fbing = false;
        }
    }

    loop(stop) {
        this.stoploop = stop ? true : false;
        if (stop) return;
        this.ts = 0;
        let prev = null;
        const self = this;
        const fn = function(ts) {
            if (self.stoploop) {
                return;
            }
            if (prev === null) {
                prev = ts;
            } else {
                const dt = Math.round(1000/30);
                const next = prev + dt;
                if (ts < next) {
                    window.requestAnimationFrame(fn);
                    return;
                }
                // Hack for window losing focus
                // And scheduling a billion frames back to back
				// Also for requestAnimationFrame being too slow
                if (ts > prev + 5*dt) {
                    prev = ts;
                } else {
                    prev = next;
                }
            }
            self.ts++;
			self.stage.tick(self.ts);
            self.draw();
            window.requestAnimationFrame(fn);
        }
        window.requestAnimationFrame(fn);
    }
}

window.addEventListener('load', () => {
    const canvas = $('#game-canvas');
    const miniMap = $('#game-minimap');
    const levels = $$('#levels option').map(opt => opt.value);
    let stage = new Stage(canvas, miniMap);
    const game = new Game({stage, levels});

    function nextLevel(first) {
        if (!first) {
            game.levelIdx++;
        }
		// Play procedurally generated game
		if (PLAY_PROC) {
			const idx = game.levelIdx;
			const levelSize = 20+idx*5;
			let data = makeRooms({size: [levelSize, levelSize], roomSize: [12, 10], roomSizeSigma: [3, 3], nearLimit: 6});
            data = addWater(data, 0.08, 10, 5);
            data = addTrees(data, 0.25);
            data = addActors(data, 'C', 0.03);	// Crates
			data = addPlayerAndExit(data);
            data = addActors(data, 'S', 0.015+idx*0.002);  // Melee
            data = addActors(data, 'A', 0.015+idx*0.002);  // Archer
            data = addActors(data, 'B', 0.005+idx*0.001);  // BigBoy
            data = addActors(data, 'O', 0.015+idx*0.001);  // Arrows
            data = addActors(data, 'F', 0.005+idx*0.001);  // Fireballs
            data = addActors(data, 'H', idx > 5 ? 0.005 : 0.01-idx*0.001);	// Health
			if (first) {
				stage.loadProc(data);
				game.loop();
            } else {
                // Copy player health and items
                const st = stage.player.state;
				// Make a whole new stage because of ridiculous player duplication
				// and possibly actor duplication bug
				// Maybe due to requestAnimationFrame ticks, never figured it out
				const nstage = new Stage(canvas, miniMap);
				nstage.sprites = stage.sprites;
				stage = nstage;
				game.stage = stage;
				game.stage.nextLevelCb = nextLevel;
                stage.loadProc(data);
                stage.player.state = st;
            }
            stage.pos = clonePoint(stage.player.pos);
			return;
		}
		// Play hand-crafted levels
        if (game.levelIdx >= game.levels.length) {
            game.levelIdx = 0;
        }
        fetch(`levels/${game.levels[game.levelIdx]}`)
        .then(res => res.json())
        .then(data => {
            if (first) {
                // Start loop
                stage.load(data);
                game.loop();
            } else {
                // Copy player health and items
                const st = stage.player.state;
                stage.load(data);
                stage.player.state = st;
            }
            stage.pos = clonePoint(stage.player.pos);
        });
    }

    game.stage.nextLevelCb = nextLevel;
	game.stage.loadSprites(() => nextLevel(true));

    document.addEventListener('keydown', (e) => {
        game.keydown(e);
    });
    
    document.addEventListener('keyup', (e) => {
        game.keyup(e);
    });
});
