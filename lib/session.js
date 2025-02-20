const CryptoJS = require("crypto-js");
const jwt = require("./jwt.js");
const {WordArray2ArrayBuffer} = require("./extensions.js");


class Session {
    static InvalidJWTPropertyOverride = class extends Error {
        message = "Attempted to override a forbiden property or provided an invalid value";
    }
    static InvalidDateError = class extends Error {
        message = "JWT Date is outside of allowed range";
    };
    static AuthParserException = class extends Error {
        message = "Failed to parse the provided Authorization string";
    };
    static InvalidEncryptionAlgorithm = class extends Error {
        message = "The Provided encryption algorithm is unsupported";
    };
    static InvalidSigningAlgorithm = class extends Error {
        message = "The Provided signing algorithm is unsupported";
    };
    static InvalidSaltLength = class extends Error {
        message = "The Provided salt is not of the correct size";
    };
    static InvalidIVLength = class extends Error {
        message = "The Provided iv is not of the correct size";
    };
    static FailedVerification = class extends Error {
        message = "Failed to verify";
    };
    static MissingVerification = class extends Error {
        message = "Cannot encrypt and/or decrypt without verified session";
    }


    /**
     * @type {null|({
     *      header: {
     *          alg: string,
     *          enc: string,
     *          typ: string,
     *          iv: string,
     *      },
     *      payload: {
     *          sub: string
     *          iat: number,
     *          salt: string,
     *      },
     *      signed: string,
     * })}
     */
    #jwt = null;
    /** @type {null|CryptoJS.lib.WordArray} */
    #salt = null;
    /** @type {null|CryptoJS.lib.WordArray} */
    #iv = null;
    /** @type {null|CryptoJS.lib.WordArray} */
    #key = null;

    #validAlgorithms = {
        sign: [
            "HS256",
            "HS384",
            "HS512"
        ],
        encrypt: {
            "AES-128-CBC": {
                length: 128,
                mode: CryptoJS.mode.CBC,
            },
            "AES-128-CFB": {
                length: 128,
                mode: CryptoJS.mode.CFB,
            },
            "AES-128-CTR": {
                length: 128,
                mode: CryptoJS.mode.CTR,
            },
            "AES-128-ECB": {
                length: 128,
                mode: CryptoJS.mode.ECB,
            },

            "AES-192-CBC": {
                length: 192,
                mode: CryptoJS.mode.CBC,
            },
            "AES-192-CFB": {
                length: 192,
                mode: CryptoJS.mode.CFB,
            },
            "AES-192-CTR": {
                length: 192,
                mode: CryptoJS.mode.CTR,
            },
            "AES-192-ECB": {
                length: 192,
                mode: CryptoJS.mode.ECB,
            },

            "AES-256-CBC": {
                length: 256,
                mode: CryptoJS.mode.CBC,
            },
            "AES-256-CFB": {
                length: 256,
                mode: CryptoJS.mode.CFB,
            },
            "AES-256-CTR": {
                length: 256,
                mode: CryptoJS.mode.CTR,
            },
            "AES-256-ECB": {
                length: 256,
                mode: CryptoJS.mode.ECB,
            },

        },
    };

    /**
     * @overload
     * Build a Session from a HTTP Authentication String (JWT)
     * 
     * @param {string} token
     *
     * 
     * @overload
     * Build a Session from a client id and secret
     * 
     * @param {string|ArrayBufferLike} id
     * @param {string|ArrayBufferLike} secret
     *
     * 
     * @overload
     * Build a Session from a client id and secret with custom jwt parameters
     * 
     * @param {string|ArrayBufferLike} id
     * @param {string|ArrayBufferLike} secret
     * @param {({
     *      header?: {
     *          alg?: string,
     *          enc?: string,
     *          iv?: string,
     *      },
     *      payload?: {
     *          iss?: string,
     *          aud?: string,
     *          exp?: string,
     *          nbf?: string,
     *          iat?: string,
     *          jti?: string,
     *          salt?: string,
     *      },
     * })} options
     * 
     */
    constructor(){
        var token = null;
        /** @type {({id: string|ArrayBufferLike|CryptoJS.lib.WordArray, secret: string|ArrayBufferLike|CryptoJS.lib.WordArray})|null} */
        var client = null;
        var options = null;
        var length = 256;

        switch(arguments.length){
            case 1:
                token = arguments[0];
                break;
            case 2:
                client = {
                    id: arguments[0],
                    secret: arguments[1],
                };
                break;
            case 3:
                client = {
                    id: arguments[0],
                    secret: arguments[1],
                };
                options = arguments[2];
                break;
            default:
                throw RangeError("Invalid argument count");
        }

        if(token !== null){
            if(typeof token != "string"){
                throw new TypeError("token parameter expected to be string");
            }

            // Parse JWT
            var tk = null;
            try{
                tk = jwt.decode(token);
            }catch(err){
                throw new Session.AuthParserException();
            }

            
            // typ
            if(tk.header.typ !== "JWT"){
                throw new Session.AuthParserException();
            }

            // alg
            if(typeof tk.header.alg != "string" || !(this.#validAlgorithms.sign.includes(tk.header.alg))){
                throw new Session.AuthParserException();
            }

            // enc
            if(typeof tk.header.alg != "string" || !(Object.keys(this.#validAlgorithms.encrypt).includes(tk.header.enc))){
                throw new Session.AuthParserException();
            }
            length = this.#validAlgorithms.encrypt[options.header.enc].length;

            // iv
            if(typeof tk.header.alg == "string"){
                var tmpiv = CryptoJS.enc.Base64url.parse(tk.header.iv);
                if(tmpiv.sigBytes != 16){
                    throw new Session.InvalidIVLength();
                }

                this.#iv = tmpiv;
            }else{
                throw new Session.AuthParserException();
            }

            // sub
            if(typeof tk.payload.sub == "string"){
                CryptoJS.enc.Base64url.parse(tk.payload.sub);
            }else{
                throw new Session.AuthParserException();
            }

            // salt
            if(typeof tk.payload.sub == "string"){
                var tmpsalt = CryptoJS.enc.Base64url.parse(tk.payload.sub);
                if(tmpsalt.sigBytes != length){
                    throw new Session.InvalidSaltLength();
                }

                this.#salt = tmpsalt;
            }else{
                throw new Session.AuthParserException();
            }

            // iat
            if(typeof tk.payload.sub != "number"){
                throw new Session.AuthParserException();
            }
        }else if(client !== null){
            // Parse options
            //   Defaults
            this.#salt = CryptoJS.lib.WordArray.random(length);
            this.#iv = CryptoJS.lib.WordArray.random(16);
            var default_options = {
                header: {
                    alg: "HS256",
                    enc: "AES-256-CBC",
                    typ: "JWT",
                    iv: this.#iv.toString(CryptoJS.enc.Base64url),
                },
                payload: {
                    iat: Date.now(),
                    salt: this.#salt.toString(CryptoJS.enc.Base64url),
                }
            };
            if(options == null){
                options = default_options;
            }

            //   Header
            if(typeof options["header"] != "object"){
                options.header = default_options.header;
            }else{
                // typ
                if(options.header.typ !== "JWT"){
                    throw new Session.InvalidJWTPropertyOverride();
                }
                options.header.typ = default_options.header.typ;

                // alg
                if(typeof options.header.alg != "string"){
                    options.header.alg = default_options.header.alg;
                }else if(!(this.#validAlgorithms.sign.includes(options.header.alg))){
                    throw new Session.InvalidSigningAlgorithm();
                }

                // enc
                if(typeof options.header.enc != "string"){
                    options.header.enc = default_options.header.enc;
                }else if(!(Object.keys(this.#validAlgorithms.encrypt).includes(options.header.enc))){
                    throw new Session.InvalidSigningAlgorithm();
                }
                length = this.#validAlgorithms.encrypt[options.header.enc].length;

                // iv
                if(typeof options.header.iv != "string"){
                    options.header.iv = default_options.header.iv;
                }else{
                    var tmpiv = CryptoJS.enc.Base64url.parse(options.header.iv);
                    if(tmpiv.sigBytes != 16){
                        throw new Session.InvalidIVLength();
                    }

                    this.#iv = tmpiv;
                }
            }
            
            //   Payload
            if(typeof options["payload"] != "object"){
                options.payload = default_options.payload;
            }else{
                // sub
                if(options.payload.sub !== undefined){
                    throw new Session.InvalidJWTPropertyOverride();
                }

                // iat
                if(typeof options.payload.iat != "number"){
                    options.payload.iat = default_options.payload.iat;
                }

                // salt
                if(typeof options.payload.salt != "string"){
                    options.payload.salt = default_options.payload.salt;
                }else{
                    var tmpsalt = CryptoJS.enc.Base64url.parse(options.payload.salt);
                    if(tmpsalt.sigBytes != length){
                        throw new Session.InvalidSaltLength();
                    }

                    this.#salt = tmpsalt;
                }
            }

            // Validate Client ID
            if(typeof client.id == "string"){
                client.id = CryptoJS.enc.Base64.parse(client.id);
            }else if(client.id instanceof ArrayBuffer || ArrayBuffer.isView(client.id)){
                client.id = CryptoJS.lib.WordArray.create(client.id);
            }else{
                throw new TypeError("id parameter expected to be base64 string or buffer");
            }
            options.payload.sub = CryptoJS.enc.Base64url.stringify(client.id);

            // Validate Client Secret
            if(typeof client.secret == "string"){
                client.secret = CryptoJS.enc.Base64.parse(client.secret);
            }else if(client.secret instanceof ArrayBuffer || ArrayBuffer.isView(client.secret)){
                client.secret = CryptoJS.lib.WordArray.create(client.secret);
            }else{
                throw new TypeError("secret parameter expected to be base64 string or buffer");
            }

            // Build JWT
            this.#jwt = {
                header: options.header,
                payload: options.payload,
            };
            
            // Generate Key
            this.#key = this.#generateKey(client.secret);

            // Sign JWT
            this.#jwt.signed = jwt.sign(this.#jwt.header, this.#jwt.payload, this.#key);
        }else{
            throw new Error("Unknown Malfunction");
        }
    }

    get jwt(){
        var tmp = (function(){
            return {
                header: this.#jwt.header,
                payload: this.#jwt.payload,
            };
        })();
        Object.freeze(tmp);
        return tmp;
    }
    get clientId(){
        return WordArray2ArrayBuffer(CryptoJS.enc.Base64url.parse(this.#jwt.payload.sub));
    }
    get token(){
        return (this.#key !== null)? this.#jwt.signed : null;
    }

    /**
     * 
     * @param {CryptoJS.lib.WordArray} secret 
     * 
     * @returns {CryptoJS.lib.WordArray}
     */
    #generateKey(secret){
        secret = secret.concat(CryptoJS.enc.Utf8.parse(`${this.#jwt.payload.iat}`));

        return CryptoJS.PBKDF2(secret, this.#salt, {
            keySize: this.#validAlgorithms.encrypt[this.#jwt.header.enc].length/32,
        });
    }

    /**
     * Attempts verification with secret if key is already populated will throw error
     * 
     * @param {null|string|ArrayBufferLike} secret 
     * @param {({
     *  critical?: Array.<string>,
     *  date?: number,
     *  maxlifetime?: number,
     *  tolerance?: number,
     *  validators?: {
     *      issuer?: Array.<string>|function(string):boolean,
     *      audience?: Array.<string>|function(string):boolean,
     *      jwtid?: Array.<string>|function(string):boolean,
     *  },
     * })} options 
     * 
     * @returns {boolean}
     */
    verify(secret, options={}){
        var key = this.#key;
        if(key == null){
            // Validate Client Secret
            if(typeof secret == "string"){
                secret = CryptoJS.enc.Base64.parse(secret);
            }else if(secret instanceof ArrayBuffer || ArrayBuffer.isView(secret)){
                secret = CryptoJS.lib.WordArray.create(secret);
            }else{
                throw new TypeError("secret parameter expected to be base64 string or buffer");
            }

            key = this.#generateKey(secret);
        }

        if(options?.validators?.subject != null){
            options.validators.subject = undefined;
        }
        
        var result = jwt.verify(this.#jwt.signed, key, options);
        if(this.#key == null && result){
            this.#key = key;
        }

        return result;
    }

    /**
     * If key is populated it will encode a chunk of data into a body chunk
     * 
     * @param {string|ArrayBufferLike} chunk 
     * @returns {string} 
     */
    encode(chunk){
        if(this.#key === null){
            throw new Session.MissingVerification();
        }
        if(typeof chunk == "string"){
            chunk = CryptoJS.enc.Utf8.parse(chunk);
        }else if(chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk)){
            chunk = CryptoJS.lib.WordArray.create(chunk);
        }else{
            throw new TypeError("chunk parameter expected to be base64 string or buffer");
        }

        var tmp = CryptoJS.AES.encrypt(chunk, this.#key, {
            iv: this.#iv,
            mode: this.#validAlgorithms.encrypt[this.#jwt.header.enc].mode,
            padding: CryptoJS.pad.Pkcs7,
        }).ciphertext;
        return `${CryptoJS.enc.Base64url.stringify(tmp)}.`;
    }

    /**
     * If key is populated it will decode a body chunk into a chunk of data
     * 
     * @param {string|ArrayBufferLike} chunk 
     * @returns {Buffer|Uint8Array} 
     */
    decode(chunk){
        if(this.#key === null){
            throw new Session.MissingVerification();
        }
        chunk = CryptoJS.enc.Base64url.parse(chunk.replace(".", ""));
        
        var tmp = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({
                mode: this.#validAlgorithms.encrypt[this.#jwt.header.enc].mode,
                padding: CryptoJS.pad.Pkcs7,
                iv: this.#iv,
                algorithm: CryptoJS.algo.AES,
                blockSize: this.#validAlgorithms.encrypt[this.#jwt.header.enc].length/32,
            }),
            this.#key
        );

        return WordArray2ArrayBuffer(tmp);
    }
}

module.exports = Session;
