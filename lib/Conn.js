/**
 * Abvos socket
 * @module abv-socket
 */
"use strict";

const ts = require('abv-ts')('abv:socket.Conn');
const Events = require('events');
const Pack = require('./Pack.js');

const $opt = {psw: 'user.password', iv: 'user.iv'};

class Conn extends Events
{
	constructor() 
	{
		super();
	}
	
	get limit() { return Pack.limit; }
	
	process(msg)
	{
		const m = this.decode(msg);

		if (m && m.c){	
			this.emit(m.c,m);
		}else{
			ts.error(29,ts.UK + ' msg['+ -1 +']');
		}
	}

	encode(msg, opt=null)
	{
		let psw, iv;
		if (opt && opt.psw && opt.iv){
			psw = opt.psw;
			iv = opt.iv;
		}
		return Pack.encode(this.encrypt(msg, psw, iv));
	}
	
	decode(msg, opt=null)
	{
		let psw, iv;
		if (opt && opt.psw && opt.iv){
			psw = opt.psw;
			iv = opt.iv;
		}
		return this.decrypt(Pack.decode(msg), psw, iv);
	}

	encrypt(msg, psw, iv)
	{
		return msg;
	}
	
	decrypt(msg, psw, iv)
	{
		return msg;
	}

}

module.exports = Conn;
