let User = require("./user");

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const SOCKET_CLOSING = 2;
const SOCKET_CLOSED = 3;
const MATCH_WAIT_TIME = 10;     // 匹配等待时间（默认10秒)


let TIMEOUT_FLAG = {};
let RANDOM_USER_POOL = [];
let RAND_ROOM_DIC = {};
let ONLINE_USER_DIC = {};



class Room{
    constructor(u1, u2){
        this.userArr = [];
        this.userArr.push(u1);
        this.userArr.push(u2);
        this.rid = 0;
    }

    createRid(){
        this.rid = Date.now();
    }

    send(msg){
        for (let user of this.userArr){
            if (user.socket.readyState == SOCKET_OPEN){
                user.socket.send(msg);
            }
        }
    }

    leaveRoom(socket){
        // 如果房间没人了则销毁房间，否则通知有人离开
        let destroy = true;
        for (let index=0; index<this.userArr.length; index++){
            if (this.userArr[index].socket.readyState == SOCKET_OPEN){
                destroy = false;
            }
        }
        
        if (destroy){
            let rid = socket.rid;
            delete RAND_ROOM_DIC[rid.toString()];
        } else{
            let resp = new PushExitRoom(socket.uid);
            this.send(JSON.stringify(resp));
        }
    }

    // 获取下一个走棋的uid
    getOrderUid(uid){
        let res = 0;
        if (this.userArr[0].uid == uid){
            res = this.userArr[1].uid;
        } else{
            res = this.userArr[0].uid;
        }
        return res;
    }
}

/**
 * 消息基类对象，请求消息BaseRequest， 回调消息BaseResponse都继承BaseProtocol
 */
class BaseProtocol{
    constructor () {
        /**
         * 请求动作类型
         */
        this.act = '';

        /**
         * 每个请求的sequence_id应该唯一
         */
        this.seq = 0;

        /**
         * 错误代码，0为正常
         */
        this.err = 0;

        /**
         * 是否需要等待服务器回调
         */
        this.is_async = false;
    }
};

/**
 * 请求消息基类，客户端的请求都继承这个类
 */
class BaseRequest extends BaseProtocol{
    constructor(){
        super();
    }
};

/**
 * 服务器返回的消息对应的对象，包含返回数据，一般和BaseRequest成对使用
 * @class BaseResponse
 * @extends BaseProtocol
 */
class BaseResponse extends BaseProtocol{
    constructor(){
        super();
    }
    /**
     * 读取返回数据，设置BaseResponse对象
     */
    loadData (data) {
        var key;
        for (key in data) {
            if(!this.hasOwnProperty(key)){
                continue;
            }

            if(data[key] !== undefined && data[key] !== null){
                this[key] = data[key];
            }
        }
    }
};

/**
 * 随机匹配返回结果
 */
class RandomMatchResponse extends BaseResponse{
    constructor(act, seq){
        super();
        this.act = act;
        this.seq = seq;
        this.data = {
            rid: 0,         // 房间id
            black: 0,       // 黑子uid
            other: 0,       // 对手
            order: 0,       // 走棋uid
        };
    }
};

class PushExitRoom extends BaseResponse{
    constructor(uid){
        super();
        this.act = "exitRoom";
        this.seq = 1;
        this.data  = {
            uid: uid
        };
    }
}

class PushPlayChess extends BaseResponse {
    constructor(){
        super();
        this.act = "playChess"
        this.seq = 1;
        this.data = {
            uid: 0,
            order: 0,
            cid: 0,
            dest: {
                index: 0,
                x: 0,
                y: 0,
            }
        }
    }
}

class LgoinResponse extends BaseResponse{
    constructor(){
        super();
        this.data = {

        }
    }
}

class Work {
    constructor(){
    }
    static handleMsg(wsRouter, socket, msg){
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
                randomMatch(socket, request);
                break;
            }
            case 'playChess': {
                playChess(socket, request);
                break;
            }
            case 'login': {
                login(socket, request);
                break;
            }
            default:
                break;
        }
    }

    static dealOffline(socket){
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
}

function login(socket, request){
    let resp = new LgoinResponse();
    resp.act = request.act;
    resp.seq = request.seq;
    let uid = request.data.uid;
    if (!uid){
        // 登陆失败
        resp.err = -1;
        socket.send(JSON.stringify(resp));
        return;
    }
    let user = new User(socket, uid);
    ONLINE_USER_DIC[uid.toString()] = user;
    socket.send(JSON.stringify(resp));
}

function exitRandomMatchPool(user){
    for (let index=0; index<RANDOM_USER_POOL.length; index++){
        if (RANDOM_USER_POOL[index].socket == user.socket){
            RANDOM_USER_POOL.splice(index,1);
        }
    }
}

function randomMatch(socket, requestObj){
    let user = new User(socket, requestObj.data.uid)
    console.log("random pool size: " + RANDOM_USER_POOL.length);
    if (RANDOM_USER_POOL.length > 0){
        let other = RANDOM_USER_POOL.shift();
        let aRoom = new Room(user, other);
        aRoom.createRid();
        RAND_ROOM_DIC[aRoom.rid.toString()] = aRoom;

        let resp = new RandomMatchResponse(requestObj.act, requestObj.seq);
        resp.data.rid = aRoom.rid;
        user.socket.rid = aRoom.rid;
        other.socket.rid = aRoom.rid;
        if (Math.random() < 0.5){
            resp.data.black = user.uid;
            resp.data.other = other.uid;
        } else{
            resp.data.black = other.uid;
            resp.data.other = user.uid;
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
            let resp = new RandomMatchResponse(requestObj.act, requestObj.seq);
            resp.err = -1;
            console.log("匹配失败，没人加入.");
            user.socket.send(JSON.stringify(resp));

            // 离开随机匹配池
            exitRandomMatchPool(user);
        }, MATCH_WAIT_TIME * 1000);
    }
}

function playChess(socket, request) {
    let rid = socket.rid;
    let room = RAND_ROOM_DIC[rid.toString()];
    let resp = new PushPlayChess();
    resp.act = request.act;
    resp.seq = request.seq;
    resp.data = {
        uid: request.data.uid,
        cid: request.data.cid,
        dest: request.data.dest,
        order: room.getOrderUid(request.data.uid)
    }
    room.send(JSON.stringify(resp));
}


module.exports = Work;