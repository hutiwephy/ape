// NodeJS
/**
 * Performs an HTTP Request
 * 
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method 
 * @param {string|URL} url 
 * @param {null|OutgoingHttpHeaders} headers 
 * @param {null|string} body 
 * @returns {Promise<(string|Buffer),(Error|TypeError)>}
 */
function request(method, url, headers={}, body=null){
    return new Promise((resolve, reject)=>{
        const http = require("node:http");

        var data = null;
        var req = http.request(url, {
            method: method,
            headers: headers,
        }, (res)=>{
            res.on("error", reject);

            res.on("data", (chunk)=>{
                if(Buffer.isBuffer(chunk)){
                    if(data === null){ data = Buffer.alloc(0); }

                    data = Buffer.concat([data, chunk]);
                }else if(typeof data == "string"){
                    if(data === null){ data = ""; }

                    data += chunk;
                }else{
                    reject(new TypeError("Unhandled response type"));
                }
            });

            res.on("end", ()=>{
                resolve(data);
            });
        });

        req.on("error", reject);
        
        if(body != null){
            req.write(body);
        }
        req.end();
    });
}

module.exports = request;
