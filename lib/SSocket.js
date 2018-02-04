/**
 * Abvos server side socket
 */
"use strict";

const ts = require('abv-ts')('abv:socket.SSocket');
const Pack = require('./Pack.js');
const Socket = require('./Socket.js');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
const abvPublicKey = 'BAAuTRrAyDIh6WquBij3qZaoaAbkVz/87Zw1gjg8DUkIKMZlPXZQ3vNt3GHv62EQ1dSH2V5ZMeFdus3lsLxsluxO5wEyniA7FWC/lgLY/bqF9hCU+F6lF51SBqHbINbFx4TH1s5gNxDfd9x/6t++2rqvh+W0UydWBnyIOZPiugrrnsvpcw==';
const abvPrivateKey = 'AZUxoeIHsHmbWwKr3VsQ94yRDQWKfAyoqUu95586H+ikIhsgIUqkRKEoC7/o74b40KM1KDDp5OHfZS3orWoUNIjr';

const $clients = Socket.clients;
const $rooms = Socket.rooms;

class SSocket extends Socket
{
	constructor(sock)
	{
		super(sock);

		const me = this;
		
		this.on('echo',(msg) => me.send(msg));

		this.on('write',(msg) => me.send(msg));

		this.on('msg',(msg) => me.send(msg));

		this.on('join',(msg) => me.join(msg.t));
		
		this.on('leave',(msg) => me.leave(msg.t));

		this.on('file',(msg) => me.send(msg));

		this.on('online',(msg) => {
			const c = new Map();
			for (let [k,v] of $clients.entries()) c.set(k,v.info);
			msg.b = JSON.stringify([...c]);
			me._send(msg);
		});
		this.on('id',(msg) => {
			msg.f = '@0';
			msg.t = me.id;
			me.info = ts.fromString(msg.b);
			me._send(msg); 
			ts.debug(48,msg);
		});

		this.on('auth',(msg) => {
//			me.auth(msg);
		});

		this.on('error',(err) => { ts.error(55,err); });

	}
	
	msg2srv(msg) { ts.error(59,msg); }
	
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
			ts.error(78,'no room: ' + msg.t);
			return;
		}
		
		msg.f = me.id;

		ts.debug(84,msg.c, msg.t);

		const data = this.encode(msg);	
		
		all.forEach((client) => {
			if (client && (me.sock !== client.sock)){
				client.sock.send(data,(err) => {
					if (err){
						ts.error(err);
						client.close(93);		
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
