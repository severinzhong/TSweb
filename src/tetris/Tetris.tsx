import { Console } from "console";
import React, { useEffect, useRef } from "react";


//role based on  https://tetris.fandom.com/wiki/Tetris_Guideline

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
    [2,1],[1,1],[1.5,1.5],[1.5,1.5],[1.5,1.5],[1.5,1.5],[1.5,1.5],
]

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
        //patternCtx.strokeStyle = strokeStyle;
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
        const shapeColor = clear ? ['black', 'white'] : ['white',tetrisColor[tetris.shapeType]]
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
    clearLine(idx:number){
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
            colume*tileSize,
            idx*tileSize);
        const pattern = ctx.createPattern(this.getPattern('black', 'white'), 'repeat') as CanvasPattern;
        ctx.fillStyle = pattern ;
        ctx.fillRect(0,0,tileSize*colume,tileSize);
    }
}

class TetrisManager {
    render: TetrisCanvasRender;
    map: boolean[][];
    status: TetrisOptions;
    framequest: number | null = null;
    lastFrameTime: number = 0;
    tetris: TetrisInterface | null = null;
    speed: number = 500; //ms 
    isDroping: boolean = false;
    isAnimation: boolean = false;
    isSticky: boolean = false;
    key: string = ''; // L,R,SL,SR,SD,HD,
    constructor(canvas: HTMLCanvasElement | null, options?: Partial<TetrisOptions>) {
        this.render = new TetrisCanvasRender(canvas, options);
        this.status = this.render.status;
        this.map = this.init();
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
        this.render.drawBackGround();
        this.lastFrameTime = performance.now();
        this.framequest = requestAnimationFrame(this.update.bind(this));
    }
    update(currentFrameTime: number) {
        const delta = currentFrameTime - this.lastFrameTime;
        if (this.tetris === null ) {
            console.log("new tetris");
            let tetris = this.getTetris();
            //try down 
            
            tetris.y += 1 ;
            if (this.check(tetris)) {
                this.isDroping = true;
                this.render.drawTetris(tetris);
            }
            else { // game over
                tetris.y -= 1 ;
                this.render.drawTetris(tetris);
                this.stop();
            }
        }
        else {
            let tetris = this.getTetris();
            if (!this.isAnimation) {
                // trying key
                switch(this.key){
                    case 'R':
                        this.render.drawTetris(tetris, true);
                        tetris.x ++ ;
                        if (!this.check(tetris))tetris.x -- ;
                        this.render.drawTetris(tetris);
                        this.key = '' ;
                        break ;
                    case 'L':
                        this.render.drawTetris(tetris, true);
                        tetris.x -- ;
                        if (!this.check(tetris))tetris.x ++ ;
                        this.render.drawTetris(tetris);
                        this.key = '' ;
                        break ;
                    case 'SD':
                        this.render.drawTetris(tetris, true);
                        tetris.y ++ ;
                        if (!this.check(tetris))tetris.y -- ;
                        this.render.drawTetris(tetris);
                        this.key = '' ;
                        break ;
                    case 'HD' :
                        this.render.drawTetris(tetris, true);
                        while(this.check(tetris)){
                            tetris.y ++ ;
                        }
                        tetris.y -- ;
                        this.render.drawTetris(tetris);
                        this.key = '' ;
                        break ;
                    case 'SR':
                        this.render.drawTetris(tetris, true);
                        this.spin(true);
                        if (!this.check(tetris))this.spin(false) ;
                        this.render.drawTetris(tetris);
                        this.key = '' ;
                        break ;
                    case 'SL':
                        this.render.drawTetris(tetris, true);
                        this.spin(false);
                        if (!this.check(tetris))this.spin(true) ;
                        this.render.drawTetris(tetris);
                        this.key = '' ;
                        break ;
                    default : 
                        break ;
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
                    } else { 
                        tetris.y -= 1;
                        this.isSticky = true ;
                        for (let i = 0; i < tetris.shape.length; i++)
                            this.map[tetris.y + tetris.shape[i][1]][tetris.x + tetris.shape[i][0]] = true;
                        this.tetris = null; //touch the bottom

                        this.tryClear() ;
                    }
                }
            }
        }

        this.framequest = requestAnimationFrame(this.update.bind(this));
    }
    tryClear(){
        
        for(let y = 0 ; y < this.status.row;y++){
            if (this.map[y].reduce((s,a) =>s && a , true) === true){
                //need clear
                const line = []
                for(let x=0;x<this.status.colume;x++)line.push(false);
                this.map.splice(y,1)
                this.map.unshift(line);
                console.log("rows =>",this.map.length);
                //去除正在运动的方块，不然它会一起下移，那样就要操作tetris.y++
                if(this.tetris)this.render.drawTetris(this.tetris,true);
                this.render.clearLine(y);
                if(this.tetris)this.render.drawTetris(this.tetris);
            }
        }
    }
    stop() {
        console.log("GameOver");
        this.isAnimation = true;
    }
    close() {
        if (this.framequest) cancelAnimationFrame(this.framequest);
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
                [x,y] = [x,y+1];
                [x,y] = [x-cx,y-cy];
                [x,y] = [-y,x] ;
                [x,y] = [x+cx,y+cy];
                tetris.shape[i] = [x,y];
            }
            else {
                //right y,-x
                [x,y] = [x+1,y];
                [x,y] = [x-cx,y-cy];
                [x,y] = [y,-x] ;
                [x,y] = [x+cx,y+cy];
                tetris.shape[i] = [x,y];
            }
        }
        return;
    }

    getTetris(): TetrisInterface {
        if (this.tetris) return this.tetris;
        
        let shapeType = Math.floor(Math.random() * tetrisShape.length);
        let x = Math.floor(Math.random() * (this.status.colume - 3));
        let y = 0 ;
        
        let shape = tetrisShape[shapeType];
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
                y + shape[i][1] >= row ||
                this.map[y + shape[i][1]][x + shape[i][0]] 
            )
                return false;
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
            <div>LOG MESSAGE</div>
            <div>{colume} * {row} </div>
            <div id="controller">
                <button onClick={()=>{tetrisManagerRef.current.key = "SL"}}>左转</button>
                <button onClick={()=>{tetrisManagerRef.current.key = "HD"}}>下下</button>
                <button onClick={()=>{tetrisManagerRef.current.key = "SR"}}>右转</button>
                <br></br>
                <button onClick={()=>{tetrisManagerRef.current.key = "L"}}>往左</button>
                <button onClick={()=>{tetrisManagerRef.current.key = "SD"}}>往下</button>
                <button onClick={()=>{tetrisManagerRef.current.key = "R"}}>往右</button>
                <br></br>
                <button onClick={()=>{tetrisManagerRef.current.isAnimation = true}}>停止</button>
                <button onClick={()=>{tetrisManagerRef.current.isAnimation = false}}>开始</button>
            </div>
        </>
    )
}