const path = require("node:path");
const Session = require("./lib/session.js");
const jwt = require("./lib/jwt.js");


const libpath = path.resolve(__dirname, 'dist/ape.min.js');

module.exports = {
    jwt: {
        RegisteredClaims: jwt.RegisteredClaims,
    },
    libpath,
    Session,
    request: require("./lib/request.js")(require("./lib/request/node.js")),
};
