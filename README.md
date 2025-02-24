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
    - [ape](#ape-core)
      - [request()](#ape_request)
      - [response](#ape_response)
      - [libpath](#ape_libpath)
      - [Session()](#ape_session)
        - [jwt](#ape_session_jwt)
        - [clientId](#ape_session_clientid)
        - [token](#ape_session_token)
        - [verify()](#ape_session_verify)
        - [encode()](#ape_session_encode)
        - [decode()](#ape_session_decode)
        - [parse()](#ape_session_parse)
    - [CryptoJS](#cryptojs)
    - [hash()](#hash)
    - [WordArray2ArrayBuffer()](#wordarray2arraybuffer)
    - [request()](#resquest)
    - [Uint8Array](#uint8array_concat)
      - [concat()](#uint8array_concat)
      - [toString()](#uint8array_tostring)
    - [jwt](#json-web-tokens)
      - [RegisteredClaims](#jwt_registeredclaims)
      - [validationOptions](#jwt_validationoptions)

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

## APE core

### <span id="ape_request"></span> `ape.request(method, url, client_id, client_secret, headers, body)`
Performs an asynchronous request with ape functionality

**Parameters**:
  - **`method`**: `string` <br>
    Method to be used

    **values**:
      - `GET`
      - `POST`
      - `PUT`
      - `DELETE`

  - **`url`**: `string`, `URL` <br>
    URL to perform request.

  - **`client_id`**: `string`, `ArrayBufferLike` <br>
    Client id.
    If string then it must be encoded in Base64.

  - **`client_secret`**: `string`, `ArrayBufferLike` <br>
    Client secret.
    If string then it must be encoded in Base64.

  - **`headers`** (optional): `null`, `OutgoingHttpHeaders` <br>
    Headers to be provided.
  
  - **`body`** (optional): `null`, `string` <br>
    Body to be sent.


**Returns**:
  - `Promise` <br>
    Server Response

    **onfullfilled**: [`ape.Response`](#ape_response) <br>
    **onferror**: `Error`, `TypeError` <br>



### <span id="ape_response"></span> `ape.Response`
Object containing a raw and parse attempt of the response body

```js
{
    raw: string|Buffer,
    decoded: Uint8Array|Buffer,
}
```


### <span id="ape_libpath"></span> `ape.libpath` (NodeJS only)
Path to the Browser JS library



## <span id="ape_session"></span> `ape.Session`
This class bundles all the required methods for verification and Encryption

```js
// A Session can be built from a JSON Web Token string
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

### <span id="ape_session_jwt"></span> `session.jwt`
Returns the parsed JWT



### <span id="ape_session_clientid"></span> `session.clientId`
Returns the Client Id in either `Buffer` or `Uint8Array` format.



### <span id="ape_session_token"></span> `session.token`
Returns the `string` used in the Authorization header, if the key is present.



### <span id="ape_session_verify"></span> `session.verify(secret, options)`
Returns true or false depending on whether the verification succeeded or failed

This method must be called before the `session.encode` or `session.decode` functions, when the client secret was not provided to the constructor.

> Note: 
>  - This method also throws errors it is recommended to catch and handle them
>  - This Method only accepts Base64 encoded strings as secrets

**Parameters**:
  - **`secret`**: `null`, `string`, `ArrayBufferLike` <br>
    Client secret.
    If string then it must be encoded in Base64.

  - **`options`**: [`jwt.validationOptions`](#jwt_validationoptions) <br>
    Additional JWT validation options.
    `validators.subject` will be ignored.
    `tolerance` must be set to perform `iat` (Issued At) validation.


**Returns**:
  - `boolean` <br>
    


### <span id="ape_session_encode"></span> `session.encode(chunk)`
If key is populated it will encode a chunk of data into a body chunk

**Parameters**:
  - **`chunk`**: `string`, `ArrayBufferLike` <br>
    UTF-8 string or Array of Bytes to encode


**Returns**:
  - `string` <br>
    Body chunk string



### <span id="ape_session_decode"></span> `session.decode(chunk)`
If key is populated it will decode a body chunk into a chunk of data

**Parameters**:
  - **`chunk`**: `string` <br>
    UTF-8 string to decode


**Returns**:
  - `Buffer`, `Uint8Array` <br>
    Raw decoded bytes



### <span id="ape_session_parse"></span> `session.parse(body)`
Parse a Request or Response body

**Parameters**:
  - **`body`**: `string` <br>
    UTF-8 string to decode


**Returns**:
  - `Buffer`, `Uint8Array` <br>
    Raw decoded bytes



## Browser Extensions
This library extends some functionality on the Browser

### <span id="cryptojs"></span> `window.CryptoJS`
The [CryptoJS](https://www.npmjs.com/package/crypto-js) library is fully exposed for personal usage

### <span id="hash"></span> `window.hash(algorithm, message)`
Wrapper function around multiple CryptoJS hashing functions

**Parameters**:
  - **`algorithm`**: `string` <br>
    Algorithm to use

    **values**:
      - `MD5`
      - `RIPEMD160`
      - `SHA1`
      - `SHA224`
      - `SHA256`
      - `SHA384`
      - `SHA512`
  
  - **`message`**: `string`, `ArrayBufferLike` <br>
    Message to encode.
    Can be a UTF-8 string or an Array of bytes.


**Returns**:
  - `Buffer`, `Uint8Array` <br>
    Resulting Bytes



### <span id="wordarray2arraybuffer"></span> `window.WordArray2ArrayBuffer(wa)`
Convert CryptoJS WordArray to a Uint8Array

**Parameters**:
  - **`wa`**: `CryptoJS.lib.WordArray` <br>
    WordArray to convert


**Returns**:
  - `Uint8Array` <br>
    Resulting Bytes



### <span id="request"></span> `window.request(method, url, headers, body)`
Promise based HTTP Request function used by `ape.request()`

**Parameters**:
  - **`method`**: `string` <br>
    Method to be used

    **values**:
      - `GET`
      - `POST`
      - `PUT`
      - `DELETE`

  - **`url`**: `string`, `URL` <br>
    URL to perform request.

  - **`headers`** (optional): `null`, `OutgoingHttpHeaders` <br>
    Headers to be provided.
  
  - **`body`** (optional): `null`, `string` <br>
    Body to be sent.


**Returns**:
  - `Promise` <br>
    Server Response

    **onfullfilled**: `string`, `Buffer` <br>
    **onferror**: `Error`, `TypeError` <br>



### <span id="uint8array_concat"></span> `Uint8Array.concat()`
NodeJS Buffer like concatenation function.

**Parameters**:
  (Takes any iterable)


**Returns**:
  - `Uint8Array` <br>
    Resulting Bytes.


### <span id="uint8array_tostring"></span> `Uint8Array.prototype.toString(encoding)`
NodeJS Buffer like toString function with encoding.
Defaults to `utf8`

**Parameters**:
  - **`encoding`**: `string` <br>
    Target encoding

    **values**:
      - `utf8`
      - `base64`
      - `base64url`
      - `hex`


**Returns**:
  - `string` <br>
    Resulting string.



## JSON Web Tokens

### <span id="jwt_registeredclaims"></span> `jwt.RegisteredClaims`
Enum of all JWT Registered claims

```js
const RegisteredClaims = {
    ISSUER: "iss",
    SUBJECT: "sub",
    AUDIENCE: "aud",
    EXPIRATION: "exp",
    NOTBEFORE: "nbf",
    ISSUEDAT: "iat",
    JWTID: "jti"
};
```

### <span id="jwt_validationoptions"></span> `jwt.validationOptions`
Object containing data relevant for the validation of a JSON Web Token

```js
{
    critical?:     Array.<string>, // values can be any of jwt.RegisteredClaims
    date?:         number,
    maxlifetime?:  number,
    tolerance?:    number, // Must be set to perform iat, exp and nbf validation
    validators?: {
        issuer?:   Array.<string> | function(string):boolean,
        audience?: Array.<string> | function(string):boolean,
        jwtid?:    Array.<string> | function(string):boolean,
    },
}
```
