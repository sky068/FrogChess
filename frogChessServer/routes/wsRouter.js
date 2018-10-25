let expressWS = require('express-ws');
let Work = require('./work');

let wsRouter = null;

class WSRouter{
    constructor(){
    }

    static getInstance (){
        if (!wsRouter){
            wsRouter = new WSRouter();
        }
        return wsRouter;
    }

    initWSRouter(app, server){
        this.app = app;
        this.server = server;
        this.clients = [];
        expressWS(app, server);
    }

    listenClientConnection (){
        this.app.ws('/', (socket, req)=>{
            console.log('client connect to server successful.');
            this.clients.push(socket);
            console.log('clients: ' + this.clients.length);
            socket.on('message', (msg)=>{
                console.log('on message: ' + msg);

                Work.handleMsg(this, socket, msg);
            });

            socket.on('close', (msg)=>{
                console.log('on close: ' + msg);
                global.eventEmiter.emit("user_exitgame", socket);
                for (let index=0; index<this.clients.length; index++){
                    if (this.clients[index] == socket){
                        this.clients.splice(index,1);
                        break;
                    }
                }
                Work.dealOffline(socket);
                console.log('clients: ' + this.clients.length);
            });

            socket.on('error', (err)=>{
                console.log('on error: ' + error);
            });
        })
    }
}

module.exports = WSRouter;