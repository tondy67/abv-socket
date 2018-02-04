/**
 * Pack 'flat' object with binary properties
 */
"use strict";

const ts = require('abv-ts')('abv:socket.Pack');

let $limit = 2 * 1048576; // 2 MB

class Pack
{
	constructor() { throw new Error(ts.SC); }
	
	static get limit(){ return $limit; }

	static set limit(v)
	{ 
		if (ts.is(v,ts.INT) && (v > 0)) $limit = v; 
	}

	static encode(obj)
	{
		let r = null;
		if(!obj) return r;

		const bufs = [];
		const keys = [];
	
		Object.keys(obj).forEach((key,index) => {
			if (!obj[key]) return;
		
			if (ts.is(obj[key],Buffer)){
				if (ts.isBrowser){
					// FIXME: FakeBuffer.buffer !== ArrayBuffer ?!
					obj[key] = new Uint8Array([...obj[key]]).buffer;
					ts.debug(36,'fake buf');
				}else{
					obj[key] = obj[key].buffer; 
				}
			}

			if (ts.is(obj[key],ArrayBuffer)){
				keys.push(key);
				bufs.push(obj[key]);
				delete obj[key];
			}
		});
		
		let sbuf = ts.str2ab(keys.join(',')); 
		bufs.unshift(sbuf);
		sbuf = ts.str2ab(ts.toString(obj)); 
		bufs.unshift(sbuf);

		const sizes = [];
		for (let it of bufs) sizes.push(it.byteLength);
		const sum = ts.sum(sizes);
		sizes.unshift(sizes.length);

		const total = sum + (sizes.length + 1)*4;
		if (total > $limit) return $err(60);

		const buf = new ArrayBuffer(total);
		const dv = new DataView(buf);
		dv.setUint32(0,total);
		let pos = 4;
		for (let it of sizes){
			dv.setUint32(pos,it);
			pos += 4;
		}
	
		const u8 = new Uint8Array(buf);
		sizes.shift();
		for (let it of bufs){
			u8.set(new Uint8Array(it),pos);
			pos += sizes.shift();
		}

		r = buf; 
		if (r.byteLength > $limit) return $err(79);
	
		return r;
	}
		
	static decode(buf)
	{
		let r = null;
		if (!buf) return r;
		
		if (buf.byteLength > $limit) return $err(89);
		// FIXME: ws , FakeBuffer ?!, 20180203
		if (ts.is(buf,Buffer)) buf = new Uint8Array([...buf]).buffer;//buf = buf.buffer;

		if (!ts.is(buf,ArrayBuffer)) return r;

		let len = buf.byteLength;
		if (len < 8) return r;
		const dv = new DataView(buf);
		const total = dv.getUint32(0);	
		if (total != len) return r;

		try{
			const bufs = [];
			const sizes = [];
			len = dv.getUint32(4) + 2;
			for (let i=2; i<len; i++) {
				sizes.push(dv.getUint32(i*4));
			}
			let pos = len*4;
			r = ts.fromString(ts.ab2str(buf.slice(pos,pos+sizes[0])));	
			pos += sizes[0];
			const keys = ts.ab2str(buf.slice(pos,pos+sizes[1])).split(',');
			pos += sizes[1];
			for (let i=2; i<sizes.length; i++) {
				bufs.push(buf.slice(pos,pos+sizes[i])); 
				pos += sizes[i];
			}
			for (let i in keys){
				if (keys[i]) r[keys[i]] = bufs[i];
			}
		}catch(e){ ts.error(120,e.stack); }
	
		return r;	
	}

}// Pack

const $err = (line=127) => {
	ts.error(line, 'Limit: ' + $limit);
	return null;
};

module.exports = Pack;
