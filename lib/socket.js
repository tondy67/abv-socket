/**
 * Abvos core
 * @module abv-core
 */
"use strict";

const ts = require('abv-ts')('abv:socket.Socket');
const pack = require('./pack.js');

const $fn = 'function';
const $no = 'Unknown ';

let $sid = 1|0;
const $clients = new Map();	
const $rooms = new Map();
const $commands = ['err','msg','join','leave','file','echo','online','auth','id'];

const $cmd2int = (c) => {
		let ix = $commands.indexOf(c);
		if (ix === -1){
			ix = 0;
			ts.debug('No cmd: ' + c);
		}
		return ix;
	};

const $cmd2msg = (cmd, body,from, to) => {
		if (!ts.is(to,String)) to = '';
		const r = {c: $cmd2int(cmd), f: from, t: to};
		if (typeof body === 'object'){
			if (!body.hasOwnProperty('body')) body.body = '';
			Object.keys(body).forEach((key,index) => {
					if (key == 'body') r.b = body[key];
					else r[key] = body[key];
				});		
		}else if (ts.is(body,String)){
			r.b = body;
		}else{
			r.b = String(body);
		}
		return r;	
	};

/** Base websocket client */
class Socket
{
	/**
	 * Create client
	 * @param {WebSocket} sock - WebSocket instance
	 */
	constructor(sock) 
	{
		this.sock = sock;
		this.cmd = [];
		this.id = sock ? '@' + $sid++ : '';
		$clients.set(this.id,this); 
		this.rooms = new Set();
		this.rooms.add(this.id);
		this.ready = false;
	}
    
    c2m(cmd,body,to)
    {
		return $cmd2msg(cmd,body,this.id,to);
	}
	
	log(s)
	{
		ts.log(s);
	}
	/**
	 * Connect to websocket server
	 * @param {string} url - The host url.
	 */
	connect(url,sock)
	{
		if (!url || !url.startsWith('http')){
			ts.error(78,'No url: ' + url);
			return false;
		}
		
		const me = this;
		const host = url.replace("http", 'ws') + '/abv';
		if (me.sock) me.sock.close();

		me.sock = ts.isBrowser() ? new sock(host):new sock(host,{origin:url});  
		me.sock.binaryType = 'arraybuffer';
		
		if (ts.isBrowser()){
			me.sock.onerror = () => {
				me.log('Socket error');
			};
			
			me.sock.onopen = () => {
				me.ready = true;
				me.opened();
			};
			
			me.sock.onclose = () => {
				me.log('Connection closed');
			};
			
			me.sock.onmessage = (e) => {
				const msg = e.data;
				me.process(msg);
			};
		}else{
			me.sock.on('open', () => {
				me.ready = true;
				me.opened();
			});

			me.sock.on('message', (msg) => {
				me.process(msg);
			});

			me.sock.on('close', () => {
				me.log('Connection closed');
			});

			me.sock.on('error', (err) => {
				if (err.code === 'ECONNREFUSED'){
					ts.debug('no connection');
				}else{
		//			ts.debug(err);
				}
			});
		}
		return true;
	}
	
	/**
	 * Set commands
	 * @param {string} cmd - Command.
	 * @param {function} cb - Callback function.
	 */
	on(cmd,cb)
	{
		let ix = $commands.indexOf(cmd);
		if (ix === -1){
			ts.warn(141,"New cmd: " + cmd);
			ix = $commands.push(cmd) - 1;
		}
		this.cmd[ix] = cb;
	}
	
	/**
	 * Join room
	 * @param {string} room - The room name.
	 */
	join(room)
	{
		if (room == this.id) return;
		this.rooms.add(room);
		if (!$rooms.has(room))$rooms.set(room, new Set());
		$rooms.get(room).add(this);
	}

	/**
	 * Leave room
	 * @param {string} room - The room name.
	 */
	leave(room)
	{
		if (room == this.id) return;
		this.rooms.delete(room);
		if ($rooms.has(room)){
			$rooms.get(room).delete(this);
			if ($rooms.get(room).size == 0)$rooms.delete(room);
		}
	}
	
	/**
	 * @param {[object]} [msg] [Message object]
	 */
	process(msg)
	{
		let m = null;
		try{
			m = pack.decode(msg);
		}catch(e){}

		if (m && m.c){
			const cb = this.cmd[m.c];
			if (typeof cb === $fn) cb(m);
			else ts.error(186,$no + 'cmd: ' + m.c);
		}else{
			ts.error(188,$no + 'msg['+ -1 +']');
		}
	}

	echo(msg, cb)
	{
		const m = pack.encode(msg);
		if (ts.isBrowser()){
			let error = false;
			try{ this.sock.send(m); }catch(e){ error = e; }
			if (typeof cb === $fn) return cb(error);
			if (error) ts.debug(199,error);
		}else{
			this.sock.send(m, (err) => {
				if (typeof cb === $fn) return cb(err);
				if (err) ts.debug(203,err);
			});
		}
	}
	
	send(cmd,body,to)
	{
		if (typeof cmd === 'object')return this.echo(cmd);
		this.echo($cmd2msg(cmd,body,to));
	}

	opened(){ this.log('Connection established'); }
	/**
	 * Close client
	 */
	close()
	{
		if (this.sock) this.sock.close();
		$clients.delete(this);
		$rooms.forEach((room) => room.delete(me));
	}

}// Socket

module.exports = {
	Socket:		Socket,
	clients:	$clients,
	rooms:		$rooms,
	commands:	$commands
};
