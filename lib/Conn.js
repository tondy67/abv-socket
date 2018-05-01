/**
 * Abvos socket
 * @module abv-socket
 */
"use strict";

const ts = require('abv-ts')('abv:Conn');
const Events = require('abv-events');
const Pack = require('abv-pack');
const $pack = new Pack();

class Conn extends Events
{
	constructor() 
	{
		super();
	}
	
	get limit() { return $pack.limit; }
	
	process(msg)
	{
		const m = this.decode(msg);

		if (m && m.c){	
			this.emit(m.c,m);
		}else{
			ts.error(31,ts.UK + ' msg['+ -1 +']');
		}
	}

	encode(msg, opt=null)
	{
		return $pack.encode(msg);
	}
	
	decode(buf, opt=null)
	{
		return $pack.decode(buf);
	}

}

module.exports = Conn;
