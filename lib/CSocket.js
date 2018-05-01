/**
 * Abvos client side Socket
 */
"use strict";

const ts = require('abv-ts')('abv:CSocket');
const Socket = require('./Socket.js');

class CSocket extends Socket
{
	constructor(host,sock)
	{
		super();
		
		this.queue = new Map();
		this.mid = 1;
	
		this.connect(host,sock);
	}
	
	/**
	 * Connect to server
	 * @param {string} url - The host url.
	 */
	connect(url,sock)
	{
		if (!url || !sock){
			return false;
		}else if (sock.name == 'Socket'){
		}else if (!url || !url.startsWith('http')){
			ts.error(70,'No url: ' + url);
			return false;
		}
		
		const me = this;
		const host = url.replace("http", 'ws') + '/abv';
		ts.log(76,host);
		if (this.sock) this.sock.close();

		if (ts.isBrowser){
			this.sock = new sock(host);
		}else if (sock.name == 'WebSocket'){
			this.sock = new sock(host,{origin:url});  
		}else{
			this.sock = new sock();
			this.sock.send = me.sock.write;
			this.sock.connect(8080,'localhost'); // FIXME: ip/port/sock
		}
		
		this.sock.binaryType = 'arraybuffer';
		
		if (ts.isBrowser){
			this.sock.onopen = () => me.opened();
			
			this.sock.onmessage = (e) => me.process(e.data);

			this.sock.onclose = () => me.closed();
			
			this.sock.onerror = () => me.log('Socket error');
			
		}else {
			this.sock.on('open', () => me.opened());

			this.sock.on('message', (msg) => me.process(msg));

			this.sock.on('close', () => me.closed());

			me.sock.on('connect', () => me.opened()); // net socket

			me.sock.on('data', (msg) => me.process(msg)); // net socket

			this.sock.on('error', (err) => {
				if (err && err.code === 'ECONNREFUSED'){
					ts.debug('no connection');
				}else{
					ts.error(111,err);
				}
			});
		}
		return true;
	}
	
	opened()
	{ 
		this.log('Connection established'); 
		this.info = {name: ts.rand()};
		this.send('id',ts.toString(this.info),'');
	}
	closed()
	{ 
		this.log('Connection closed'); 
	}

    call(cmd,body,to,timeout=0 /* ms */)
    {
		if (!timeout) timeout = 0;
		
		let m = this.c2m(cmd,body,to); 
	
		if (m === null) return;
		
//		const cb = this.listeners(m.c)[0];
//		if (typeof cb !== ts.FN) m.c = 'err';
//		else 
		if (!m.t.startsWith('@')) {}
		else if (timeout > 0) m.m = this.mid++;
	
//ts.debug(151,m);
		const me = this;
		
        return new Promise((resolve, reject) => {
            if (me.id === '') return reject(new Error("Not ready"));
            if (m.c === 'err') return reject(new Error(ts.UK + ' cmd: ' + cmd));
            if (m.t === me.id) return reject(new Error("Selfcall: " + cmd));

			me._send(m, (err) => {
                if (err) return reject(err);

				if (m.m){
					me.queue.set(m.m, { 
						resolve: resolve, 
						reject:reject,
						end: Date.now() + timeout});
				}else{
					resolve('');
				}			
			}); 
		});
	}
		
	process(msg)
	{
		const me = this;

		const m = this.decode(msg);

		if (m && m.c){
			const cb = this.listeners(m.c)[0];
			if (typeof cb !== ts.FN) return ts.error(140,ts.UK + ' cmd: ' + m.c);
		
			if ((m.t === me.id) && m.m){
				if (this.queue.has(m.m)){
					const p = this.queue.get(m.m); 
					const d = Date.now() - p.end;
					if (d > 0){
						 m.b = 'Timeout: +' + d + 'ms';
						 m.e = true;
					}
					if (m.e) p.reject(m); else p.resolve(m);
					this.queue.delete(m.m);
				}else{ ts.info(152,m);
					try{ 
						m.b = cb(m); 
					}catch(e){
						m.b = e;
						m.e = true;
					}
					m.t = m.f;
					m.f = this.id;
					this._send(m);
				}
			}else{
				this.emit(m.c,m);
			}
		}else{
			ts.error(209,ts.UK + 'msg['+ -1 +']');
		}
	}
		
	file(msg) { this.log(msg.n); }
	out(s) { this.log(s); }
	log(s) {  }

} // CSocket

module.exports = CSocket;
