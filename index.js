/**
 * Abvos sockets
 * @module abv-socket
 */
"use strict";

const ts = require('abv-ts')('abv:socket');

const pack = require('./lib/pack.js');

const sock = require('./lib/socket.js');
const CSocket = require('./lib/csocket.js');

const socket = {
	CSocket: 	CSocket,
	Socket:		sock.Socket,
	clients:	sock.clients,
	rooms:		sock.rooms,
	commands:	sock.commands,
	pack: pack
};

module.exports = {
	socket:		socket
};
