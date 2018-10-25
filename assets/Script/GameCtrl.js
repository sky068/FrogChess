// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

let DataMgr = require("./common/DataMgr");

cc.Class({
    extends: cc.Component,

    properties: {
        chessLayer: cc.Node,
        hole: cc.Node,
        chessPrefab: cc.Prefab,
        chessBedPrefab: cc.Prefab,
        labelSelfUid: cc.Label,
        labelOtherUid: cc.Label,
        labelOrderUid: cc.Label,
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.curChess = null;
        this.desBed = null;
        this.bedFlag = {};
        this.bedArr = [];
        this.chessArr = [];
        this.isBlack = false;    // 是否黑色
        this.order = false;      // 是否轮到自己走棋

        this.listenEvent();
    },

    listenEvent(){
        Global.eventMgr.on("event_on_chess", this.onChessTouch, this);
        Global.eventMgr.on("event_on_bed", this.onBedTouch, this);

        Global.eventMgr.on(Global.config.EVENT_EXITROOM, this.onExitRoom, this);
        Global.eventMgr.on(Global.config.EVENT_PLAYCHESS, this.onPlayChess, this);

    },

    start () {
    },

    onExitRoom(event){
        let resp = event.detail;
        cc.log(resp.uid + " leave game.");
    },

    onPlayChess(event){
        let resp = event.detail;

        let moveChess = this.chessArr[resp.cid];
        let uid = DataMgr.getInstance().playerObj.uid;
        if (uid == resp.uid){
            // 自己发出的走棋
            this.bedFlag[moveChess.lastBedIndex] = false;
            this.bedFlag[resp.dest.index] = true;
            moveChess.lastBedIndex = resp.dest.index;
            moveChess.node.runAction(cc.moveTo(0.2, cc.v2(resp.dest.x, resp.dest.y)));
        } else {
            // 对方走棋，直接更新位置
            moveChess.node.runAction(cc.moveTo(0.2, cc.v2(resp.dest.x, resp.dest.y)));
        }

        this.order = uid==resp.order;
        this._updatePlayTip();

    },

    _updatePlayTip(){
        let des = "对方走棋";
        if (this.order){
            des = "我方走棋";
        }
        this.labelOrderUid.string = des;
    },

    onChessTouch(event){
        let chess = event.detail;
        if (!chess.isBlack == this.isBlack) {
            this.curChess = null;
            return;
        }
        this.curChess = chess;
    },

    onBedTouch(event){
        let bed = event.detail;
        this.desBed = bed;
        this.moveChessToBed(bed);
    },

    /**
     * 是否可以移动到指定位置
     * @param {ChessBedCtrl} desBed 
     */
    getIsCanMove(desBed){
        return !this.bedFlag[desBed.index] && this.getDesIsInNeighbor(desBed);

    },

    /**
     * 移动到指定位置
     * @param {ChessBedCtrl} desBed 
     */
    moveChessToBed(desBed){
        if (!this.order) return;
        if (!this.curChess) return;
        if (!this.getIsCanMove(desBed)) return;

        // todo: 向服务器请求移动
        Global.netProxy.playChess({
            cid: this.curChess.cid,
            dest: {
                index: desBed.index,
                x: desBed.x,
                y: desBed.y
            }
        });
    },

    getDesIsInNeighbor(desBed){
        let ns = this.getNeighborBedIndex(this.curChess.lastBedIndex);
        if (ns){
            for (let i=0; i<ns.length; i++){
                if (desBed.index == ns[i]){
                    return true;
                }
            }
        }

        return false;
    },

    getNeighborBedIndex(curIndex){
        let res = null;
        switch (curIndex){
            case 0:
                res = [1,2,4];
                break;
            case 1:
                res = [0,4];
                break;
            case 2:
                res = [0,3,4];
                break;
            case 3:
                res = [2,4];
                break;
            case 4:
                res = [0,1,2,3];
                break;
        }
        return res;
    },

    initChessLayer(info){
        let bedPos = [cc.v2(-316,316),cc.v2(316,316),cc.v2(-316,-316),cc.v2(316,-316),cc.v2(0,0)];
        for (let i=0; i<bedPos.length; i++){
            let bed = cc.instantiate(this.chessBedPrefab);
            bed.setPosition(bedPos[i]);
            let bedCtrl = bed.getComponent("ChessBedCtrl");
            bedCtrl.index = i;
            this.bedArr.push(bedCtrl);
            this.chessLayer.addChild(bed);
        }
        // 黑棋在下方
        for (let j=0; j<4; j++){
            let chess = cc.instantiate(this.chessPrefab);
            let chessCtrl = chess.getComponent("ChessCtrl");
            let bed = this.bedArr[j];
            chessCtrl.lastBedIndex = bed.index;
            chessCtrl.cid = j;
            chess.setPosition(cc.v2(bed.x, bed.y));
            this.chessArr.push(chessCtrl);
            if (j<2){
                chessCtrl.isBlack = false;
            } else {
                chessCtrl.isBlack = true;
            }
            this.chessLayer.addChild(chess);
        }


        if (DataMgr.getInstance().playerObj.uid == info.black){
            this.isBlack = true;
            this.order = true;
            this.labelOtherUid.string = "对手: " + "白色 uid: " + info.other;

            cc.log("self is balck");
        } else {
            this.isBlack = false;
            this.order = false;
            this.chessLayer.scaleY = -1;
            this.labelOtherUid.string = "对手: " + "黑色 uid: " +  info.black;

            cc.log("self is white");
        }
        this._updatePlayTip();
        this.labelSelfUid.string = "我方 : " + (this.isBlack?"黑色":"白色") + DataMgr.getInstance().playerObj.uid;
    }

    // update (dt) {},
});
