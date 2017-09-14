import * as State from './index'
import Toaster from '../util/toaster'
import { Intent } from '@blueprintjs/core'
import _ from 'lodash'
import { getDB } from '../db/configure'

function restoreDefault(){
    // var credentials = {};
    // try {
    //     credentials = JSON.parse(localStorage.credentials);
    // } catch (err) {}
    const DEFAULT_STATE = {
        config: {
            open: false,
            // credentials: credentials
        },
        connect: {
            active: localStorage.activeConnector || 'sqlite',
            status: 'unconfigured',
        },
        trash: {
            open: false,
            cells: []
        },
        deltas: {
            open: false,
            changes: []
        },
        notebook: {
            layout: []
        }
    }

    State.set(DEFAULT_STATE)
}


window.addEventListener("message", e => {
    if(e.data && e.data.action === 'franchise-import'){
        try {
            console.log('restoring from postmessage')
        } catch (err) { console.error(err) }
    }
}, false);

export function importData(dump){
    if(dump.version != 2) throw new Error('Incompatible format version');
    State.set(dump.state);
    if(dump.autoconnect){
        let db = getDB();
        // console.log(db)
        if(db.connectDB){
            db.connectDB(dump.databaseDump)
        }else{
            console.warn('Active database connector does not export connectDB method.')
        }
    }
}

if(State.get()){
    // we already got data woot woot
}else if(sessionStorage.importData){
    try {
        var data = JSON.parse(sessionStorage.importData);
        delete sessionStorage.importData;
    } catch (err) { console.error(err) }
    importData(data)
}else if(sessionStorage.autosave){
    try {
        var data = JSON.parse(sessionStorage.autosave)
    } catch (err) { console.error(err) }
    Toaster.show({
        message: 'Restored from most recent autosave.',
        intent: Intent.SUCCESS,
        action: {
            onClick: () => restoreDefault(),
            text: "Clear Notebook"
        }
    })
    importData(data)
}else if(localStorage.autosave){
    try {
        var data = JSON.parse(localStorage.autosave)
    } catch (err) { console.error(err) }
    if(data){
        Toaster.show({
            message: 'Restore from the most recent autosave?',
            intent: Intent.SUCCESS,
            action: {
                onClick: () => importData(data),
                text: "Restore"
            }
        })    
    }
    restoreDefault()
}else{
    restoreDefault()
}



// if(sessionStorage.importData){
//     try {
//         var data = JSON.parse(sessionStorage.importData)
//         delete sessionStorage.importData;
//     } catch (err) { console.error(err) }
//     console.log(data)
//     // if(data && data.version >= 2 && data.version < 3){
//     //  restoreState = data;
//     // }
// }
// if(window.opener){
//     window.opener.postMessage('franchise-request-import', '*')
// }

// else if(location.search === '?sqlite'){
//  restoreState = _.cloneDeep(DEFAULT_STATE)
//  restoreState.connect.active = 'sqlite'
// }else if(location.search === '?postgres'){
//  restoreState = _.cloneDeep(DEFAULT_STATE)
//  restoreState.connect.active = 'postgres'
// }
