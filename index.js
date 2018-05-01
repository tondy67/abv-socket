/**
 * Abvos sockets
 * @module abv-socket
 * https://github.com/tondy67/abv-socket
 */
"use strict";

const Socket = require('./lib/Socket.js');
const CSocket = require('./lib/CSocket.js');
const SSocket = require('./lib/SSocket.js');
const Conn = require('./lib/Conn.js');

module.exports = {
	CSocket: CSocket,
	SSocket: SSocket,
	Socket:	Socket,
	Conn: Conn
};
