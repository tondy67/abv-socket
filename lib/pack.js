/**
 * Pack 'flat' object with binary properties
 */
"use strict";

const ts = require('abv-ts')('abv:socket.Pack');

class Pack
{
	constructor()
	{
		throw new Error('Static class!');
	}
	
	static encode(obj)
	{
		let r = null;
		const bufs = [];
		const keys = [];
		
		if (obj){
			Object.keys(obj).forEach((key,index) => {
				if (ts.is(obj[key],Buffer)) obj[key] = obj[key].buffer;
				
				if (ts.is(obj[key],ArrayBuffer)){
					keys.push(key);
					bufs.push(obj[key]);
					delete obj[key];
				}
			});
		}

		if (keys.length > 0){	
			obj.__kEyS__ = keys;
			const sbuf = ts.str2ab(ts.toString(obj)); 
			bufs.push(sbuf);
				
			const ibuf = new ArrayBuffer(bufs.length*4 + 1);
			const dv = new DataView(ibuf);
			dv.setUint8(0,bufs.length);
	
			let size = 0;
			for (let i=0, len=bufs.length; i<len; i++) {
			  dv.setUint32(1+i*4, bufs[i].byteLength);
			  size += bufs[i].byteLength;
			}
	
			const buf = new ArrayBuffer(ibuf.byteLength + size);
			const u8 = new Uint8Array(buf);
			const a8 = [new Uint8Array(ibuf)]; 
			u8.set(a8[0]); 
			size = 0;
			for (let i=0, len=bufs.length; i<len; i++) {
				a8[i+1] = new Uint8Array(bufs[i]);
				size += a8[i].length;
				u8.set(a8[i+1],size); 
			}
			r = buf; 
		}else{
			r = ts.toString(obj);
		}

		return r;
	}
		
	static decode(obj)
	{
		let r = null;
		
		if (ts.is(obj,Buffer)) obj = obj.buffer;
		
		if (ts.is(obj,ArrayBuffer)){
			const dv = new DataView(obj);
			const bufs = [];
			const len = dv.getUint8(0);
			const sizes = [];
			for (let i=0; i<len; i++) {
				sizes.push(dv.getUint32(1+i*4));
			}
	
			let start = len*4+1;
			for (let i=0; i<len; i++) {
				bufs.push(obj.slice(start,start+sizes[i])); 
				start += sizes[i];
			}
			r = ts.fromString(ts.ab2str(bufs[len-1]));	
			for (let i in r.__kEyS__){
				r[r.__kEyS__[i]] = bufs[i];
			}
			delete r.__kEyS__;
		}else{
			r = ts.fromString(obj);
		}
		return r;	
	}

}// Pack

module.exports = Pack;
