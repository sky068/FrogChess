// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //     // ATTRIBUTES:
        //     default: null,        // The default value will be used only when the component attaching
        //                           // to a node for the first time
        //     type: cc.SpriteFrame, // optional, default is typeof default
        //     serializable: true,   // optional, default is true
        // },
        // bar: {
        //     get () {
        //         return this._bar;
        //     },
        //     set (value) {
        //         this._bar = value;
        //     }
        // },
        content: cc.Label,
        btnOk: cc.Node,
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.cb = null;
    },

    start () {

    },

    show(content, cb){
        this.content.string = content;
        this.btnOk.active = true;
        this.node.active = true;
        this.cb = cb;
    },

    onBtnOk(){
        this.node.active = false;
        if (this.cb){
            this.cb();
            this.cb = null;
        }
    },

    showLoading(){
        this.content.string = "Wating...";
        this.btnOk.active = false;
        this.node.active = true;
    },

    hideLoading(){
        this.onBtnOk();
    }


    // update (dt) {},
});
