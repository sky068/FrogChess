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
        tips: cc.Node,
        menuLayer: cc.Node,
        gameLayer: cc.Node,
        editBox: cc.EditBox,
        inputTips: cc.Node,
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.showMenuLayer();
        DataMgr.getInstance().loadDataFromLocal();
        this.listenEvent();

        if (!Global.netProxy.isNetworkOpened()){
            Global.netProxy.connect();
        }

        Global.tips = this.tips.getComponent("TipsCtrl");

        this.playerObj = DataMgr.getInstance().playerObj;
        if (!this.playerObj.uid){
            this.playerObj.uid = Date.now();
            DataMgr.getInstance().saveDataToLocal();
        }

        cc.log("uid: " + this.playerObj.uid);
    },

    listenEvent(){
        Global.eventMgr.on(Global.config.EVENT_NETWORK_OPENED, this.onNetOpen, this);
        Global.eventMgr.on(Global.config.EVENT_NETWORK_CLOSED, this.onNetClosed, this);
        Global.eventMgr.on(Global.config.EVENT_LOGIN_SUC, this.onLoginSuc, this);
        Global.eventMgr.on(Global.config.EVENT_LOGIN_FAILED, this.onLoginFailed, this);

        Global.netProxy.registerPush("rmatch", this.onRandomMathSuc.bind(this));
    },

    start () {
    },

    onNetOpen(event){
        cc.log("net opened.");
        // this.startBeatHeart();
        Global.netProxy.login(0);   // 0 游客
    },

    onNetClosed(event){
        cc.log("net closed. 5s 后重试连接.");
        this.scheduleOnce((dt)=>{
            if (!Global.netProxy.isNetworkOpened()){
                Global.netProxy.connect();
            }
        }, 5);
    },

    onLoginSuc(event){
        let resp = event.detail;
        cc.log("登陆成功.");
        if (resp.isReconn){
            cc.log("断线重连，恢复游戏.");
            this.getComponent("GameCtrl").onReconn(resp);
            this.showGameLayer();
        }
    },

    onLoginFailed(event){
        cc.log("登陆失败. 5s后重试.");
        this.scheduleOnce((dt)=>{
            Global.netProxy.login(0);
        }, 5)
    },

    startBeatHeart(){
        // this.schedule((dt)=>{
        //     if (!this.checkInternet()) return;
        //     let t = Date.now();
        //     Global.netProxy.beatHeart((resp)=>{
        //         cc.log(JSON.stringify(resp));
        //         cc.log("delay: " + (resp.t - t));
        //     });
        // }, 5);
    },

    onBtnNpc(){
        cc.log("人机模式");
    },

    onBtnRandom(){
        cc.log("随机匹配");
        if (!this.checkInternet()){
            Global.tips.show("网络连接失败，请稍后再试.");
            return;
        }

        Global.tips.showLoading();
        Global.netProxy.randomMatch();
    },

    onRandomMathSuc(resp){
        Global.tips.hideLoading();
        if (resp.err != 0){
            Global.tips.show("匹配失败，请稍后再试.");
        } else {
            this.getComponent("GameCtrl").startNewGame(resp);
            this.showGameLayer();
        }
    },

    onBtnNewRoom(){
        cc.log("开房间");
        if (!this.checkInternet()){
            Global.tips.show("网络连接失败，请稍后再试.");
            return;
        }

        Global.netProxy.createRoom((resp)=>{
            cc.log("开房成功，房间号: " + resp.rid);
            this.getComponent("GameCtrl").labelRid.string = resp.rid;
            this.showGameLayer();
        });
    },

    onBtnJoinRoom(){
        cc.log("加入房间");
        if (!this.checkInternet()){
            Global.tips.show("网络连接失败，请稍后再试.");
            return;
        }

        this.inputTips.active = true;
    },

    checkInternet(){
        return Global.netProxy.isNetworkOpened();
    },

    showGameLayer(){
        this.gameLayer.active = true;
        this.menuLayer.active = false;
    },

    showMenuLayer(){
        this.gameLayer.active = false;
        this.menuLayer.active = true;
    },

    onBtnInputRoom(){
        let rid = this.editBox.string;
        Global.netProxy.joinRoom(rid);
        this.inputTips.active = false;
    }

    // update (dt) {},
});
