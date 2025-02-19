// Browser
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
        var req = new XMLHttpRequest();
        req.addEventListener("readystatechange", (event)=>{
            if(req.readyState == 4){
                resolve(req.response);
            }
        });
        req.open(method, url);
        if(headers != null){
            var hnames = Object.keys(headers);
            for(var i=0; i<hnames.length; i++){
                req.setRequestHeader(hnames[i], headers[hnames[i]]);
            }
        }
        req.send(body);
    });
}

module.exports = request;
