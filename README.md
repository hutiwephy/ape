# Authenticated Payload Exchange
Authenticate and Encrypt HTTP with User Credentials (Not TLS-SRP).

This project aims to solve one of the biggest problems with decentralized apps regarding authentication and encrypted data exchange without using certificates.

> Note: TLS-SRP is not widely implemented that's why this library exists.

## Contents
  - [How does it work?](#how-does-it-work)
    - [Generating a key](#generating-a-key)
    - [Building the token](#building-the-token)
    - [Request](#request)
    - [Response](#response)
  - [Documentation](#documentation)

## How does it work?
This data exchange method requires the client and the server to know an identifier and a secret.
the secret can be randomly generated or a user password if it is the later then the usage of a salt is required as the key must be of a specified size required by the encryption function.

A key must be derived from the client secret by joining the current date, and using PBKDF2 with a salt of the length required by the encryption function.

When performing a request the Authorization header will be filled with a JWT containing the issuing date the client_id encoded in base64url, the salt in base64url, the signing algorithm and encryption function along side the require parameters (ie: initialization vector aka. iv) the JWT will be signed with the previously generated key.
If the body is provided this should be encrypted with the provided function and encoded in base64url chunks each chunk must end with a dot (`.`).

> Note: The hashing function and other key parameters used in the user password case must be known by both parties.


### Generating a key
In order to build a key some parameters are required.
  - `secret`: This is the client secret it can be a password or a random array of bytes.
  - `date`: The current date in milliseconds counting from 1 Jan 1970 represented in utf8 characters (0-9).
  - `salt`: The salt to be used to derive the key this must be the correct size to be used with the encryption function.
  - `length`: Length of the key required by the encryption function

After this requirements are fullfiled a key can be build by concatenating the secret and date and using PBKDF2 to derive the key to the length required by the encryption function.

```
key = PBKDF2(secret+date, salt, length);
```

### Building the token
The JWT that will be used in the Authorization header will have the following parameters set in the header section:
  - `alg`: The JWT signing algorithm, can only be:
    - HS256
    - HS384
    - HS512
  - `enc`: The encryption algorithm, can only be: (* is the size `128`, `192`, `256`)
    - AES-*-CBC
    - AES-*-CFB
    - AES-*-CTR
    - AES-*-ECB
  - `iv`: the initialization vector must be 16 bytes and always provided.

while on the payload section the following are required:
  - `sub`: base64url encoded client id
  - `salt`: base64url encoded `salt` used to derive the key
  - `iat`: date used to create the key in ms formated as number type

After populating these fields the JWT must be assembled and signed with the previously generated key.
> Note: the JWT can contain more paramters
        the AES padding is always `Pkcs7`

### Request
The HTTP request must contain the previously generated token in the Authorization Header.
when a body is present it can be separated into chunks of variable size, each chunk will be encrypted and encoded into base64url all chunks must end with a dot `.`.

### Response
The HTTP Response will must not echo back the Authorization header and the body formating will follow the same as the Request's body, it can be separated into chunks of variable size, each chunk will be encrypted and encoded into base64url all chunks must end with a dot `.`.

## Documentation
This repository also contains a NodeJS module and browser library that attempts to provide support to the spec above.

```js
const ape = require("@hutiwephy/ape");
```

```html
<script src="/ape.min.js"></script>
```

### APE core

#### ape.request
Performs an asynchronous request with ape functionality

#### ape.libpath (NodeJS only)
Path to the Browser JS library

### ape.Session
This class bundles all the required methods for verification and Encryption

```js
// a Session can be built from a JSON Web Token string
var session = new ape.Session(token);

// or a client id and a client secret
var session = new ape.Session(id, secret);

// however when provided with a string this must be in base64 format
var session = new ape.Session(btoa(id), btoa(secret));

// you can also overide or extend the JWT by passing extra options
var session = new ape.Session(btoa(id), btoa(secret), {
    header: {},
    payload: {},
});
```

#### session.jwt
Returns the parsed JWT

#### session.clientId
Returns the Client Id in either `Buffer` or `Uint8Array` format.

#### session.token
Returns a string version of the JWT if the key is present

#### session.verify
Returns true or false depending on whether the verification succeeded or failed

this must be called before the `session.encode` or `session.decode` functions, when the client secret was not provided to the constructor.

#### session.encode
Encrypts and encodes a chunk

#### session.decode
Decrypts and decodes a chunk

### ExpressJS integration (NodeJS only)
example: 
```js
const express = require("express");
const ape = require("ape");
const bodyparser = require("body-parser");


var app = express();
var api = express.Router();

api.use(ape((id)=>{
    return // client secret
}));
api.use((err, req, res, next)=>{
    // Handle and tranform ape errors
});
api.use(bodyparser.json());

api.get("/some/path", (req, res, next)=>{
    res.ape.json({
        ok: true,
    });
});

api.get("/some/other/path", (req, res, next)=>{
    res.ape.send("token: ").ape.send(req.session.token);
});


app.use("/api", api);
app.get(ape.libroute);
app.get("/", (req, res, next)=>{
    res.sendFile("./wwww/index.html");
});
```

#### ape()
APE Middleware

#### express.Response.ape.send()
Send a chunk encrypted with the request key

#### express.Response.ape.json()
Send a object as a chunk encrypted with the request key

#### express.Request.ape.session
`ape.Session` instance decoded and signed by the APE Middleware

### Browser Extensions
This library extends some functionality on the Browser

#### window.CryptoJS
The [CryptoJS](https://www.npmjs.com/package/crypto-js) library is fully exposed for personal usage

#### window.hash
Wrapper function around multiple CryptoJS hashing functions

#### window.request()
Promise based HTTP Request function used by `ape.request()`

#### Uint8Array.concat()
NodeJS Buffer like concatenation function

#### Uint8Array.prototype.toString()
NodeJS Buffer like toString function with encoding

#### window.WordArray2ArrayBuffer()
Convert CryptoJS WordArray to a Uint8Array
