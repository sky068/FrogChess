/**
 *  棋子位置编号
 * 
 *  0-------------1
 *  |  \          /
 *  |     \4  /
 *  |     /  \     *
 *  |  /        \ 
 *  2-------------3
 * 
 */

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const SOCKET_CLOSING = 2;
const SOCKET_CLOSED = 3;
const MATCH_WAIT_TIME = 10;     // 匹配等待时间（默认10秒)


let TIMEOUT_FLAG = {};
let RANDOM_USER_POOL = [];
let RAND_ROOM_DIC = {};
let ONLINE_USER_DIC = {};
let LAST_IN_ROOM_ID = {};      // 玩家掉线之前所在房间id


let User = require("./user");
 let Room = require("./room");
 let Protocol = require("./protocol");

class Chess {
    constructor(cid, lastBedIndex, isBlack){
        this.cid = cid;
        this.lastBedIndex = lastBedIndex;
        this.isBlack = isBlack;
    }
}

let game_instance = null;
class Game {
    constructor(){
        global.eventEmiter.on("destroy_room", this.onDestroyRoom);
    }

    static getInstance(){
        if (!game_instance){
            game_instance = new Game();
        }
        return game_instance;
    }

    onDestroyRoom(rid){
        console.log("destroy room: " + rid);

        let room = RAND_ROOM_DIC[rid.toString()];
        if (room){
            delete RAND_ROOM_DIC[rid.toString()];
        }
    }

    handleMsg(wsRouter, socket, msg){
        let request = JSON.parse(msg);
        switch (request.act){
            case 'heart':{
                request.data.t = Date.now();
                socket.send(JSON.stringify(request));
                break;
            }
            case 'chat': {
                for (let w of wsRouter.clients){
                    w.send(msg);
                }
                break;
            }
            case 'rmatch': {
                Game.getInstance().randomMatch(socket, request);
                break;
            }
            case 'playChess': {
                Game.getInstance().playChess(socket, request);
                break;
            }
            case 'login': {
                Game.getInstance().login(socket, request);
                break;
            }
            case 'selectChess':{
                Game.getInstance().selectChess(socket, request);
                break;
            }
            default:
                break;
        }
    }

    dealOffline(socket){
        let uid = socket.uid;
        let rid = socket.rid;
        if (uid){
            delete ONLINE_USER_DIC[uid.toString()];
        }

        // 已经在游戏中，通知对方已经掉线
        if (rid) {
            let room = RAND_ROOM_DIC[rid.toString()];
            if (room){
                console.log('有人中途离开room ' + room.rid);
                room.leaveRoom(socket);
            }
        }
    }

    login(socket, request){
        let resp = new Protocol.LoginResponse();
        resp.act = request.act;
        resp.seq = request.seq;
        let uid = request.data.uid;
        if (!uid){
            // 登陆失败
            resp.err = -1;
            socket.send(JSON.stringify(resp));
            return;
        }
        
        // 判断是否在游戏中，是的话恢复连接
        let rid = LAST_IN_ROOM_ID[uid.toString()];
        if (rid){
            let room = RAND_ROOM_DIC[rid.toString()];
            if (room){
                // 把双方的信息发过去
                let self = room.getUser(uid);
                let other = room.getRival(uid);
                self.socket = socket;
                self.socket.rid = rid;
                
                resp.data.self.chessDic = self.chessDic;
                resp.data.self.isBlack = self.isBlack;
                resp.data.other.chessDic = other.chessDic;
                resp.data.other.isBlack = other.isBlack;
                resp.data.other.uid = other.uid;

                resp.data.order = room.order;
                resp.data.isReconn = true;
            }
            
        } else{
            let user = new User(socket, uid);

            ONLINE_USER_DIC[uid.toString()] = user;
        }

        socket.send(JSON.stringify(resp));
    }
    
    exitRandomMatchPool(user){
        for (let index=0; index<RANDOM_USER_POOL.length; index++){
            if (RANDOM_USER_POOL[index].socket == user.socket){
                RANDOM_USER_POOL.splice(index,1);
            }
        }
    }
    
    randomMatch(socket, requestObj){
        let user = new User(socket, requestObj.data.uid)
        console.log("random pool size: " + RANDOM_USER_POOL.length);
        if (RANDOM_USER_POOL.length > 0){
            let other = RANDOM_USER_POOL.shift();
            let aRoom = new Room(user, other);
            aRoom.createRid();
            RAND_ROOM_DIC[aRoom.rid.toString()] = aRoom;
            // 方便断线重连时快速找到之前的房间
            LAST_IN_ROOM_ID[user.uid.toString()] = aRoom.rid;
            LAST_IN_ROOM_ID[other.uid.toString()] = aRoom.rid;

            let resp = new Protocol.RandomMatchResponse(requestObj.act, requestObj.seq);
            resp.data.rid = aRoom.rid;
            user.socket.rid = aRoom.rid;
            other.socket.rid = aRoom.rid;
            if (Math.random() < 0.5){
                resp.data.black = user.uid;
                resp.data.other = other.uid;
                user.isBlack = true;
                aRoom.order = user.uid;
                createUserChess(user, other);
            } else{
                resp.data.black = other.uid;
                resp.data.other = user.uid;
                other.isBlack = true;
                aRoom.order = other.uid;
                createUserChess(other, user);
            }
    
            function createUserChess(blackUser, whiteUser){
                // 创建黑色棋子id 2 3
                for (let i=2; i<=3; i++){
                    let chess = new Chess(i,i, true);
                    blackUser.chessDic[i.toString()] = chess;
                    aRoom.chessPanelFlag[i] = 1;
                }
    
                // 创建白色棋子id 0 1
                for (let i=0; i<=1; i++){
                    let chess = new Chess(i,i, false);
                    whiteUser.chessDic[i.toString()] = chess;
                    aRoom.chessPanelFlag[i] = 1;
                }
            }
    
            resp.data.order = resp.data.black;  // 黑子先走棋
    
            if (TIMEOUT_FLAG[user.uid.toString()] != null){
                clearTimeout(TIMEOUT_FLAG[user.uid.toString()]);
            }
            if (TIMEOUT_FLAG[other.uid.toString()] != null){
                clearTimeout(TIMEOUT_FLAG[other.uid.toString()]);
            }
            aRoom.send(JSON.stringify(resp));
        } else{
            RANDOM_USER_POOL.push(user);
        
            // 十秒钟匹配不到就失败
            TIMEOUT_FLAG[user.uid.toString()] = setTimeout(()=>{
                if (socket.readyState != SOCKET_OPEN){
                    return;
                }
                let resp = new Protocol.RandomMatchResponse(requestObj.act, requestObj.seq);
                resp.err = -1;
                console.log("匹配失败，没人加入.");
                user.socket.send(JSON.stringify(resp));
    
                // 离开随机匹配池
                Game.getInstance().exitRandomMatchPool(user);
            }, MATCH_WAIT_TIME * 1000);
        }
    }
    
    playChess(socket, request) {
        let rid = socket.rid;
        let uid = request.data.uid;
        let dest = request.data.dest;
        let room = RAND_ROOM_DIC[rid.toString()];
        let resp = new Protocol.PushPlayChess();
        resp.act = request.act;
        resp.seq = request.seq;
    
        let cur = request.data.lastBedIndex;
        let destIndex = request.data.dest.index;
        let cid = request.data.cid;
        let ret = room.getIsCanMoveChess(cur, destIndex);
        if (!ret){
            console.log("走棋不合格，不能移动");
            resp.err = -1;
        } else{
            resp.data = {
                uid: uid,
                cid: cid,
                dest: dest,
                order: room.getOrderUid(request.data.uid)
            }
    
            room.playChess(uid, cid, destIndex);
            let winner = room.getWinner(uid);
            if (winner){
                resp.data.order = -1;
                resp.data.winner = winner;
                console.log("game over, " + winner + " win.");
                // todo: 重新开始，暂时直接销毁房间
                room.destroyRoom();
                
            }
        }
    
        room.send(JSON.stringify(resp));
    }

    selectChess(socket, request){
        let resp = new Protocol.PushSelectChess(request.data.cid);
        resp.act = request.act;
        resp.seq = request.seq;

        let rid = socket.rid;
        let room = RAND_ROOM_DIC[rid.toString()];

        room.send(JSON.stringify(resp));
    }
}


module.exports = Game;