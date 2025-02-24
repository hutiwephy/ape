const CryptoJS = require("crypto-js");


/**
 * 
 * @param {CryptoJS.lib.WordArray} wa 
 * @returns {Uint8Array|Buffer}
 */
function WordArray2ArrayBuffer(wa){
    var length = wa.sigBytes;
    if(length < 0){ length = 0; }
    /** @type {Uint8Array|Buffer} */
    var buf8b = (typeof window == 'undefined')? new Buffer.alloc(length) : new Uint8Array(length);

    for(var i=0; i<length; i++){
        var shift = 24-((i%4)*8);
        var mask = 0xff << shift;

        buf8b[i] = (wa.words[(i/4)|0] & mask)>>shift;
    }

    return buf8b;
}

Uint8Array.concat = function(){
    var values = [];

    function raster(a){
        if(typeof a == "number"){
            values.push(a);
        }else{
            for(var i=0; i<a.length; i++){
                raster(a[i]);
            }
        }
    }

    raster(arguments);
    var buf8b = new Uint8Array(values.length);
    for(var i=0; i<values.length; i++){
        buf8b[i] = values[i];
    }
    return buf8b;
};

/**
 * 
 * @param {'utf8'|'base64'|'base64url'|'hex'} encoding 
 * 
 * @returns {string} 
 */
Uint8Array.prototype.toString = function(encoding="utf8"){
    switch(encoding){
        case "utf8":
            encoding = CryptoJS.enc.Utf8;
            break;
        case "base64":
            encoding = CryptoJS.enc.Base64;
            break;
        case "base64url":
            encoding = CryptoJS.enc.Base64url;
            break;
        case "hex":
            encoding = CryptoJS.enc.Hex;
            break;
        default:
            throw new Error(`Unsupported Encoding "${encoding}"`);
    }

    return CryptoJS.lib.WordArray.create(this).toString(encoding);
}

/**
 * 
 * @param {'MD5'|'RIPEMD160'|'SHA1'|'SHA224'|'SHA256'|'SHA384'|'SHA512'} algorithm 
 * @param {string|ArrayBufferLike} message 
 * 
 * @returns {Uint8Array} 
 */
function hash(algorithm, message){
    algorithm = algorithm.replace("-", "").toUpperCase();
    if(!(['MD5', 'RIPEMD160', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512'].includes(algorithm))){
        throw new Error(`Unsupported Algorithm "${algorithm}"`);
    }

    if(typeof message == "string"){
        message = CryptoJS.enc.Utf8.parse(message);
    }else{
        message = CryptoJS.lib.WordArray.create(message);
    }

    return WordArray2ArrayBuffer(CryptoJS[algorithm](message));
}

module.exports = {
    hash,
    WordArray2ArrayBuffer,
};
