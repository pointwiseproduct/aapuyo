﻿function getRawLocation() {
    if (window.location.href.indexOf("?") == -1) {
        return window.location.href;
    } else {
        return window.location.href.split("?")[0];
    }
}

class Random {
    private static seed: number = 6;

    static reset(s: number) {
        this.seed = s;
    }

    static gen(min?: number, max?: number): number {
        max = max || 1;
        min = min || 0;
        this.seed = (this.seed * 9301 + 49297) % 233280;
        var r = this.seed / 233280;
        return min + r * (max - min);
    }

    static genN(min?: number, max?: number): number {
        return Math.floor(this.gen(min, max));
    }
}

var puyoE: number = 0;
var puyoA: number = 1;
var puyoB: number = 2;
var puyoC: number = 3;
var puyoD: number = 4;
var puyoZ: number = 5;
var puyoDummy: number = 6;
var puyoDummyAlpha: number = 7;

var acc = 0.01;

function initCompressedField(): number[][] {
    var r: number[][] = new Array(12);
    for (var i = 0; i < 12; ++i) {
        r[i] = new Array(6);
        for (var j = 0; j < 6; ++j) {
            r[i][j] = puyoE;
        }
    }
    return r;
}

function trasBinary(s: number, n: number): string{
    var r: string = "";
    while(n != 0) {
        r = (n % 2 ? "1" : "0") + r;
        n = Math.floor(n / 2);
        --s;
    }
    for (var i = 0; i < s; ++i) {
        r = "0" + r;
    }
    return r;
}

function encField(player: number, f: number[][]): string {
    var freq: Array<[number, number]> = new Array(6);
    for (var i = 0; i < 6; ++i) {
        freq[i] = [i, 0];
    }
    for (var i = 0; i < 12; ++i) {
        for (var j = 0; j < 6; ++j) {
            ++freq[f[i][j]][1];
        }
    }
    freq.sort((n1, n2) => { return n1[1] > n2[1] ? -1 : n1[1] < n2[1] ? +1 : 0; });
    {
        freq[0][1] = 0;
        var currentCode = 2;
        for (var i = 1; i < 5; ++i, currentCode = (currentCode << 1) + 2) {
            freq[i][1] = currentCode;
        }
        freq[5][1] = freq[4][1] + 1;
    }
    var palet: number[] = new Array(6);
    var encodedPal = 0;
    for (var i = 0; i < 6; ++i) {
        palet[freq[i][0]] = freq[i][1];
    }
    for (var i = 0; i < 6; ++i) {
        encodedPal = (encodedPal << 5) + palet[i];
    }
    var ret: string = "p" + player.toString() + "=" + encodedPal.toString(16);
    ret += "&f" + player.toString() + "=";
    var fs: string = "";
    for (var i = 0; i < 12; ++i) {
        for (var j = 0; j < 6; ++j) {
            fs += trasBinary(1 + (palet[f[i][j]] == 0 ? 0 : Math.floor(Math.log(palet[f[i][j]]) / Math.log(2))), palet[f[i][j]]);
        }
    }
    {
        var l = (4 - (fs.length % 4)) % 4;
        for (var i = 0; i < l; ++i) {
            fs = fs + "0";
        }
    }
    var str = "";
    var g = (s: string) => { return s == "0" ? 0 : 1; };
    for (var i = 0; i < fs.length / 4; ++i) {
        var t = i * 4;
        var a = (g(fs[t + 0]) << 3) + (g(fs[t + 1]) << 2) + (g(fs[t + 2]) << 1) + g(fs[t + 3]);
        str += a.toString(16);
    }
    return ret + str;
}

function decField(p: string, f: string): number[][] {
    var palet: number[] = new Array(6);
    var ipalet = {};
    {
        var cur = parseInt(p, 16);
        for (var i = 0; i < 6; ++i, cur = cur >> 5) {
            palet[6 - i - 1] = cur & 31;
            ipalet[cur & 31] = 6 - i - 1;
        }
    }
    {
        var g = (s: string) => { return parseInt(s, 16); };
        var t: string = "";
        for (var i = 0; i < f.length; ++i) {
            var s = g(f[f.length - i - 1]).toString(2);
            var l = s.length;
            for (var j = 0; j < 4 - l; ++j) {
                s = "0" + s;
            }
            t = s + t;
        }
        var letterCount = 0;
        var acc = "";
        var rawField: number[][] = initCompressedField();
        var puyoCount = 0;
        for (var i = 0; i < t.length && puyoCount < 72; ++i) {
            acc += t[i];
            if (t[i] == "0" || letterCount == 4) {
                rawField[Math.floor(puyoCount / 6)][puyoCount % 6] = ipalet[parseInt(acc, 2)];
                letterCount = 0;
                acc = "";
                ++puyoCount;
            } else {
                ++letterCount;
            }
        }
    }
    return rawField; 
}

class ReadingFailed { }

class PlayerParam {
    p0: string;
    f0: string;
    b0: [number, number];
    p1: string;
    f1: string;
    b1: [number, number];
    curr: number;
    chunkDir: number;
    chunkX: number;

    cons(s: string): void {
        var q = decodeURIComponent(s).split("&");
        var stat = 0;
        for (var i = 0; i < q.length; ++i) {
            var p = q[i].split("=");
            if (p.length < 1) {
                throw ReadingFailed;
            }
            switch (p[0]) {
                case "p0":
                    this.p0 = p[1];
                    stat |= 1;
                    break;

                case "p1":
                    this.p1 = p[1];
                    stat |= 2;
                    break;

                case "f0":
                    this.f0 = p[1];
                    stat |= 4;
                    break;

                case "f1":
                    this.f1 = p[1];
                    stat |= 8;
                    break;

                case "b0":
                    if (p[1].length != 2) {
                        throw ReadingFailed;
                    }
                    this.b0 = [parseInt(p[1][0]), parseInt(p[1][1])];
                    stat |= 16;
                    break;

                case "b1":
                    if (p[1].length != 2) {
                        throw ReadingFailed;
                    }
                    this.b1 = [parseInt(p[1][0]), parseInt(p[1][1])];
                    stat |= 32;
                    break;

                case "c":
                    this.curr = parseInt(p[1]);
                    if (this.curr < 0 || this.curr > 1) {
                        throw ReadingFailed;
                    }
                    stat |= 64;
                    break;

                case "d":
                    this.chunkDir = parseInt(p[1]);
                    if (this.chunkDir < 0 || this.chunkDir > 1) {
                        throw ReadingFailed;
                    }
                    stat |= 128;
                    break;

                case "n":
                    this.chunkX = parseInt(p[1]);
                    if (this.chunkX < 0 || this.chunkX > 5) {
                        throw ReadingFailed;
                    }
                    stat |= 256;
                    break;

                default:
                    break;
            }
        }
        if (stat + 1 != 512) {
            throw ReadingFailed;
        }
    }
}

class Direction {
    static up: number = 1;
    static down: number = 2;
    static left: number = 4;
    static right: number = 8;

    dir: number = 0;

    setRelativePosition(x: number, y: number, s: number, t: number): void {
        if (x > s) {
            this.setLeft();
        }
        if (x < s) {
            this.setRight();
        }
        if (y > t) {
            this.setDown();
        }
        if (y < t) {
            this.setUp();
        }
    }

    setUp(): void {
        this.dir |= Direction.up;
    }

    setDown(): void {
        this.dir |= Direction.down;
    }

    setLeft(): void {
        this.dir |= Direction.left;
    }

    setRight(): void {
        this.dir |= Direction.right;
    }

    checkUp(): boolean {
        return (this.dir & Direction.up) != 0;
    }

    checkDown(): boolean {
        return (this.dir & Direction.down) != 0;
    }

    checkLeft(): boolean {
        return (this.dir & Direction.left) != 0;
    }

    checkRight(): boolean {
        return (this.dir & Direction.right) != 0;
    }
}

class PuyoField {
    clearField(): void {
        this.field = new Array(13);
        for (var i = 0; i < 13; ++i) {
            this.field[i] = new Array(6);
            for (var j = 0; j < 6; ++j) {
                this.field[i][j] = puyoE;
            }
        }
    }

    assingFromCompressedField(f: number[][]): void {
        this.clearField();
        for (var i = 0; i < 12; ++i) {
            for (var j = 0; j < 6; ++j) {
                this.field[i][j] = f[i][j];
            }
        }
    }

    private static makeFlagField(): boolean[][] {
        var r: boolean[][] = new Array(13);
        for (var i = 0; i < 13; ++i) {
            r[i] = new Array(6);
            for (var j = 0; j < 6; ++j) {
                r[i][j] = false;
            }
        }
        return r;
    }

    private static makeConnectedField(): Direction[][] {
        var r: Direction[][] = new Array(13);
        for (var i = 0; i < 13; ++i) {
            r[i] = new Array(6);
            for (var j = 0; j < 6; ++j) {
                r[i][j] = new Direction();
            }
        }
        return r;
    }

    private makeConnectDir(): void {
        this.connectDir = PuyoField.makeConnectedField();
        var ret = this.connectDir;
        for (var i = 0; i < 13; ++i) {
            for (var j = 0; j < 6; ++j) {
                if (this.field[i][j] == puyoE || this.field[i][j] == puyoZ) {
                    continue;
                }
                var lambda = (s: number, t: number) => {
                    if (s < 0 || s >= 13 || t < 0 || t >= 6) {
                        return;
                    } else if (this.field[i][j] == this.field[s][t]) {
                        ret[i][j].setRelativePosition(j, i, t, s);
                        ret[s][t].setRelativePosition(t, s, j, i);
                    }
                };
                lambda(i - 1, j);
                lambda(i + 1, j);
                lambda(i, j - 1);
                lambda(i, j + 1);
            }
        }
    }

    private makeConnectedPuyoChunks(): void{
        this.deleteePuyoChunks = new Array();
        this.connectedPuyoChunks = new Array();
        var dir = this.connectDir;
        var f = PuyoField.makeFlagField();
        for (var i = 0; i < 13; ++i) {
            for (var j = 0; j < 6; ++j) {
                if (f[i][j]) {
                    continue;
                }
                if (dir[i][j].dir == 0) {
                    continue;
                }
                var arr: [number, number][] = new Array();
                var lambda = (x: number, y: number) => {
                    if (x < 0 || x >= 6 || y < 0 || y >= 13 || f[y][x]) {
                        return;
                    }
                    f[y][x] = true;
                    arr.push([y, x]);
                    if (dir[y][x].checkLeft()) {
                        lambda(x - 1, y);
                    }
                    if (dir[y][x].checkRight()) {
                        lambda(x + 1, y);
                    }
                    if (dir[y][x].checkUp()) {
                        lambda(x, y + 1);
                    }
                    if (dir[y][x].checkDown()) {
                        lambda(x, y - 1);
                    }
                };
                lambda(j, i);
                arr.sort((n1: [number, number], n2: [number, number]) => {
                    if (n1[1] > n2[1]) {
                        return +1;
                    } else if (n1[1] < n2[1]) {
                        return -1;
                    } else if (n1[0] < n2[0]) {
                        return +1;
                    } else if (n1[0] > n2[0]) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
                if (arr.length >= 4) {
                    this.deleteePuyoChunks.push(arr);
                } else {
                    this.connectedPuyoChunks.push(arr);
                }
            }
        }
    }

    makeConnectedPuyo(): void {
        this.makeConnectDir();
        this.makeConnectedPuyoChunks();
    }

    deleteConnectedPuyo(chain: number): void {
        var a = 0;
        var e = 0;
        var coeff = ((Math.min(chain, 1) * 8) << Math.max(0, chain - 1));
        var colors = [0, 0, 0, 0, 0, 0];
        for (var i = 0; i < this.deleteePuyoChunks.length; ++i) {
            if (this.deleteePuyoChunks[i].length < 4) {
                continue;
            }
            e = Math.max(e, this.deleteePuyoChunks[i].length);
            a += this.deleteePuyoChunks[i].length * 10;
            colors[this.field[this.deleteePuyoChunks[i][0][0]][this.deleteePuyoChunks[i][0][1]]] += this.deleteePuyoChunks[i].length;
            for (var j = 0; j < this.deleteePuyoChunks[i].length; ++j) {
                var coord = this.deleteePuyoChunks[i][j];
                this.field[coord[0]][coord[1]] = puyoE;
                var lambda = (f: number[][], s: number, t: number) => {
                    if (s < 0 || s > 13 || t < 0 || t > 6) {
                        return;
                    }
                    if (f[s][t] != puyoZ) {
                        return;
                    }
                    f[s][t] = puyoE;
                    a += 10;
                    ++colors[puyoZ];
                };
                lambda(this.field, coord[0] - 1, coord[1]);
                lambda(this.field, coord[0] + 1, coord[1]);
                lambda(this.field, coord[0], coord[1] - 1);
                lambda(this.field, coord[0], coord[1] + 1);
            }
        }
        var d = 0;
        for (var i = 0; i < colors.length; ++i) {
            d += Math.min(colors[i], 1);
        }
        if (d > 1) {
            coeff += Math.pow(2, d - 2) * 3;
        }
        if (e > 5) {
            if (e > 10) {
                coeff += 10;
            } else {
                coeff += e - 3;
            }
        }
        this.scorePrevious = this.score;
        this.score += a * Math.max(Math.min(coeff, 999), 1);
        this.score = Math.min(this.score, 99999999);
        this.deleteePuyoChunks = null;
        this.connectDir = PuyoField.makeConnectedField();
    }

    fallinTest(): boolean {
        for (var i = 0; i < 6; ++i) {
            var j = 0;
            for (; j < 13; ++j) {
                if (this.field[j][i] == puyoE) {
                    break;
                }
            }
            if (j == 13) {
                continue;
            }
            var k = j + 1;
            for (; k < 13; ++k) {
                if (this.field[k][i] != puyoE) {
                    return true;
                }
            }
            if (k == 13) {
                continue;
            }
        }
        return false;
    }

    fallInPuyo(t: number): void {
        t = Math.min(t, 5);
        for (var i = 0; i < t + 1; ++i) {
            for (var j = 0; j < 13; ++j) {
                for (; j < 13; ++j) {
                    if (this.field[j][i] == puyoE) {
                        break;
                    }
                }
                if (j == 13) {
                    break;
                }
                var k = j + 1;
                for (; k < 13; ++k) {
                    if (this.field[k][i] != puyoE) {
                        break;
                    }
                }
                if (k == 13) {
                    break;
                }
                this.field[k - 1][i] = this.field[k][i];
                this.field[k][i] = puyoE;
                j = k;
            }
        }
    }

    field: number[][];
    connectDir: Direction[][];
    deleteePuyoChunks: [number, number][][];
    connectedPuyoChunks: [number, number][][];
    scorePrevious: number = 0;
    score: number = 0;
    bottle: number[] = [puyoE, puyoE];

    constructor() {
        this.clearField();
    }
}

class Renderer {
    static toothStr: string[] = [
        "∀",
        "ω",
        "Д",
        "Ｗ",
        "＿",
        "＿",
        "＿"
    ];

    static spanClassesPropertyName: string[] = [
        "puyoA",
        "puyoB",
        "puyoC",
        "puyoD",
        "puyoZ",
        "puyoDummy",
        "puyoDummyAlpha"
    ];
    
    static makePuyoPiece(i: number, j: number, p: PuyoField): string {
        var spanClasses = [
            "<span class='" + Renderer.spanClassesPropertyName[0] +"'>",
            "<span class='" + Renderer.spanClassesPropertyName[1] +"'>",
            "<span class='" + Renderer.spanClassesPropertyName[2] +"'>",
            "<span class='" + Renderer.spanClassesPropertyName[3] +"'>",
            "<span class='" + Renderer.spanClassesPropertyName[4] +"'>",
            "<span class='" + Renderer.spanClassesPropertyName[5] +"' id='puyoDummynumJ' onmouseover='onmouseoverDummy(numI, numJ);' onmouseout='onmouseoutDummy(numI, numJ)' onclick='onclickDummy(numI, numJ);'>",
            "<span class='" + Renderer.spanClassesPropertyName[6] +"' id='puyoDummyAlphanumJ'>"
        ];

        var faceStr = [
            "（ﾟ∀ﾟ）", // 0
            "(~∀~)",   // 1
            "(lll_∀)", // 2
            "(~∀｡)",   // 1 + 2
            "[ﾟ∀ﾟ.）", // 4
            "[~∀~)", // 1 + 4
            "[lll_∀)", // 2 + 4
            "[~∀｡)", // 1 + 2 + 4
            "（.ﾟ∀ﾟ]", // 8
            "(~∀~]", // 1 + 8
            "(lll_∀]", // 2 + 8
            "(~∀｡]", // 1 + 2 + 8
            "[.ﾟ∀ﾟ.]", // 4 + 8
            "[~∀~]", // 1 + 4 + 8
            "[lll_∀]", // 2 + 4 + 8
            "[~∀｡]" // 1 + 2 + 4 + 8
        ];
        var d = p.connectDir[i][j];
        var n = p.field[i][j] - puyoA;
        return spanClasses[n] + faceStr[d.dir].replace("∀", Renderer.toothStr[n]) + "</span>";
    }

    static makeScreen(p0: PuyoField, p1: PuyoField): string {
        var sequentialWhitespace = [
            " 　 　 .",
            "　 　 　 　 　 ",
            "　 　 　　　　　　　　",
            "　 　 　 　 　 　 　 　 　 　 ",
            "　　　　　　　　　 　 　 　 　 　 　 ",
            "　 　 　 　 　 　 　 　 　 　 　 　 　 　 　 "
        ];
        var p0BottlePuyo = ["ﾟ∀ﾟ）", "ﾟ∀ﾟ）"];
        var p1BottlePuyo = ["（ﾟ∀ﾟ", "（ﾟ∀ﾟ"];
        for (var i = 0; i < 2; ++i) {
            var n = p0.bottle[i] - puyoA;
            var m = p1.bottle[i] - puyoA;
            if (p0.bottle[i] == puyoE) {
                p0BottlePuyo[i] = "　 　 ";
            } else {
                p0BottlePuyo[i] = p0BottlePuyo[i].replace("∀", Renderer.toothStr[n]);
            }
            if (p1.bottle[i] == puyoE) {
                p1BottlePuyo[i] = "　 　 ";
            } else {
                p1BottlePuyo[i] = p1BottlePuyo[i].replace("∀", Renderer.toothStr[m]);
            }
        }
        var middle = [
            "┏━━┓┏━━┓",
            "┃１Р ┃┃ ２Р┃",
            "┃<span id=\"p0Bottle0\" onClick=\"popUp(0, 0);\">" + p0BottlePuyo[0] + "</span>┃┃<span id=\"p1Bottle0\"  onClick=\"popUp(1, 0);\">" + p1BottlePuyo[0] + "</span>┃",
            "┃<span id=\"p0Bottle1\" onClick=\"popUp(0, 1);\">" + p0BottlePuyo[1] + "</span>┃┃<span id=\"p1Bottle1\" onClick=\"popUp(1, 1);\">" + p1BottlePuyo[1] + "</span>┃",
            "┗━━┛┗━━┛",
            "　　 ＳＴＡＧＥ 1 　　 ",
            " ｰ≦:.: : : : : :＼ ＼　",
            " i:｛ : : Nｧrｶ､厂:.: :.ヽ",
            " Ｗ{￣　└ﾘlﾈ: : :ヽ: ",
            "/∧＼つ //_j:.:ヽ:.: : ",
            " SCORE 　 　 (ヽ_/)",
            ":" + ("00000000" + p0.score.toString()).slice(-8) + "　　（ﾟーﾟ）"
        ];
        var r = "";
        r += "┏━━━━━━━━━━━━━━━┓　　 　 ＮＥＸT　　 　 ┏━━━━━━━━━━━━━━━┓<br/>";
        var p = [p0, p1];
        var lambda = (m: number, i: number, j: number) => {
            if (p[m].field[i][j] != puyoE) {
                var piece = Renderer.makePuyoPiece(i, j, p[m]);
                if (p[m].field[i][j] >= puyoDummy) {
                    var replacePrime = (s: string, t: string, u: string) => {
                        for (; ;) {
                            var prev = s;
                            s = s.replace(t, u);
                            if (prev == s) {
                                break;
                            } else {
                                continue;
                            }
                        }
                        return s;
                    };
                    piece = replacePrime(piece, "numI", i.toString());
                    piece = replacePrime(piece, "numJ", j.toString());
                }
                r += piece;
            } else {
                var n = 0;
                while (p[m].field[i][j + n] == puyoE) {
                    if (j + n > 5) {
                        break;
                    }
                    ++n;
                }
                r += sequentialWhitespace[n - 1];
                j += n - 1;
            }
            return j;
        };
        for (var i = 0; i < 12; ++i) {
            r += i % 2 == 0 ? "┃" : "┨";
            for (var j = 0; j < 6; ++j) {
                j = lambda(0, 11 - i, j);
            }
            r += i % 2 == 0 ? "┃" : "┠";

            r += middle[i];

            r += i % 2 == 0 ? "┃" : "┨";
            for (var j = 0; j < 6; ++j) {
                j = lambda(1, 11 - i, j);
            }
            r += i % 2 == 0 ? "┃" : "┠";

            r += "<br/>";
        }
        r += "┗━━━━━━━━━━━━━━━┛　 　 　 　 " + ("00000000" + p1.score.toString()).slice(-8) + "┗━━━━━━━━━━━━━━━┛<br/>";
        return r;
    }
}

var player = [new PuyoField(), new PuyoField()];

var aaScreen = document.getElementById("aa");
var aaConsole = document.getElementById("console");

var messageTemplates = [
    "再生中...",
    "PlayerA は PlayerB の瓶へ送るぷよを選択してください...<br/><a href=\"#\">[相手へ送るURLを生成]</a>",
];

function initGame() {
    var plainField = initCompressedField();
    player[0].assingFromCompressedField(plainField);
    player[1].assingFromCompressedField(plainField);
}

var mouseCoord = [0, 0];

var popupFlag = false;
var popupQP = -1;
var bottleOwner = 0;
var bottleIdx = 0;

function popUp(p: number, n: number) {
    var pmenu = document.getElementById("pmenu");
    var qmenu = document.getElementById("qmenu");
    if (popupQP == 0) {
        qmenu.style.visibility = "hidden";
        var puyo = document.getElementById("p" + p.toString() + "Bottle" + n.toString());
        if (!popupFlag) {
            pmenu.style.visibility = "visible";
            bottleOwner = p;
            bottleIdx = n;
            pmenu.style.left = (mouseCoord[0] + 1).toString() + "px";
            pmenu.style.top = (mouseCoord[1] + 1).toString() + "px";
        } else {
            pmenu.style.visibility = "hidden";
        }
    } else if (popupQP == 1) {
        pmenu.style.visibility = "hidden";
        if (!popupFlag) {
            qmenu.style.visibility = "visible";
            qmenu.style.left = (mouseCoord[0] + 1).toString() + "px";
            qmenu.style.top = (mouseCoord[1] + 1).toString() + "px";
        } else {
            qmenu.style.visibility = "hidden";
        }
    }
    popupFlag = !popupFlag;
}

function setBottlePuyo(owner: number, idx: number, n: number) {
    var face = ["ﾟ∀ﾟ）", "（ﾟ∀ﾟ"];
    var tooth = [
        "∀",
        "ω",
        "Д",
        "Ｗ"
    ];
    var f = document.getElementById("p" + owner.toString() + "Bottle" + idx.toString());
    if (n == puyoE) {
        f.innerHTML = "　 　 ";
        return;
    }
    f.innerHTML = "<span class=\"" + ["puyoA", "puyoB", "puyoC", "puyoD"][n - puyoA] + "\">" + face[bottleOwner].replace("∀", tooth[n - puyoA]) + "</span>";
}

function choosePuyo(n: number) {
    if (bottleOwner != ppInstance.param.curr) {
        return;
    }
    ppInstance.pf[bottleOwner].bottle[bottleIdx] = n;
    document.getElementById("pmenu").style.visibility = "hidden";
    setBottlePuyo(bottleOwner, bottleIdx, n);
    ppInstance.makeBStr();
    popupFlag = false;
    if (ppInstance.pf[bottleOwner].bottle[0] != puyoE && ppInstance.pf[bottleOwner].bottle[1] != puyoE) {
        phaseE();
    }
}

var scr = null;
var cons = null;

function addLog(str: string) {
    cons.innerHTML = str + "<br/>" + cons.innerHTML;
}

class PlayPuyo {
    param: PlayerParam = new PlayerParam();
    pf: PuyoField[] = [new PuyoField(), new PuyoField()];
    chunkDir: number = 0;
    chunkX: number = 0;
    otherPlayerChunkDir: number = 0;
    nextPuyoX: number = 0;
    f0str: string;
    f1str: string;
    b0str: string;
    b1str: string;

    makeBStr() {
        ppInstance.b0str = "b0=" + ppInstance.pf[0].bottle[0].toString() + ppInstance.pf[0].bottle[1].toString();
        ppInstance.b1str = "b1=" + ppInstance.pf[1].bottle[0].toString() + ppInstance.pf[1].bottle[1].toString();
    }

    redraw() {
        scr.innerHTML = Renderer.makeScreen(this.pf[0], this.pf[1]);
        for (var i = 0; i < 2; ++i) {
            for (var j = 0; j < 2; ++j) {
                setBottlePuyo(i, j, this.pf[i].bottle[j]);
            }
        }
    }

    constructor(pstr: string) {
        this.param.cons(pstr);
        this.pf[0].assingFromCompressedField(decField(this.param.p0, this.param.f0));
        this.pf[1].assingFromCompressedField(decField(this.param.p1, this.param.f1));
        this.pf[0].bottle = this.param.b0;
        this.pf[1].bottle = this.param.b1;
        for (var i = 0; i < 2; ++i) {
            this.pf[i].makeConnectedPuyo();
        }
        scr.innerHTML = Renderer.makeScreen(this.pf[0], this.pf[1]);
        for (var i = 0; i < 2; ++i) {
            for (var j = 0; j < 2; ++j) {
                setBottlePuyo(i, j, this.pf[i].bottle[j]);
            }
        }
        this.chunkDir = this.param.chunkDir;
        this.chunkX = this.param.chunkX;
        if (this.chunkX > 5) {
            throw ReadingFailed;
        }
        var ini = true;
        for (var i = 0; i < 2; ++i) {
            if (this.pf[1 - this.param.curr].bottle[i] != puyoE) {
                ini = false;
            }
        }
        addLog("<span class=\"dummy\">画面をクリックしてください...</span>");
        if (ini) {
            this.f0str = encField(0, this.pf[0].field);
            this.f1str = encField(1, this.pf[1].field);
            document.body.onclick = phaseEPrime;
        } else {
            document.body.onclick = phaseA;
        }
    }
}

var ppInstance: PlayPuyo = null;

function phaseA() {
    var curr = ppInstance.param.curr;
    var p = ppInstance.pf;
    var f = p[curr].field;
    var lambda = (x: number) => {
        var i = 12;
        for (; i >= 0; --i) {
            if (f[i][x] != puyoE) {
                return i + 1;
            }
        }
        return i + 1;
    };
    if (ppInstance.pf[ppInstance.param.curr].bottle[0] == puyoE || ppInstance.pf[ppInstance.param.curr].bottle[1] == puyoE) {
        phaseDPrime();
        document.body.onclick = null;
        return;
    }
    if (ppInstance.chunkDir == 0) {
        if (ppInstance.chunkX == 0) {
            --ppInstance.chunkX;
            var a = lambda(ppInstance.chunkX);
            f[a][ppInstance.chunkX] = ppInstance.pf[ppInstance.param.curr].bottle[0];
            var b = lambda(ppInstance.chunkX + 1);
            f[b][ppInstance.chunkX + 1] = ppInstance.pf[ppInstance.param.curr].bottle[1];
        } else {
            var a = lambda(ppInstance.chunkX);
            f[a][ppInstance.chunkX] = ppInstance.pf[ppInstance.param.curr].bottle[1];
            var b = lambda(ppInstance.chunkX - 1);
            f[b][ppInstance.chunkX - 1] = ppInstance.pf[ppInstance.param.curr].bottle[0];
        }
    } else {
        var a = lambda(ppInstance.chunkX);
        f[a][ppInstance.chunkX] = ppInstance.pf[ppInstance.param.curr].bottle[1];
        f[a + 1][ppInstance.chunkX] = ppInstance.pf[ppInstance.param.curr].bottle[0];
    }
    for (var i = 0; i < 2; ++i) {
        ppInstance.pf[ppInstance.param.curr].bottle[i] = puyoE;
    }
    ppInstance.redraw();
    addLog("<span class=\"dummy\">Player" + (ppInstance.param.curr == 0 ? " 1 " : " 2 ") + "</span> > 瓶のぷよを配置しました.");
    ppInstance.pf[curr].makeConnectedPuyo();
    document.body.onclick = phaseB;
}

var intervalHandle: number;

function phaseB() {
    addLog("<span class=\"dummy\">Player" + (ppInstance.param.curr == 0 ? " 1 " : " 2 ") + "</span> > 再生中...");
    document.body.onclick = null;
    intervalHandle = setTimeout(phaseC, 200, 0, 0);
}

function phaseC(t: number, chain: number) {
    var pf = ppInstance.pf[ppInstance.param.curr];
    var pg = ppInstance.pf[1 - ppInstance.param.curr];

    if (pf.fallinTest()) {
        pf.fallInPuyo(t);
        ++t;
        ppInstance.redraw();
    } else {
        pf.makeConnectedPuyo();
        if (pf.deleteePuyoChunks == null || pf.deleteePuyoChunks.length == 0) {
            pf.makeConnectedPuyo();
            ppInstance.redraw();
            phaseD();
            return;
        }
        pf.deleteConnectedPuyo(chain);
        t = 0;
        ++chain;
        ppInstance.redraw();
    }

    intervalHandle = setTimeout(phaseC, 200, t, chain);
}

function findLowestEmptyPuyo(field: number[][], j: number) {
    var i = 13;
    while (i > 0 && field[i - 1][j] == puyoE) {
        --i;
    }
    return i;
}

function checkZenkeshi(f: number[][]) {
    for (var i = 0; i < 12; ++i) {
        for (var j = 0; j < 6; ++j) {
            if (f[i][j] != puyoE) {
                return false;
            }
        }
    }
    return true;
}

function rev() {
    var p = ppInstance.pf[1 - ppInstance.param.curr];
    var t = p.bottle[0];
    p.bottle[0] = p.bottle[1];
    p.bottle[1] = t;
    document.getElementById("qmenu").style.visibility = "hidden";
    popupFlag = false;
    ppInstance.makeBStr();
    ppInstance.redraw();
}

function rot() {
    ppInstance.otherPlayerChunkDir = 1 - ppInstance.otherPlayerChunkDir;
    document.getElementById("qmenu").style.visibility = "hidden";
    popupFlag = false;
}

function phaseD() {
    document.body.onclick = null;

    if (ppInstance.pf[ppInstance.param.curr].field[11][3] != puyoE) {
        addLog("<span class=\"consoleResult\">Player" + (ppInstance.param.curr == 0 ? " 1 " : " 2 ") + "の負けです.</span>");
        return;
    }

    if (checkZenkeshi(ppInstance.pf[ppInstance.param.curr].field)) {
        addLog("<span class=\"consoleResult\">Player" + (ppInstance.param.curr == 0 ? " 1 " : " 2 ") + "の勝ちです.</span>");
        return;
    }

    phaseDPrime();
}

function phaseDPrime() {
    popupQP = 1;
    var p = ppInstance.pf[1 - ppInstance.param.curr];
    for (var j = 0; j < 6; ++j) {
        var i = findLowestEmptyPuyo(p.field, j);
        if (i < 12) {
            p.field[i][j] = puyoDummy;
            var iPrime = findLowestEmptyPuyo(p.field, j);
            if (iPrime < 12) {
                p.field[iPrime][j] = puyoDummyAlpha;
            }
        }
    }
    ppInstance.redraw();
    addLog("<span class=\"dummy\">Player" + (ppInstance.param.curr == 0 ? " 2 " : " 1 ") + "</span> > ぷよを配置してください.");
}

function onmouseoverDummy(i: number, j: number) {
    mouseoveroutDummy(i, j, 0);
}

function onmouseoutDummy(i: number, j: number) {
    mouseoveroutDummy(i, j, 1);
}

function mouseoveroutDummy(i: number, j: number, switchV: number) {
    var p = ppInstance.pf[1 - ppInstance.param.curr];
    if (ppInstance.otherPlayerChunkDir == 0) {
        var dummyPuyo0: HTMLElement;
        var dummyPuyo1: HTMLElement;
        if (j == 0) {
            dummyPuyo0 = document.getElementById("puyoDummy" + j.toString());
            dummyPuyo0.innerHTML = "（ﾟ" + Renderer.toothStr[p.bottle[0] - 1] + "ﾟ）";
            dummyPuyo1 = document.getElementById("puyoDummy" + (j + 1).toString());
            dummyPuyo1.innerHTML = "（ﾟ" + Renderer.toothStr[p.bottle[1] - 1] + "ﾟ）";
        } else {
            dummyPuyo0 = document.getElementById("puyoDummy" + (j - 1).toString());
            dummyPuyo1 = document.getElementById("puyoDummy" + j.toString());
        }
        if (dummyPuyo0) {
            if (switchV == 0) {
                dummyPuyo0.className = Renderer.spanClassesPropertyName[p.bottle[0] - 1];
                dummyPuyo0.innerHTML = "（ﾟ" + Renderer.toothStr[p.bottle[0] - 1] + "ﾟ）";
            } else {
                dummyPuyo0.className = Renderer.spanClassesPropertyName[5];
                dummyPuyo0.innerHTML = "（ﾟ＿ﾟ）";
            }
        }
        if (dummyPuyo1) {
            if (switchV == 0) {
                dummyPuyo1.className = Renderer.spanClassesPropertyName[p.bottle[1] - 1];
                dummyPuyo1.innerHTML = "（ﾟ" + Renderer.toothStr[p.bottle[1] - 1] + "ﾟ）";
            } else {
                dummyPuyo1.className = Renderer.spanClassesPropertyName[5];
                dummyPuyo1.innerHTML = "（ﾟ＿ﾟ）";
            }
        }
    } else {
        var dummyPuyo = document.getElementById("puyoDummy" + j.toString());
        var dummyPuyoAlpha = document.getElementById("puyoDummyAlpha" + j.toString());
        if (switchV == 0) {
            dummyPuyo.innerHTML = "（ﾟ" + Renderer.toothStr[p.bottle[1] - 1] + "ﾟ）";
            dummyPuyo.className = Renderer.spanClassesPropertyName[p.bottle[1] - 1];
        } else {
            dummyPuyo.innerHTML = "（ﾟ＿ﾟ）";
            dummyPuyo.className = Renderer.spanClassesPropertyName[5];
        }
        if (dummyPuyoAlpha) {
            if (switchV == 0) {
                dummyPuyoAlpha.innerHTML = "（ﾟ" + Renderer.toothStr[p.bottle[0] - 1] + "ﾟ）";
                dummyPuyoAlpha.className = Renderer.spanClassesPropertyName[p.bottle[0] - 1];
            } else {
                dummyPuyoAlpha.innerHTML = "（ﾟ＿ﾟ）";
                dummyPuyoAlpha.className = Renderer.spanClassesPropertyName[6];
            }
        }
    }
}

function onclickDummy(nextI: number, nextJ: number) {
    var pf = ppInstance.pf[ppInstance.param.curr];
    var pg = ppInstance.pf[1 - ppInstance.param.curr];
    for (var i = 0; i < 12; ++i) {
        for (var j = 0; j < 6; ++j) {
            if (pg.field[i][j] == puyoDummy || pg.field[i][j] == puyoDummyAlpha) {
                pg.field[i][j] = puyoE;
            }
        }
    }

    ppInstance.f0str = encField(0, ppInstance.pf[0].field);
    ppInstance.f1str = encField(1, ppInstance.pf[1].field);

    if (ppInstance.otherPlayerChunkDir == 0) {
        if (nextJ == 0) {
            pg.field[findLowestEmptyPuyo(pg.field, nextJ)][nextJ] = pg.bottle[0];
            pg.field[findLowestEmptyPuyo(pg.field, nextJ + 1)][nextJ + 1] = pg.bottle[1];
        } else {
            pg.field[findLowestEmptyPuyo(pg.field, nextJ)][nextJ] = pg.bottle[1];
            pg.field[findLowestEmptyPuyo(pg.field, nextJ - 1)][nextJ - 1] = pg.bottle[0];
        }
    } else {
        pg.field[nextI][nextJ] = pg.bottle[1];
        if (nextI < 12) {
            pg.field[nextI + 1][nextJ] = pg.bottle[0];
        }
    }

    ppInstance.nextPuyoX = nextJ;
    pf.bottle[0] = puyoE;
    pf.bottle[1] = puyoE;
    phaseEPrime();
}

function phaseEPrime() {
    popupQP = 0;
    addLog("<span class=\"dummy\">Player" + (ppInstance.param.curr == 0 ? " 2 " : " 1 ") + "</span> > Player " + (ppInstance.param.curr == 0 ? " 1 " : " 2 ") + "の瓶に送るぷよを決定してください.");
    document.body.onclick = null;
    ppInstance.redraw();
}

function phaseE() {
    var r = getRawLocation() + "?";
    r += ppInstance.f0str + "&" + ppInstance.f1str;
    r += "&" + ppInstance.b0str;
    r += "&" + ppInstance.b1str;
    r += "&d=" + ppInstance.otherPlayerChunkDir.toString();
    r += "&n=" + ppInstance.nextPuyoX.toString();
    r += "&c=" + (1 - ppInstance.param.curr).toString();
    //(<HTMLInputElement>document.getElementById("nextURI")).value = r;
    addLog("<span class=\"dummy\">Player" + (ppInstance.param.curr == 0 ? " 2 " : " 1 ") + "</span> > <a href=" + r + " target='_blank'>URL を生成しました</a>.");
}

document.onmousemove = (e) => {
    mouseCoord = [e.clientX, e.clientY];
};

window.onload = () => {
    scr = document.getElementById("aa");
    cons = document.getElementById("console")
    if (window.location.href.indexOf("?") == -1) {
        var f = initCompressedField();
        var e = encField(0, f) + "&" + encField(1, f) + "&b0=00&b1=00&d=0&n=0&c=0";
        ppInstance = new PlayPuyo(e);
    } else {
        ppInstance = new PlayPuyo(window.location.href.split("?")[1]);
    }
};
