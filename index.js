const fs = require("node:fs");
const path = require("node:path");
const Session = require("./lib/session.js");


const libpath = path.resolve(__dirname, 'dist/ape.min.js');

module.exports = (function(){
    try{
        const express = require("express");

        /**
         * @callback express.Middleware
         * 
         * @param {express.Request} req 
         * @param {express.Response} res 
         * @param {express.NextFunction} next 
         * @returns {void} 
         */

        /**
         * @callback getSecretCallback
         * 
         * @param {Buffer} id
         * @returns {Buffer} 
         */

        /**
         * 
         * @param {getSecretCallback} callback 
         * @returns {express.Middleware} 
         */
        var tmp = function(callback){
            if(typeof callback != "function"){
                throw new Error("callback is not of type function!");
            }

            /** @type {express.Middleware} */
            return function(req, res, next){
                // Validate session
                /** @type {Session} */
                var session = null;
                try{
                    session = new Session(req.headers.authorization);
                }catch(err){
                    next(err);
                }

                try{
                    if(!session.verify(callback(req.session.clientId))){
                        next(new Session.FailedVerification());
                    }
                }catch(err){
                    next(new Session.FailedVerification());
                }

                // Decode body
                if(req.body != null){
                    var echunks = res.split(".");
                    var dchunks = [];

                    for(var i=0; i<echunks.length; i++){
                        dchunks.push(session.decode(echunks[i]));
                    }

                    req.body = (typeof window != "undefined")? Uint8Array.concat(dchunks) : Buffer.concat(dchunks);
                }

                // Extend ExpressJS
                req.session = session;
                /**
                 * 
                 * @param {string|Buffer|object} data 
                 * @returns {express.Response} 
                 */
                res.ape.send = function(data){
                    if(Buffer.isBuffer(data) || typeof data == "string"){
                        return res.send(res.req.session.encode(data))
                    }else if(typeof data == "object"){
                        return res.set("Content-Type", "application/json").send(res.req.session.encode(JSON.stringify(data)));
                    }else{
                        throw new TypeError("unsupported data type");
                    }
                }

                /**
                 * 
                 * @param {object} data 
                 * @returns {express.Response} 
                 */
                res.ape.json = function(data){
                    if(typeof data == "object"){
                        res.ape.send(data).end();
                    }else{
                        throw new TypeError("unsupported data type");
                    }
                }

                // Call next middleware without errors
                next();
            }
        }

        /** @type {express.Middleware} */
        tmp.libroute = function(req, res, next){
            if(req.path.endsWith("/ape.min.js")){
                res.sendFile(libpath);
            }
            next();
        };
        
        return tmp;
    }catch(err){
        return {};
    }
})();

module.exports.libpath = libpath;
module.exports.Session = Session;
module.exports.request = require("./lib/request.js")(require("./lib/request/node.js"));
