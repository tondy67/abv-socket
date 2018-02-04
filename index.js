/**
 * Abvos sockets
 * @module abv-socket
 */
"use strict";

const Pack = require('./lib/Pack.js');
const Socket = require('./lib/Socket.js');
const CSocket = require('./lib/CSocket.js');
const SSocket = require('./lib/SSocket.js');
const Conn = require('./lib/Conn.js');

module.exports = {
	CSocket: CSocket,
	SSocket: SSocket,
	Socket:	Socket,
	Pack: Pack,
	Conn: Conn
};
