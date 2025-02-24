const Session = require("./session.js");

module.exports = function(request){
    /**
     * @typedef ape.Response
     * 
     * @property {string|Buffer} raw
     * @property {Uint8Array|Buffer} decoded
     */
    /**
     * Performs an APE Request
     * 
     * @param {'GET'|'POST'|'PUT'|'DELETE'} method 
     * @param {string|URL} url 
     * @param {string|ArrayBufferLike} client_id 
     * @param {string|ArrayBufferLike} client_secret 
     * @param {null|string|ArrayBufferLike} body 
     * @returns {Promise<(ape.Response),(Error|TypeError)>}
     */
    return function(method, url, client_id, client_secret, headers={}, body=null){
        return new Promise((resolve, reject)=>{
            var session = new Session(client_id, client_secret);

            body = (body != null)? session.encode(body) : null;

            if(typeof headers != "object"){
                headers = {};
            }
            headers["Authorization"] = session.token;

            request(method, url, headers, body).then((res)=>{
                var tmp = "";
                if(typeof res != "string"){
                    tmp = res.toString("utf8");
                }else{
                    tmp = res;
                }

                resolve({
                    raw: res, 
                    decoded: session.parse(tmp),
                });
            }).catch(reject);
        });
    };
};
