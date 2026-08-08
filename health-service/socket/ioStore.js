// Singleton store for the socket.io instance
// This allows controllers to emit events directly without going through Redis
let _io = null;

const setIo = (io) => { _io = io; };
const getIo = () => _io;

module.exports = { setIo, getIo };
