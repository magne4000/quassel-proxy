# quassel-proxy

A proxy between Javascript websocket client (browser) and quasselcore

## How to use
_Work in progress_
### On the server
Install the module with: `npm install quassel-proxy`

and run the following command: `node lib/quassel-proxy.js --port 64004`

The proxy is now running.

:warning: In order to have a fully working test version, your node version should be at least v0.11.13

### In the browser
#### Demo
With the proxy running, open testclient.html in your favorite browser.
Fill in the inputs :
* Websocket host is the ip/name of the server your proxy is running on
* Websocket port is the port specified when the proxy was launched (here 64004)
* The 4 next inputs are informations about your quasselcore

When hitting _Connect_ button, you should start seeing some responses from the quassel server.

## Technical details
The proxy server acts like a basic libquassel client.

By default, events are not streamed to the browser. To do so, the client must register the events it wants:
```javascript
socket.emit('register', ['buffer.highlight', 'login', 'backlog', 'change']);
```

To be able to use client side libquassel as if we were using it directly on the server, we must sync the whole NetworkCollection tree Object between the server and the client.
It can be a little long to fetch the tree the first time, but when modifications are made server side thereafter, only patches are sent to the client (thanks to Object.Observe method).

For more details, see _init.js_ file.

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## License
Copyright (c) 2014 Joël Charles  
Licensed under the MIT license.
