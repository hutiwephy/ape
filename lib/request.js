const Session = require("./session.js");

module.exports = function(request){
    /**
     * Performs an APE Request
     * 
     * @param {'GET'|'POST'|'PUT'|'DELETE'} method 
     * @param {string|URL} url 
     * @param {string|ArrayBufferLike} client_id 
     * @param {string|ArrayBufferLike} client_secret 
     * @param {null|string|ArrayBufferLike} body 
     * @returns {Promise<(string|Buffer),(Error|TypeError)>}
     */
    return function(method, url, client_id, client_secret, body=null){
        return new Promise((resolve, reject)=>{
            var session = new Session(client_id, client_secret);

            body = (body != null)? session.encode(body) : null;

            request(method, url, {"Authorization": session.token}, body).then((res)=>{
                var echunks = res.split(".");
                var dchunks = [];

                for(var i=0; i<echunks.length; i++){
                    dchunks.push(session.decode(echunks[i]));
                }

                resolve({
                    raw: res, 
                    decoded: (typeof window != "undefined")? Uint8Array.concat(dchunks) : Buffer.concat(dchunks)
                });
            }).catch(reject);
        });
    };
}
