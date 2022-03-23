var webSocket   = null;

function onConnectClick() {
   // get information from input fields
   var ws_hostname = document.getElementById("inputHostname").value;
   var ws_port     = document.getElementById("inputPort").value;
   var ws_endpoint = document.getElementById("inputEndpoint").value;

   // builds the array of "sub-protocol"
   var ws_secwebsocket = WebSocketProtocol(document.getElementById("inputSecWebsocket").value);
   var ws_protocol = document.getElementById("selectProtocol").value;

   var webSocketURL = ws_protocol + ws_hostname + ":" + ws_port + "/" + ws_endpoint;
   openWSConnection(ws_protocol, ws_hostname, ws_port, ws_endpoint, ws_secwebsocket);
   console.log(webSocketURL);
}
function onDisconnectClick() {
   webSocket.close();
   // document.getElementById("incomingMsgOutput").value = "";
   console.log(document.getElementById("alert_connection").className);
}

// add a spinner to the connect button and disable it
function onSpinner() {
   document.getElementById("btnConnectSpinner").classList.add("spinner-border");
   document.getElementById("btnConnectSpinner").classList.add("spinner-border-sm");
   document.getElementById("btnConnect").classList.add("disabled");
}

// remove the spinner to the connect button and enable it
function offSpinner() {
   document.getElementById("btnConnectSpinner").classList.remove("spinner-border");
   document.getElementById("btnConnectSpinner").classList.remove("spinner-border-sm");
   document.getElementById("btnConnect").classList.remove("disabled");
}

addEventListener('DOMContentLoaded', (event) => {
   // console.log('(1) The DOM is fully loaded.');
});

addEventListener('load', (event) => {
   // console.log('(3) The page is fully loaded.');
});

addEventListener('beforeunload', (event) => {
   // show the confirmation dialog
   event.preventDefault();
   // Google Chrome requires returnValue to be set.
   event.returnValue = '';
});

addEventListener('unload', (event) => {
   // send analytic data
});

/**
 * Open a new WebSocket connection using the given parameters
 */
function openWSConnection(protocol, hostname, port, endpoint, secWebSocketProtocol) {
   var webSocketURL = null;

   console.log('secWebSocketProtocol: ' + secWebSocketProtocol);
   // remove trailing '/' at the end of 'endpoint', if present
   endpoint = endpoint.replace(/^\/+|\/+$/g, '');

   webSocketURL = protocol + hostname + ":" + port + "/" + endpoint;
   console.log("openWSConnection::Connecting to: " + webSocketURL);
   onSpinner();
   try { 
      const encodedToken = 'ZGFuaWVsOnNlY3JldA==';
      const cookie = 'id=0123456789abcdef'
      const headers = {
         'Authorization': `Basic ${encodedToken}`,
         'Cookie': `${cookie}`
      };
      webSocket = new WebSocket(webSocketURL, secWebSocketProtocol, headers);

      // Change binary type from "blob" to "arraybuffer"
      webSocket.binaryType = "arraybuffer";

      webSocket.onopen = function(openEvent) {
         console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
         document.getElementById("alert_connection").classList.remove("alert-danger");
         document.getElementById("alert_connection").classList.add("alert-success");
         document.getElementById("alert_connection").innerHTML="Connected to: " + "<b>" + webSocketURL + "</b>";
         // document.getElementById("alert_connection").textContent="Connected to " + "<b>" + webSocketURL + "</b>";

         document.getElementById("btnDisconnect").classList.remove("disabled");
         document.getElementById("btnConnect").classList.add("disabled");
         document.getElementById("btnConnectSpinner").classList.remove("spinner-border");
         document.getElementById("btnConnectSpinner").classList.remove("spinner-border-sm");

      };
      webSocket.onclose = function (closeEvent) {
         console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
         document.getElementById("alert_connection").classList.remove("alert-success");
         document.getElementById("alert_connection").classList.add("alert-danger");
         document.getElementById("alert_connection").textContent="Disconnected...";

         document.getElementById("btnDisconnect").classList.add("disabled");
         document.getElementById("btnConnect").classList.remove("disabled");
      };
      webSocket.onerror = function (errorEvent) {
         console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
         var galleryModal = new bootstrap.Modal(document.getElementById('errorModal'))
         document.getElementById("errorModalBody").innerHTML="WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4);
         document.getElementById("errorModalHeader").innerHTML="WebSocket error!";
         galleryModal.show();
         offSpinner();
      };
      webSocket.onmessage = function (messageEvent) {
         let wsMsg = messageEvent.data;
         if(wsMsg instanceof ArrayBuffer) {
            // binary frame
            const view = new DataView(wsMsg);
            // 'view' can be empty???
            if (view) {
               console.log("Binary data of length: " + view.byteLength);
               let strByte = "";
               // print no more than 10 bytes
               for (let i = 0; i < view.byteLength && i < 10; i++) {
                  strByte += view.getUint8(i) + ", ";
               }
               strByte = strByte.slice(0, - 2); // remove the last ", " from the string
               document.getElementById("incomingMsgOutput").value += "BIN->Rx: " + strByte + "\r\n";   
            } else {
               console.log("WebSocket BINARY packet was empty!");
            }
         } else if (typeof wsMsg === 'string') {
            // text frame
            console.log(wsMsg);
            document.getElementById("incomingMsgOutput").value += "TXT->Rx: " + wsMsg + "\r\n";
         } else {
         console.log("WebSocket unknown packet type: " + typeof wsMsg);
         }
      };
   } catch (exception) {
      console.error("webSocket fatal console.error();: " + exception);
      var galleryModal = new bootstrap.Modal(document.getElementById('errorModal'))
      document.getElementById("errorModalBody").innerHTML=exception;
      document.getElementById("errorModalHeader").innerHTML="WebSocket fatal error!";
      galleryModal.show();
      offSpinner();
   }
}

/**
 * Send a message to the WebSocket server
 */
function onSendClick() {
   var galleryModal = new bootstrap.Modal(document.getElementById('errorModal'))
   if (webSocket == null) {
      console.error("webSocket not initialize. Can't send");
      document.getElementById("errorModalBody").innerHTML="wwebSocket not initialize. Can't send";
      document.getElementById("errorModalHeader").innerHTML="WebSocket warning";
      galleryModal.show();
      return;
   }
   if (webSocket.readyState != WebSocket.OPEN) {
        console.error("webSocket is not open: " + webSocket.readyState);
        document.getElementById("errorModalBody").innerHTML="webSocket is not open: " + webSocket.readyState;
        document.getElementById("errorModalHeader").innerHTML="WebSocket warning";
        galleryModal.show();
        return;
   }
   var msg = document.getElementById("inputMessage").value;
   webSocket.send(msg);
}

/**
 * Clear messages received from server
 */
function onClearMessage() {
   document.getElementById("incomingMsgOutput").value = "";
}
function validate(){
   console.log("validate() called");
}

function WebSocketProtocol(strProtocol) {
   // returns NULL if string is empty
   if (strProtocol === '') {
      return null;
   }
   // Split a string using space character
   let arr = strProtocol.split(' ');

   // builds the array of protocol from a "space" separated string
   console.log(arr); // ex.: ["soap", "xmpp", "wamp", "mqtt"]
   return arr;
}
