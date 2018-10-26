/**
 * 消息基类对象，客户端请求消息BaseRequest， 回调消息BaseResponse都继承BaseProtocol
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
            winner: 0,     // 赢家
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

class LoginResponse extends BaseResponse{
    constructor(){
        super();
        this.data = {
            order: 0,
            isReconn: false,
            other: {
                uid: 0,
                isBlack: false,
                chessDic: {}
            },
            self: {
                isBlack: false,
                chessDic: {}
            }
        }
    }
}


module.exports = {
    LoginResponse: LoginResponse,
    RandomMatchResponse: RandomMatchResponse,
    PushPlayChess: PushPlayChess,
    PushExitRoom: PushExitRoom,
}