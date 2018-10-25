class User{
    constructor(socket, uid){
        socket.uid = uid;
        this.socket = socket;
        this.uid = uid;
    }
}

module.exports = User;