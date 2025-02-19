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

