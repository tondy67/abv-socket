/**
 * Abvos server side socket
 */
"use strict";

const ts = require('abv-ts')('abv:SSocket');
const Socket = require('./Socket.js');

const $clients = Socket.clients;
const $rooms = Socket.rooms;

class SSocket extends Socket
{
	constructor(sock)
	{
		super(sock);

	}
	
	msg2srv(msg) { ts.error(24,msg); }
	
	send(msg)
	{
		const me = this;
		let all = null;

		if (!ts.is(msg.t,String)) msg.t = '';

		if (msg.t === ''){
			all = $clients;
		}else if (msg.t === '@0'){
			this.msg2srv(this.encode(msg));
			return;
		}else if (msg.t.startsWith('@')){
			all = [$clients.get(msg.t)];
		}else if ($rooms.has(msg.t)){
			all = $rooms.get(msg.t);
		}else{
			ts.error(43,'no room: ' + msg.t);
			return;
		}
		
		msg.f = me.id;

		ts.debug(49, msg.c, msg.t);

		const data = this.encode(msg);	
		
		all.forEach((client) => {
			if (client && client.sock && (me.sock !== client.sock)){
				client.sock.send(data,(err) => {
					if (err){
						ts.error(err);
						client.close(58);		
					}
				});
	//			if (client.sock.readyState === WebSocket.CLOSED) client.close();	
			}	
		}); 
	}

	auth(m)
	{
	}
}

module.exports = SSocket;
