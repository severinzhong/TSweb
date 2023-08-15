import React, { useEffect, useRef } from "react";
import './Tetris.css';

//rules based on  https://tetris.fandom.com/wiki/Tetris_Guideline


function deepCopy<T>(obj: T) {
    return JSON.parse(JSON.stringify(obj));
}

function isMobileDevice() {
    return /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
const isMobile = isMobileDevice();

console.log(isMobile ? "这是手机" : "这是PC");

interface TetrisOptions {
    row: number;
    colume: number;
    tileSize: number;
}

interface TetrisInterface {
    x: number;
    y: number;
    shapeType: number;
    shape: number[][];
}

const tetrisColor = ['cyan', 'yellow', 'purple', 'green', 'red', 'blue', 'orange'];

const tetrisShape = [ // totoal 7 shape
    [[0, 0], [1, 0], [2, 0], [3, 0]], // I
    [[0, 0], [0, 1], [1, 0], [1, 1]], // O
    [[1, 0], [0, 1], [1, 1], [2, 1]], // T
    [[0, 1], [1, 1], [1, 0], [2, 0]], // S
    [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
    [[0, 1], [1, 1], [2, 1], [2, 0]], // J
    [[0, 0], [0, 1], [1, 1], [2, 1]], // L
]

const tetrisCenter = [
    [2, 1], [1, 1], [1.5, 1.5], [1.5, 1.5], [1.5, 1.5], [1.5, 1.5], [1.5, 1.5],
]

function tryVibrate(time: number = 200) {
    if ('vibrate' in navigator) {
        navigator.vibrate(time);
    }
}

class TetrisCanvasRender {
    canvas: HTMLCanvasElement | null;
    context: CanvasRenderingContext2D | null;
    status: TetrisOptions;
    constructor(canvas: HTMLCanvasElement | null, options?: Partial<TetrisOptions>) {
        console.log("TetrisCanvasRender init");
        this.canvas = canvas;
        this.context = canvas?.getContext('2d') || null;
        this.status = {
            row: options?.row || 20,
            colume: options?.colume || 10,
            tileSize: options?.tileSize || 10,
        }

    }
    getPattern(
        strokeStyle: string = 'rgb(0,0,0,1)',
        fillStyle: string = 'rgb(255,255,255,1)'
    ) {
        let tileSize = this.status.tileSize;
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d') as CanvasRenderingContext2D;
        patternCanvas.width = tileSize;
        patternCanvas.height = tileSize;
        patternCtx.fillStyle = strokeStyle;
        patternCtx.fillRect(0, 0, tileSize, tileSize);
        patternCtx.fillStyle = fillStyle;
        patternCtx.fillRect(1, 1, tileSize - 2, tileSize - 2);
        return patternCanvas
    }
    drawBackGround() {
        console.log("background rendered!");
        if (this.context === null) return false;
        let ctx = this.context;
        let { row, colume, tileSize } = this.status;


        const pattern = ctx.createPattern(this.getPattern(), 'repeat') as CanvasPattern;

        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, colume * tileSize, row * tileSize);
    }

    /**
     * 
     * @param x coloume cord
     * @param y row cord
     * @param shapeType 0-7
     */
    drawTetris(tetris: TetrisInterface, clear: boolean = false) {
        if (this.context === null) return;
        const ctx = this.context;
        const shapeColor = clear ? ['black', 'white'] : ['black', tetrisColor[tetris.shapeType]]
        const pattern = ctx.createPattern(this.getPattern(...shapeColor), 'repeat') as CanvasPattern;
        ctx.fillStyle = pattern;
        let { x, y, shapeType, shape } = tetris;
        const { row, colume, tileSize } = this.status;
        for (let i = 0; i < shape.length; i++) {
            if (
                x + shape[i][0] >= 0 &&
                x + shape[i][0] < colume &&
                y + shape[i][1] >= 0 &&
                y + shape[i][1] < row
            )
                ctx.fillRect((x + shape[i][0]) * tileSize, (y + shape[i][1]) * tileSize, tileSize, tileSize);
        }
    }
    clearLine(idx: number) {
        if (this.context === null || this.canvas === null) return;
        const ctx = this.context;
        const { row, colume, tileSize } = this.status;
        ctx.drawImage(this.canvas,
            0,
            0,
            colume * tileSize,
            idx * tileSize,
            0,
            tileSize,
            colume * tileSize,
            idx * tileSize);
        const pattern = ctx.createPattern(this.getPattern('black', 'white'), 'repeat') as CanvasPattern;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, tileSize * colume, tileSize);
    }
    playClearLine(targetY: number, delay: number = 200) {
        return new Promise<void>((resolve) => {
            if (this.context === null || this.canvas === null) return;
            const ctx = this.context;
            const canvas = this.canvas;
            const { row, colume, tileSize } = this.status;
            let lastFrameTime = 0;
            const pattern = ctx.createPattern(this.getPattern('black', 'white'), 'repeat') as CanvasPattern;
            ctx.fillStyle = pattern;
            let id = 0;
            function playclear(currentFrameTime: number) {
                if (lastFrameTime === 0) lastFrameTime = currentFrameTime;
                const delta = currentFrameTime - lastFrameTime;
                const offset = Math.floor(Math.max(delay - delta, 0) / delay * colume / 2); // 80%就是10块消除8快
                ctx.fillRect(offset * tileSize, targetY * tileSize, tileSize * (colume - 2 * offset), tileSize);

                if (delta >= delay) {
                    ctx.drawImage(canvas,
                        0,
                        0,
                        colume * tileSize,
                        targetY * tileSize,
                        0,
                        tileSize,
                        colume * tileSize,
                        targetY * tileSize);
                    ctx.fillRect(0, 0, tileSize * colume, tileSize);
                    resolve()
                    cancelAnimationFrame(id);
                } else {
                    id = requestAnimationFrame(playclear);
                }
            }
            id = requestAnimationFrame(playclear);
        })
    }
    playQuickDown(tetris: TetrisInterface, targetY: number, delay: number = 200) {
        return new Promise<void>((resolve) => {
            let lastFrameTime = 0;
            const drawTetris = this.drawTetris.bind(this);
            const originY = tetris.y;
            let id = 0;
            function quickdown(currentFrameTime: number) {
                if (lastFrameTime === 0) lastFrameTime = currentFrameTime;
                const delta = currentFrameTime - lastFrameTime;
                const Y = Math.floor(Math.min(delta, delay) / delay * (targetY - originY) + originY);
                drawTetris(tetris, true);
                tetris.y = Y;
                drawTetris(tetris);
                if (delta >= delay) {
                    cancelAnimationFrame(id);
                    resolve();
                } else {
                    requestAnimationFrame(quickdown);
                }
            }
            id = requestAnimationFrame(quickdown);
        })
    }
}

const buttonMap = [
    ["SL", "左转"],
    ["HD", "快下"],
    ["SR", "右转"],
    ["L", "左"],
    ["SD", "下"],
    ["R", "右"],
    ["Pause", "暂停"],
    ["Continue", "继续"],
    ["Start", "重开"],
]

class TetrisManager {
    render: TetrisCanvasRender;
    map: boolean[][] = [[]];
    status: TetrisOptions;
    framequest: number | null = null;
    lastFrameTime: number = 0;
    tetris: TetrisInterface | null = null;
    speed: number = 500; //ms 
    isDroping: boolean = false;
    isAnimation: string = '';
    isSticky: number = 0;
    stickTime: number = 300;
    key: string = ''; // L,R,SL,SR,SD,HD,
    keyTime: number = 0;
    keySpeed: number = 120;
    isKeyDown: boolean = false;
    score: number = 0;
    allowKickWall: boolean = true;
    allowKickFloor: boolean = true;
    constructor(canvas: HTMLCanvasElement | null, options?: Partial<TetrisOptions>) {
        this.render = new TetrisCanvasRender(canvas, options);
        this.status = this.render.status;
    }
    init() { // map[y][x] 
        let map = [];
        for (let i = 0; i < this.status.row; i++) {
            let rows = []
            for (let j = 0; j < this.status.colume; j++) {
                rows.push(false);
            }
            map.push(rows);
        }
        return map;
    }
    start() {
        this.close();
        this.isDroping = false;
        this.isAnimation = '';
        this.isSticky = 0;
        this.key = '';
        this.render.drawBackGround();
        this.map = this.init();
        this.lastFrameTime = performance.now();
        this.framequest = requestAnimationFrame(this.update.bind(this));
    }
    update(currentFrameTime: number) {
        const delta = currentFrameTime - this.lastFrameTime;
        if (this.isAnimation === '') {
            // greate new 
            if (this.tetris === null) {
                let tetris = this.getTetris();
                this.key = '';
                //try down 

                tetris.y += 1;
                if (this.check(tetris)) {
                    this.isDroping = true;
                    this.render.drawTetris(tetris);
                }
                else { // game over
                    tetris.y -= 1;
                    this.render.drawTetris(tetris);
                    this.stop();
                }
            } else {

                let tetris = this.getTetris();
                // trying key
                if (this.isKeyDown && currentFrameTime - this.keyTime >= this.keySpeed) {
                    let k = this.key;
                    this.applyKey();
                    this.key = k;
                    this.keyTime += this.keySpeed;
                }

                //auto dropping
                if (this.isDroping && delta >= this.speed) {
                    tetris.y += 1;
                    if (this.check(tetris)) {
                        tetris.y -= 1;
                        this.render.drawTetris(tetris, true);
                        tetris.y += 1;
                        this.render.drawTetris(tetris);
                        this.lastFrameTime = currentFrameTime;
                    } else {//已经到底
                        tetris.y -= 1; // 还原
                        if (this.isSticky === 0) this.isSticky = currentFrameTime;
                        if (currentFrameTime - this.isSticky >= this.stickTime) {
                            for (let i = 0; i < tetris.shape.length; i++)
                                this.map[tetris.y + tetris.shape[i][1]][tetris.x + tetris.shape[i][0]] = true;
                            this.tetris = null; //touch the bottom
                            this.isSticky = 0;
                            this.tryClear();
                        }
                    }
                }
            }
        } else {
            // animation stage
            this.lastFrameTime = currentFrameTime;

        }

        this.framequest = requestAnimationFrame(this.update.bind(this));
    }
    keyDown(key: string) {
        this.key = key;
        this.keyTime = performance.now();
        this.isKeyDown = true;
        tryVibrate()
    }
    keyUp() {
        this.applyKey();
        this.isKeyDown = false;
    }
    applyKey() {
        if (this.isAnimation && this.key in ['R', 'L', 'SR', 'SL', 'HD', 'SD']) this.key = '';
        let tetris = this.getTetris();
        let dup = deepCopy(tetris);
        let needContinue = true;
        switch (this.key) {
            case 'R':
                this.render.drawTetris(tetris, true);
                tetris.x++;
                if (!this.check(tetris)) tetris.x--;
                this.render.drawTetris(tetris);
                this.key = '';
                break;
            case 'L':
                this.render.drawTetris(tetris, true);
                tetris.x--;
                if (!this.check(tetris)) tetris.x++;
                this.render.drawTetris(tetris);
                this.key = '';
                break;
            case 'SD':
                this.render.drawTetris(tetris, true);
                tetris.y++;
                if (!this.check(tetris)) tetris.y--;
                this.render.drawTetris(tetris);
                this.key = '';
                break;
            case 'HD':
                let originY = tetris.y;
                while (this.check(tetris)) {
                    tetris.y++;
                }
                let targetY = --tetris.y;
                tetris.y = originY;
                if (targetY > originY) {
                    this.isAnimation = 'HD';
                    this.key = '';
                    this.render.playQuickDown(tetris, targetY, (targetY - originY) * 10).then(
                        () => {
                            this.isAnimation = '';
                        }
                    )
                }
                break;
            case 'SR':
                this.spin(true);
                if (!this.check(tetris)) {
                    needContinue = true;
                    if (this.allowKickWall) {
                        tetris.x++;
                        if (needContinue && this.check(tetris)) needContinue = false;
                        if (needContinue) tetris.x -= 2;
                        if (needContinue && this.check(tetris)) needContinue = false;
                        if (needContinue) tetris.x++;
                    }

                    if (this.allowKickFloor) {
                        if (needContinue) tetris.y--;
                        if (needContinue && this.check(tetris)) needContinue = false;
                        if (needContinue) tetris.y++;
                    }
                    if (needContinue) this.spin(false);
                }
                this.render.drawTetris(dup, true);
                this.render.drawTetris(tetris);
                this.key = '';
                break;
            case 'SL':

                this.spin(false);
                if (!this.check(tetris)) {
                    needContinue = true;
                    if (this.allowKickWall) {
                        tetris.x++;
                        if (needContinue && this.check(tetris)) needContinue = false;
                        if (needContinue) tetris.x -= 2;
                        if (needContinue && this.check(tetris)) needContinue = false;
                        if (needContinue) tetris.x++;
                    }

                    if (this.allowKickFloor) {
                        if (needContinue) tetris.y--;
                        if (needContinue && this.check(tetris)) needContinue = false;
                        if (needContinue) tetris.y++;
                    }
                    if (needContinue) this.spin(true);
                }
                this.render.drawTetris(dup, true);
                this.render.drawTetris(tetris);
                this.key = '';
                break;
            case 'Pause':
                this.key = '';
                this.isAnimation = 'Pause';
                break;
            case 'Continue':
                this.key = '';
                this.isAnimation = '';
                break;
            case 'Start':
                this.start();
                break;
            default:
                break;
        }
    }
    async tryClear() {
        for (let y = 0; y < this.status.row; y++) {
            if (this.map[y].reduce((s, a) => s && a, true) === true) {
                //need clear
                const line = []
                for (let x = 0; x < this.status.colume; x++)line.push(false);
                this.map.splice(y, 1)
                this.map.unshift(line);
                //去除正在运动的方块，不然它会一起下移，那样就要操作tetris.y++
                if (this.tetris) this.render.drawTetris(this.tetris, true);
                this.isAnimation = 'clearLine'
                await this.render.playClearLine(y)
                if (this.tetris) this.render.drawTetris(this.tetris);
            }
        }
        if (this.isAnimation === 'clearLine') this.isAnimation = '';
    }
    stop() {
        console.log("GameOver");
        this.isAnimation = 'GameOver';
    }
    close() {
        if (this.framequest) cancelAnimationFrame(this.framequest);
        this.tetris = null;
    }
    spin(clockwise: boolean = true) {
        const tetris = this.tetris;
        if (tetris === null) return;
        for (let i = 0; i < tetris.shape.length; i++) {
            let x = tetris.shape[i][0];
            let y = tetris.shape[i][1];
            let cx = tetrisCenter[tetris.shapeType][0];
            let cy = tetrisCenter[tetris.shapeType][1];
            if (clockwise) {
                //left -y,x
                [x, y] = [x, y + 1];
                [x, y] = [x - cx, y - cy];
                [x, y] = [-y, x];
                [x, y] = [x + cx, y + cy];
                tetris.shape[i] = [x, y];
            }
            else {
                //right y,-x
                [x, y] = [x + 1, y];
                [x, y] = [x - cx, y - cy];
                [x, y] = [y, -x];
                [x, y] = [x + cx, y + cy];
                tetris.shape[i] = [x, y];
            }
        }
        return;
    }

    getTetris(): TetrisInterface {
        if (this.tetris) return this.tetris;

        let shapeType = Math.floor(Math.random() * tetrisShape.length);
        let x = Math.floor(Math.random() * (this.status.colume - 3));
        let y = 0;

        let shape = [...tetrisShape[shapeType]]; //need copy 
        this.tetris = { x, y, shapeType, shape }
        return this.tetris;
    }
    /**
     * 
     * @param x 
     * @param y 
     * @param shapeType 
     * @returns legal true | illegal false 
     */
    check(tetris: TetrisInterface) {
        let { x, y, shapeType, shape } = tetris;
        const { row, colume } = this.status;
        for (let i = 0; i < shape.length; i++)
            if (
                x + shape[i][0] < 0 ||
                x + shape[i][0] >= colume ||
                y + shape[i][1] < 0 ||
                y + shape[i][1] >= row
            ) { return false; }
            else {
                if (this.map[y + shape[i][1]][x + shape[i][0]] === true)
                    return false;
            }
        return true;
    }
}


export function Tetris({ colume = 10, row = 20, tileSize = 25 }) {

    const tetrisManagerRef = useRef(new TetrisManager(null));
    useEffect(() => {
        tetrisManagerRef.current = new TetrisManager(
            document.querySelector("canvas"),
            { row: row, colume: colume, tileSize: tileSize },
        )
        let tetrisManager = tetrisManagerRef.current;
        tetrisManager.start();
        return () => {
            tetrisManagerRef.current.close();
        }
    }, [])

    return (
        <>
            <h1>TETRIS</h1>
            <canvas width={colume * tileSize} height={row * tileSize}></canvas>
            <div id="controller">
                {
                    buttonMap.map((item, idx) => (
                        <>
                            {isMobile &&
                                <button key={idx}
                                    onTouchStart={() => tetrisManagerRef.current.keyDown(item[0])}
                                    onTouchEnd={() => tetrisManagerRef.current.keyUp()}>{item[1]}</button>}
                            {!isMobile &&
                                <button key={idx}
                                    onMouseDown={() => tetrisManagerRef.current.keyDown(item[0])}
                                    onMouseUp={() => tetrisManagerRef.current.keyUp()}>{item[1]}</button>
                            }
                            {(idx + 1) % 3 === 0 && <br />}
                        </>
                    ))

                }
            </div>
            <div id="controller">

            </div>
        </>
    )
}
