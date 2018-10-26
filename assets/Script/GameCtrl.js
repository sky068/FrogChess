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

const bedPos = [cc.v2(-316,316),cc.v2(316,316),cc.v2(-316,-316),cc.v2(316,-316),cc.v2(0,0)];

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
        labelRid: cc.Label,
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.listenEvent();
    },

    listenEvent(){
        Global.eventMgr.on("event_on_chess", this.onChessTouch, this);
        Global.eventMgr.on("event_on_bed", this.onBedTouch, this);

        Global.eventMgr.on(Global.config.EVENT_EXITROOM, this.onExitRoom, this);
        Global.eventMgr.on(Global.config.EVENT_PLAYCHESS, this.onPlayChess, this);

        Global.netProxy.registerPush("selectChess", this.onSelectChess, this);
    },

    start () {
    },

    onExitRoom(event){
        let resp = event.detail;
        cc.log(resp.uid + " leave game.");
    },

    onSelectChess(resp){
        let cid = resp.cid;
        this.chessArr[parseInt(cid)].select();
    },

    onPlayChess(event){
        let resp = event.detail;
        if (resp.err != 0){
            cc.log("错误，不能移动。");
            return;
        }

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

        this.curChess = null;
        this.order = uid==resp.order;
        this._updatePlayTip();

        if (resp.winner){
            this.scheduleOnce((dt)=>{
                cc.log("game over, " + resp.winner + " win.");
                let txt = "你赢了！";
                if (resp.winner != uid){
                    txt = "你输了!";
                }
                Global.tips.show(txt, ()=>{
                    this.getComponent("MenuCtrl").showMenuLayer();
                });
            }, 1);
        }

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
        if (chess.isBlack != this.isBlack || !this.order) {
            this.curChess = null;
            return;
        }
        Global.netProxy.selectChess({cid: chess.cid});
        this.curChess = chess;
    },

    onBedTouch(event){
        let bed = event.detail;
        this.desBed = bed;
        this.requestMoveChessToBed(bed);
    },

    /**
     * 是否可以移动到指定位置
     * @param {ChessBedCtrl} desBed 
     */
    getIsCanMove(desBed){
        return !this.bedFlag[desBed.index] && this.getDesIsInNeighbor(desBed);

    },

    /**
     * 请求移动到指定位置
     * @param {ChessBedCtrl} desBed 
     */
    requestMoveChessToBed(desBed){
        if (!this.order) return;
        if (!this.curChess) return;
        if (!this.getIsCanMove(desBed)) return;

        // todo: 向服务器请求移动
        Global.netProxy.playChess({
            cid: this.curChess.cid,
            lastBedIndex: this.curChess.lastBedIndex,
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

    clearChessboard(){
        this.curChess = null;
        this.desBed = null;
        this.bedFlag = {};
        this.bedArr = [];
        this.chessArr = [];
        this.isBlack = false;    // 是否黑色
        this.order = false;      // 是否轮到自己走棋
        this.chessLayer.removeAllChildren(true);

        // 棋盘坐标节点 用来定位点击
        for (let i=0; i<bedPos.length; i++){
            let bed = cc.instantiate(this.chessBedPrefab);
            bed.setPosition(bedPos[i]);
            let bedCtrl = bed.getComponent("ChessBedCtrl");
            bedCtrl.index = i;
            this.bedArr.push(bedCtrl);
            this.chessLayer.addChild(bed);
        }
    },

    startNewGame(info){
        this.clearChessboard();

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

        } else {
            this.isBlack = false;
            this.order = false;
            // this.chessLayer.scaleY = -1;
        }
        this._updatePlayTip();
        this.labelSelfUid.string = "我方 : " + (this.isBlack?"黑色":"白色") + DataMgr.getInstance().playerObj.uid;
        this.labelOtherUid.string = "对手: " + (!this.isBlack?"黑色":"白色") + info.other;
        this.labelRid.string = info.rid;
    },

    onReconn(resp){
        this.clearChessboard();

        let uid = DataMgr.getInstance().playerObj.uid;
        this.order = uid == resp.order;

        let self = resp.self;
        let other = resp.other;

        this.isBlack = self.isBlack;

        this.labelOtherUid.string = "对手: " + (!this.isBlack?"黑色":"白色")   +  resp.other.uid;
        this.labelSelfUid.string = "我方: " + (this.isBlack?"黑色":"白色") + uid;
        this.labelRid.string = resp.rid;
        this._updatePlayTip();

        createChess.call(this, self.chessDic);
        createChess.call(this, other.chessDic);

        function createChess(chessDic){
            for (let cid in chessDic){
                let cobj = chessDic[parseInt(cid)];
                let chess = cc.instantiate(this.chessPrefab);
                let chessCtrl = chess.getComponent("ChessCtrl");
                chessCtrl.isBlack = cobj.isBlack;
                let bed = this.bedArr[cobj.lastBedIndex];
                chessCtrl.lastBedIndex = bed.index;
                chessCtrl.cid = cobj.cid;
                if (cobj.isSelected){
                    chessCtrl.select();
                }
                chess.setPosition(cc.v2(bed.x, bed.y));
                this.chessArr[parseInt(cid)] = (chessCtrl);
                this.chessLayer.addChild(chess);
            }
        }
    }

    // update (dt) {},
});
