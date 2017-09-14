import React from 'react'
import _ from 'lodash'

import { getDB } from './configure'
import { addCell, isEmpty, addTrash } from '../notebook'

import * as State from '../state'
import * as U from '../state/update'

import { UnmountClosed } from 'react-collapse';

const RETRY_INTERVAL = 1000;
const BRIDGE_URL = 'ws://localhost:14645';

let clientConnectorSocket = null;
let checkConnectorInterval;

var replyQueue = []
var rejectQueue = []
var connectQueue = []
var messageCounter = 0;
var bridgeAlive = true;

function tryOpenBridge(){
    try {
        clientConnectorSocket = new WebSocket(BRIDGE_URL);
    } catch (err) {
        State.apply('connect', 'bridge_status', U.replace('mixed_fail'))
    }
    
    if(!clientConnectorSocket) return;

    clientConnectorSocket.onopen = e => {
        // console.log('socket opened')
        if(getDB().requires_bridge){
            State.apply('connect', 'bridge_status', U.replace('connected'))
            getDB().bridgeConnected(clientConnectorSocket)

            while(connectQueue.length > 0){
                let callback = connectQueue.shift();
                try { callback() } catch (err) { console.error(err) }
            }
        }
    }

    clientConnectorSocket.onmessage = e => {
        // console.log('got message', e.data)
        const data = JSON.parse(e.data)
        if(data.error){
            if(data.id in rejectQueue){
                rejectQueue[data.id](new Error(data.error))
            }else{
                console.error(new Error(data.error))
            }
        }else{
            if(data.id in replyQueue){
                replyQueue[data.id](data)        
            }else{
                console.log('Missing response handler: ', data)
            }
            
        }
    }

    clientConnectorSocket.onclose = e => {
        rejectQueue = []
        replyQueue = []
        messageCounter = 0;

        // console.log('socket closed')
        if(getDB().requires_bridge){
            if(State.get('connect', 'bridge_status') != 'disconnected'){
                State.apply('connect', 'bridge_status', U.replace('disconnected'))    
            }
            
            getDB().bridgeDisconnected(clientConnectorSocket)
            setTimeout(() => {
                if(getDB().requires_bridge && bridgeAlive){
                    tryOpenBridge()
                }else{
                    clientConnectorSocket = null;
                }
            }, RETRY_INTERVAL)
        }
    }
}

export function disconnectBridge(){
    if(clientConnectorSocket){
        clientConnectorSocket.close()
    }
}

export function FranchiseClientConnector({ connect }){
    if(connect.bridge_status == 'mixed_fail'){
        return <p><div className='pt-callout pt-intent-danger'>
            <h5>Browser Compatibility</h5>
            <p>
                The Franchise web interface connects to a local bridge application to mediate connections to external databases. 
            </p>
            <p>
                <b>Unfortunately</b>, your browser does not support connections between secure HTTPS websites and desktop applications. 
            </p>
            <p>
                We're actively looking into workarounds, but in the mean time, try using <b>Google Chrome</b>.
            </p>
        </div></p>
    }

    return <UnmountClosed isOpened={connect.bridge_status !== 'connected' && !isElectron()}>
        <div className='pt-callout pt-intent-warning'>
            <h5>Connect the Database Bridge</h5>

            <div>Run <code>npx franchise-client@0.2.2</code> in your terminal to start the franchise database bridge. 
            </div>
            <div>
            If the npx command is not found, <a href="https://nodejs.org/en/download/">install the latest version of node</a> and try again.
            </div>
            
            <div>These instructions will automatically collapse as soon as the bridge is detected.</div>
        </div>
    </UnmountClosed>
}

export async function sendRequest(packet){
    if(isElectron()){
        return await runElectronQueryCore(packet)
    }else{
        await blockUntilBridgeSocketReady()
        return await sendRequestSocketCore(packet)
    }
}

function sendRequestSocketCore(packet){
    return new Promise((resolve, reject) => {
        packet.id = ++messageCounter;
        replyQueue[packet.id] = resolve
        rejectQueue[packet.id] = reject;
        clientConnectorSocket.send(JSON.stringify(packet))
    })
}

async function blockUntilBridgeSocketReady(){
    let isBridgeReady = clientConnectorSocket && clientConnectorSocket.readyState === 1;
    if(!isBridgeReady){
        // TODO: have some sort of timeout
        await new Promise((accept, reject) => connectQueue.push(accept))
    }
}

function isElectron() {
    return (typeof window !== 'undefined' && window.process && window.process.type === 'renderer')
        || (typeof process !== 'undefined' && process.versions && !!process.versions.electron)
}






// stuff that runs


if(isElectron()){
    var runElectronQueryCore = window.require('franchise-client');
    setTimeout(function(){
        State.apply('connect', 'bridge_status', U.replace('connected'))
    }, 100)
}else{
    checkConnectorInterval = setInterval(function(){
        if(!clientConnectorSocket && getDB().requires_bridge){
            tryOpenBridge()
        }
    }, 100)
}


if(module.hot){
    module.hot.dispose(function(){
        bridgeAlive = false;
        clearInterval(checkConnectorInterval);
        disconnectBridge()
    })
}
