/**
 * Abvos client side socket
 * 
 */
"use strict";

const ts = require('abv-ts')('abv:socket.CSocket');
const pack = require('./pack.js');
const socket = require('./socket.js');

const $fn = 'function';
const $no = 'Unknown ';

class CSocket extends socket.Socket
{
	constructor(host,sock)
	{
		super();
		const me = this;
		
		this.queue = new Map();
		this.mid = 1;

		this.connect(host,sock);
		
		this.on('echo',(msg) => {
			var r = Date.now() + '';
			return r;
		});
		
		this.on('msg',(msg) => {
			me.out(msg.f.substr(0,5)+'>'+msg.t.substr(0,5)+': ' + msg.b);
		});
		
		this.on('id',(msg) => {
			me.id = msg.t;
		});

		this.on('online',(msg) => {
			me.out('online: '+ msg.b);
		});

		this.on('file',(msg) => {
			me.file(msg);
		});

	}

    call(cmd,body,to,timeout=0 /*ms*/)
    {
		const me = this;
		let msg = me.c2m(cmd,body,to); 
		if (typeof me.cmd[msg.c] !== $fn) msg.c = 0;
		else if (timeout > 0) msg.m = me.mid++;
	
        return new Promise((resolve, reject) => {
            if (!me.ready || (msg.c == 0)) return reject("Not ready");
            if (msg.t === me.id) return reject("Call self: " + cmd);

			me.echo(msg, (err) => {
                if (err) return reject(err);

				if (msg.m){
					me.queue.set(msg.m, { 
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
		let m = null;
		try{ m = pack.decode(msg); }catch(e){}

		if (m && m.c){
			const cb = me.cmd[m.c];
			if (typeof cb !== $fn) return ts.error(83,$no + 'cmd: ' + m.c);
		
			if ((m.t === me.id) && m.m){
				if (me.queue.has(m.m)){
					const p = me.queue.get(m.m); 
					const d = Date.now() - p.end;
					if (d > 0){
						 m.b = 'Timeout: +' + d + 'ms';
						 m.e = true;
					}
					if (!m.e) p.resolve(m);	else p.reject(m);
					me.queue.delete(m.m);
				}else{
					m.t = m.f;
					try{ 
						m.b = cb(m); 
					}catch(e){
						m.b = e;
						m.e = true;
					}

					me.send(m);
				}
			}else{
				cb(m);
			}
		}else{
			ts.error(110,$no + 'msg['+ -1 +']');
		}
	}
		
	file(msg) { this.log(msg.name); }
	out(s) { this.log(s); }
	log(s) {  }

} // CSocket

module.exports = CSocket;
