const CryptoJS = require("crypto-js");

const jwt = (function(){
    // Cryptography Compatibility Layer (CryptoJS required!!!)
    const c = (function(){
        function sign(algorithm, data, key){
            if(algorithm.startsWith("H")){ // HS256, HS384, HS512 => HMAC-SHA*
                var alg_hash = `HmacSHA${algorithm.split("S")[1]}`;
                return CryptoJS[alg_hash](data, key);
            }else{
                throw "Unsupported algorithm sanity is to low";
            }
        }
        function verify(algorithm, data, key, signature){
            if(algorithm.startsWith("H")){ // HMAC-SHA*
                var tmp = sign(algorithm, data, key);
                return (CryptoJS.enc.Base64.stringify(tmp) === CryptoJS.enc.Base64.stringify(signature))? true : false;
            }else{
                throw "Unsupported algorithm sanity is to low";
            }
        }

        return {
            sign,
            verify,
        };
    })();

    const RegisteredClaims = {
        ISSUER: "iss",
        SUBJECT: "sub",
        AUDIENCE: "aud",
        EXPIRATION: "exp",
        NOTBEFORE: "nbf",
        ISSUEDAT: "iat",
        JWTID: "jti"
    };

    /**
     * Decode a JWT, but do not verify it's validity 
     * 
     * @param {string} token 
     * @returns {({
     *  header: {
     *      alg: string,
     *      typ: string,
     *      cty?: string, 
     *  },
     *  payload: Uint8Array|Buffer|{
     *      iss?: string,
     *      sub?: string,
     *      aud?: string,
     *      exp?: string,
     *      nbf?: string,
     *      iat?: string,
     *      jti?: string,
     *  },
     *  content: string,
     *  signature?: Uint8Array|Buffer,
     * })}
     */
    function decode(token){
        if(typeof token != "string"){
            throw new TypeError("Invalid Data Type");
        }
        
        var parts = token.split(".");
        if(parts.length < 2 || parts.length > 3){
            throw new Error("Not a JWT");
        }

        var tmp = {
            header: null,
            payload: null,
            content: CryptoJS.enc.Utf8.parse(`${parts[0]}.${parts[1]}`),
        };

        function Base64Url2object(str){
            return JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(str)));
        }

        try{
            tmp.header = Base64Url2object(parts[0]);
        }catch(exp){
            throw new Error("Invalid Header format");
        }

        try{
            tmp.payload = Base64Url2object(parts[1]);
        }catch(exp){
            throw new Error("Invalid Payload format");
        }

        if(parts.length == 3){
            if(tmp.header.alg == "none"){
                throw new Error("Algorithm not provided but signature section present");
            }
            tmp.signature = CryptoJS.enc.Base64url.parse(parts[2]);
        }

        return tmp;
    }


    function validatorTester(title, validator, data){
        if(typeof validator == "function"){
            if(!validator(data)){
                throw new Error(`Invalid ${title}`);
            }
        }else{
            if(typeof validator.includes == "function"){
                if(!validator.includes(data)){
                    throw new Error(`Invalid ${title}`);
                }else{
                    throw new TypeError(`Invalid ${title} Validator Type`);
                }
            }
        }
    }
    function validateFields(result, options={}){
        var payload = result.payload;
        var entries = Object.keys(payload);
        var keys = Object.keys(options);
        var validators = (options.validators == undefined)? [] : Object.keys(options.validators);

        if(keys.includes("critical")){
            if(!Array.isArray(options.critical)){
                throw new TypeError(`Invalid "critical" Type expected Array.<string> got ${typeof options.critical}`);
            }

            // Negative check if all the values in options.critical are in payload
            if(!options.critical.every(function(value){ return payload.includes(value); })){
                throw new Error("Invalid Token not all required paramters are present");
            }
        }

        if(keys.includes("validators")){
            if(entries.includes(RegisteredClaims.ISSUER) && validators.includes("issuer")){
                validatorTester("Issuer", options.validators.issuer, payload[RegisteredClaims.ISSUER]);
            }
            if(entries.includes(RegisteredClaims.SUBJECT) && validators.includes("subject")){
                validatorTester("Subject", options.validators.subject, payload[RegisteredClaims.SUBJECT]);
            }
            if(entries.includes(RegisteredClaims.AUDIENCE) && validators.includes("audience")){
                validatorTester("Audience", options.validators.audience, payload[RegisteredClaims.AUDIENCE]);
            }
            if(entries.includes(RegisteredClaims.JWTID) && validators.includes("jwtid")){
                validatorTester("JWT ID", options.validators.jwtid, payload[RegisteredClaims.JWTID]);
            }
        }

        var date = Date.now();
        var tolerance = 0;
        if(keys.includes("date")){
            if(typeof options.date != "number"){
                throw new TypeError(`Invalid "date" Type expected number got ${typeof options.date}`);
            }
            date = options.date;
        }
        if(keys.includes("tolerance")){
            if(typeof options.tolerance != "number"){
                throw new TypeError(`Invalid "tolerance" Type expected number got ${typeof options.tolerance}`);
            }
            tolerance = options.tolerance;
        }
        if(keys.includes("maxlifetime")){
            if(typeof options.maxlifetime != "number"){
                throw new TypeError(`Invalid "maxlifetime" Type expected number got ${typeof options.maxlifetime}`);
            }
            var maxlifetime = options.maxlifetime;

            // Verify exp-iat
            if(entries.includes(RegisteredClaims.EXPIRATION) && entries.includes(RegisteredClaims.ISSUEDAT)){
                if(payload[RegisteredClaims.EXPIRATION] - payload[RegisteredClaims.ISSUEDAT] >= maxlifetime+tolerance){
                    throw new Error(`Invalid Token violates maximum lifetime constrain`);
                }
            }
        }
        // Verify exp
        if(entries.includes(RegisteredClaims.EXPIRATION)){
            if(payload[RegisteredClaims.EXPIRATION] >= date+tolerance){
                throw new Error(`Invalid Token violates expiration constrain`);
            }
        }
        // Verify nbf
        if(entries.includes(RegisteredClaims.NOTBEFORE)){
            if(payload[RegisteredClaims.NOTBEFORE] <= date-tolerance){
                throw new Error(`Invalid Token violates not before constrain`);
            }
        }
        // Verify iat
        if(entries.includes(RegisteredClaims.ISSUEDAT)){
            if(payload[RegisteredClaims.ISSUEDAT] <= date-tolerance){
                throw new Error(`Invalid Token violates issue date constrain`);
            }
        }
        
        return true;
    }

    function validate(token, options){
        var tmp = decode(token);
        validateFields(tmp, options);
        return tmp;
    }

    
    function encode(header, payload){
        if(typeof header != "object"){
            throw new TypeError("Invalid header type expected object");
        }
        if(typeof payload != "object"){
            throw new TypeError("Invalid payload type expected object");
        }

        if(typeof header.alg == "undefined"){
            throw new Error("Algorithm not provided");
        }

        function object2Base64Url(obj){
            return CryptoJS.enc.Base64url.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(obj)));
        }

        return `${object2Base64Url(header)}.${object2Base64Url(payload)}`;
    }

    return {
        RegisteredClaims,
        /**
         * Decode a JWT, but do not verify it's validity 
         * 
         * @param {string} token 
         * @returns {({
         *  header: {
         *      alg: string,
         *      typ: string,
         *      cty?: string, 
         *  },
         *  payload: Uint8Array|Buffer|{
         *      iss?: string,
         *      sub?: string,
         *      aud?: string,
         *      exp?: string,
         *      nbf?: string,
         *      iat?: string,
         *      jti?: string,
         *  },
         *  content: string,
         *  signature?: Uint8Array|Buffer,
         * })}
         */
        decode,
        /**
         * Creates a JWT from an header and payload object and signs it with a key
         * 
         * @param {object} header 
         * @param {object} payload 
         * @param {object|string} key 
         * @returns {string} JWT string
         */
        sign: function(header, payload, key){
            var tmp = encode(header, payload);
            if(header.alg == "none"){ return tmp; }
            tmp += `.${CryptoJS.enc.Base64url.stringify(c.sign(header.alg, CryptoJS.enc.Utf8.parse(tmp), key))}`;
            return tmp;
        },
        /**
         * Validates a JWT
         * 
         * @param {string} token 
         * @param {Buffer} key 
         * @param {({
         *  critical?: Array.<string>,
         *  date?: number,
         *  maxlifetime?: number,
         *  tolerance?: number,
         *  validators?: {
         *      issuer?: Array.<string>|function(string):boolean,
         *      subject?: Array.<string>|function(string):boolean,
         *      audience?: Array.<string>|function(string):boolean,
         *      jwtid?: Array.<string>|function(string):boolean,
         *  },
         * })} options 
         * @returns {boolean}
        */
        verify: function(token, key, options={}){
            var tmp = validate(token, options);
            if(tmp.header.alg == "none"){ return true; }
            return c.verify(tmp.header.alg, tmp.content, key, tmp.signature);
        },
    };
})();

module.exports = jwt;
