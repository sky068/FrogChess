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
        chessSp: cc.Node,
        chessTip: cc.Node,  // 选中提示
        isBlack: {
            default: true,
            notify: function(){
                if (this.isBlack){
                    this.chessSp.color = cc.Color.BLACK;
                } else{
                    this.chessSp.color = cc.Color.WHITE;
                }
            }
        },
        lastBedIndex: 0, // 标记最新的位置index（ChessBed index)
        cid: 0           // 棋子id
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        Global.eventMgr.on("unselect_chess", this.onUnselect, this);
    },

    onUnselect(event){
        this.chessTip.active = false;
    },

    select(){
        Global.eventMgr.emit("unselect_chess");
        this.chessTip.active = true;
    },

    start () {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onChessTouch, this);
    },

    onChessTouch(event){
        cc.log("on chess touch");
        Global.eventMgr.emit('event_on_chess', this);
        event.stopPropagation();
    }
    // update (dt) {},
});
