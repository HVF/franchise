import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import _ from 'lodash'

export const key = 'mongo'
export const name = 'MongoDB'
export const syntax = 'javascript'
import 'codemirror/mode/javascript/javascript'

import { UnmountClosed } from 'react-collapse'

import { connectHelper, disconnectHelper } from './generic'
import { FranchiseClientConnector, sendRequest, disconnectBridge } from './bridge'
import CV from '../util/codeviewer'

export const requires_bridge = true

export async function bridgeConnected() {
    console.log('bridge connect')
    // const credentials = await sendRequest({ action: 'get_credentials' })
    // const credentials = {
    //     host: 'localhost',
    //     port: '3306',
    //     database: '',
    //     user: 'root',
    //     password: '',
    // }
    // State.apply('config', 'mysql', 'credentials', U.def({}), (old_credentials) => ({
    //     ...credentials,
    //     ...old_credentials,
    //     autofilled: Object.keys(credentials)
    //         .filter((k) => k != 'id') // don't include the message id
    //         .some((k) => !(k in old_credentials)),
    // }))
}

export class Configure extends React.Component {
    // softUpdateCredentials(o){
    //   const {credentials} = this.state
    //   Object.keys(credentials).forEach(k => {
    //     const credential = credentials[k]
    //     if(credential.length > 0) o[k] = credential
    //   })
    //   console.log(o)
    //   this.setState({credentials: o})
    //   // this.setState({fields: {...this.state.fields, ...o}})
    // }

    render() {
        // <p>Tried to connect {this.state.tries} times.</p>
        const { connect, config } = this.props

        const credentialHints = {
            host: 'localhost',
            port: '27017',
            database: 'mydb',
            user: 'dbuser',
            password: 'password (optional)',
        }
        let credentials = (config.credentials && config.credentials.mongo) || {}

        const Field = (type, icon, className = '') => (
            <div className="pt-input-group">
                {icon ? <span className={className + ' pt-icon pt-icon-' + icon} /> : null}
                <input
                    type={type === 'password' ? 'password' : 'text'}
                    disabled={connect.status == 'connected' || connect.status === 'connecting'}
                    className="pt-input"
                    value={credentials[type] || ''}
                    onChange={(e) =>
                        State.apply(
                            'config',
                            'credentials',
                            'mongo',
                            type,
                            U.replace(e.target.value)
                        )
                    }
                    placeholder={credentialHints[type]}
                />
            </div>
        )

        return (
            <div>
                <img src={require('./img/mongodb.svg')} style={{ height: 60 }} />
                <p />
                <div className="pg-form">
                    <div>
                        <div>
                            <UnmountClosed
                                isOpened={
                                    !!credentials.autofilled &&
                                    connect.bridge_status === 'connected'
                                }
                            >
                                <div className="pt-callout pt-icon-tick pt-intent-success">
                                    <div>
                                        Franchise auto-filled some of your credentials using your
                                        system's defaults.
                                    </div>
                                </div>
                            </UnmountClosed>
                            <div className="pt-control-group pt-fill">
                                {Field('host', 'cloud')}
                                {Field('port')}
                            </div>

                            <div className="pt-control-group pt-vertical">
                                {Field('user', 'user')}
                                {Field('password', 'lock')}
                            </div>

                            {Field('database', 'database')}
                        </div>
                        {/*<div>derp</div>*/}
                    </div>

                    <FranchiseClientConnector connect={connect} />

                    {connect.status != 'connected' ? (
                        <button
                            disabled={
                                connect.status === 'connecting' ||
                                connect.bridge_status !== 'connected'
                            }
                            type="button"
                            className="pt-button pt-large  pt-intent-primary"
                            onClick={(e) => connectDB()}
                        >
                            Connect
                            <span className="pt-icon-standard pt-icon-arrow-right pt-align-right" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="pt-button pt-large  pt-intent-danger"
                            onClick={(e) => disconnectDB()}
                        >
                            Disconnect
                            <span className="pt-icon-standard pt-icon-offline pt-align-right" />
                        </button>
                    )}
                </div>
            </div>
        )
    }
}

export function create_table_snippet() {
    return `db.createCollection("new_table");`
}

export function select_table_snippet(table) {
    // return 'select ' + table.columns.map(e => '"' + e + '"').join(', ') + ' from "' + table.name + '"'
}

export async function connectDB() {
    await connectHelper(async function() {
        let result = await sendRequest({
            action: 'open',
            db: 'mongo',
            credentials: State.get('config', 'credentials', 'mongo'),
        })
        if (!result.ready) throw new Error(result.error)

        // State.apply('connect', 'schema', U.replace(await getSchema()))
    })
}

// export function reference(name) {
//     return '#' + name
// }

export function bridgeDisconnected() {
    if (State.get('connect', 'status') === 'connected') {
        State.apply('connect', 'status', U.replace('disconnected'))
        console.log('bridge disconnected')
    }
}

async function disconnectDB() {
    await disconnectHelper((e) => sendRequest({ action: 'close' }))
}

// export async function run(query) {
//     var db = State.get('connect', '_db')
//     let result = formatResults(eval(query))
//     result.query = query
//     // State.apply('connect', 'schema', U.replace(await getSchema()))
//     return result
// }

export async function run(query, cellId) {
    var response = await sendRequest({ action: 'exec', sql: query })

    // let expandedQuery = expandQueryRefs(query, cellId)
    // console.log(expandedQuery)
    // let result = await _runQuery(expandedQuery)
    // result.query = query
    // State.apply('connect', 'schema', U.replace(await getSchema()))
    // await extractEditableColumns(result)
    // await assignSuggestedName(result)
    // await new Promise(k => setTimeout(k, 3000));
    // console.log(response)

    let cols = _.uniq(_.flatten(response.results.map((k) => Object.keys(k))))

    return {
        id: response.id,
        query: query,
        object: response.results,
        columns: cols,
        values: response.results.map((k) => cols.map((j) => k[j])),
    }
}

function formatResults(data) {
    if (data === undefined) {
        return {}
    }
    return {
        columns: ['one', 'two', 'three'],
        values: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]],
    }
}

export function CodeMirrorOptions(connect, virtualSchema) {
    return {
        mode: 'javascript',

        // hintOptions: {
        //     hint: CodeMirror.hint.javascript,
        // },
    }
}

export function Clippy(props) {
    return (
        <div className="clippy-wrap">
            <div className="clippy">
                <section>
                    <h2>db.collection.find(query, projection)</h2>
                    <CV mode="javascript" code={`db.collection.find( { qty: { $gt: 4 } } )`} />
                    <CV
                        mode="javascript"
                        code={`db.bios.find().sort( { name: 1 } ).limit( 5 )
db.bios.find().limit( 5 ).sort( { name: 1 } )`}
                    />
                </section>

                <section>
                    <h2>Links</h2>
                    <ul>
                        <li>
                            <a
                                target="_blank"
                                href="https://docs.mongodb.com/manual/reference/mongo-shell/"
                            >
                                MongoDB Shell Quick Reference
                            </a>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    )
}
