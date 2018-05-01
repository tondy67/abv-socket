/**
 * Abvos socket
 * @module abv-socket
 */
"use strict";

const ts = require('abv-ts')('abv:Socket');
const fs = require('abv-vfs');
const Conn = require('./Conn.js');

const $size = 1048576; // 1 MB
const $maxfile = 2 * 1048576; // 2 MB
const $maxstream = 4 * 1048576; // 4 MB
let $throttle = false;

let $sid = 1;
const $clients = new Map();	
const $rooms = new Map();

const $file2obj = (name, body, type='', size=0) => {
	return {n: name, b: body, e: type, l:size};
};

class Socket extends Conn
{
	constructor(sock) 
	{
		super();
		this.sock = sock;
		this.id = sock ? '@' + $sid++ : '';ts.debug(50,this.id);
		this.info = null;
		$clients.set(this.id,this); 
		this.rooms = new Set();
		this.rooms.add(this.id);
		this.streams = new Map();
	}
    
    f2o(name, body, type='', size=0)
    {
		return $file2obj(name, body, type, size);
	}

    c2m(cmd, body, to, src='', dst='')
    {
		if (!ts.is(to,String)) to = '';
		
		return {c: cmd, b: body, f: this.id, t: to, s: src, d: dst};
	}
	
	log(s)
	{
		ts.log(s);
	}
	
	progress(meta,chunk) { ts.debug(78,meta); }
	
	_read(meta,chunk)
	{
		const name = meta.n;
		if (!this.streams.has(name)){
			const ws = fs.createWriteStream('files/' + name,null,meta); 
			ws.on('finish', () => { 
				this.streams.delete(name); ts.info('finish ');
			});
			this.streams.set(name,{ws:ws, size:0});
		}
		const f = this.streams.get(name);

		if(chunk){
			f.ws.write(Buffer.from(chunk));
			f.size += chunk.byteLength;
			if ((f.size > meta.l)&&(meta.l > 0)) f.size = meta.l;
			meta.p = meta.l > 0 ?Math.round((f.size/meta.l)*100):f.size;
			this.progress(meta,chunk);
		}
		if (meta.end){
			f.ws.end();
			this.progress(meta,null);
		} 
	}	

	_write(meta,chunk)
	{
		const name = meta.n;
		const f = this.streams.get(name); 
		let end = false;
		const fo = this.f2o(name,chunk,meta.e,meta.l);
		if (chunk){
			meta.size += chunk.byteLength;
			if (meta.size >= meta.l){
				meta.size = meta.l;
				end = meta.end = true;
			}
		}
		fo.end = meta.end; 
		this.send('write', fo, meta.to);
		const rest = this.sock.bufferedAmount;
		const max = 4 * $size;		
		if (rest > max){ ts.debug(122,'pause');
			f.rs.pause(); 
			setTimeout(()=>{f.rs.resume();}, (rest/max) * 1000);
		}
		if (meta.l > 0) f.cb(Math.round((meta.size/meta.l)*100));	
		if (end){ this.streams.delete(name);ts.info('end'); }
	}	

	write(name, body, type='', size=0, to='', cb=null)
	{
		if ($throttle && (size > $maxstream)) return ts.error(109,'limit',$maxstream);
		if (this.streams.has(name)) return  ts.error(110,'exists',name);

		cb = typeof cb === ts.FN ? cb : ()=>{};
		const meta = this.f2o(name,null,type,size);
		// direct send
		if (ts.range(size,$maxfile)){
//			f.body = ts.isBrowser ? body : fs.readFileSync(name);
			this.send('file', body, to);
			cb(1);
			return;
		}
		// start stream
		meta.to = to; meta.end = false; meta.size = 0;
		const opt = {highWaterMark: $size};
		const rs = body ? fs.createRStream(this, body, opt) :
			fs.createReadStream(name, opt); 
		rs.on('error', (e) => { ts.error(126,e.stack); });
		rs.on('data', (chunk) => { this._write(meta,chunk); });
		this.streams.set(name,{rs:rs, cb: cb});
	}
	
	_send(msg, cb)
	{
		const me = this;
		let error = false;
		cb = typeof cb === ts.FN ? cb : false;
		
		const m = this.encode(msg);
	
		if (m === null){
			error = 'null';
			if (cb) return cb(error);
			return ts.error(165,error);
		}
		
		ts.debug(163,msg.c,msg.f,msg.t,msg.m);
		if(this.sock)ts.debug(164,this.sock.bufferedAmount);
		
		const s = me.id + " closed";

		if (ts.isBrowser){
			error = false;
			try{ this.sock.send(m); }catch(e){ error = e; }
			if (error){
				ts.error(176,s);
				this.close();
			}
			if (cb) return cb(error);
		}else {
			this.sock.send(m, (err) => {
				if (err){
					ts.error(183,err);//me.emit('error',err);
					me.close();
				}
				if (cb) return cb(err);
			});
		}
	}
	
	send(cmd,body,to)
	{
		if (!ts.is(cmd,String)) return ts.error(171, ts.UK + ' cmd: ' + cmd);
		this._send(this.c2m(cmd,body,to));
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
	 * Close client
	 */
	close()
	{
		const me = this;
		if (this.sock){
			if (this.sock.url)this.sock.close();
			else this.sock.close(); // terminate
		}
		$clients.delete(me.id);
		$rooms.forEach((room) => room.delete(me.id));
	}

	get throttle() { return $throttle; }
	set throttle(v) { $throttle = v === true ? true : false; }

	static get clients() { return $clients; }
	static get rooms() { return $rooms; }
}

module.exports = Socket;
