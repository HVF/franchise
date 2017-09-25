import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import _ from 'lodash'
import SQLParser from 'sqlite-parser'
import { UnmountClosed } from 'react-collapse';

import CV from '../util/codeviewer'

export const key = 'bigquery'
export const name = "BigQuery"
export const syntax = 'text/x-sql'

export const requires_bridge = true;

export async function bridgeConnected(){
  console.log('bridge connect')
}


import { FranchiseClientConnector, sendRequest, disconnectBridge } from './bridge'
import { connectHelper, disconnectHelper, extractEditableColumns, assignSuggestedName, expandQueryRefs } from './generic'
export { getStagingValue, assembleDeltaQuery, updateStagingValue, create_table_snippet } from './generic'



export class Configure extends React.Component {

  render(){
    // <p>Tried to connect {this.state.tries} times.</p>
    const {connect, config} = this.props;

    let {credentials, useLegacySql} = config.bigquery || {}
    credentials = credentials || {}

    const getfile = file => {
      var reader = new FileReader()
      reader.onload = e => {
        const keyFile = {
          name: file.name,
          data: Buffer(reader.result).toString('hex')
        }
        State.apply('config', 'bigquery', 'credentials', U.def({}), U.merge({keyFile}))
      }
      console.log(file)
      reader.readAsArrayBuffer(file)

      if(file.type !== 'application/json'){
        // this.
      }
    }


    return <div>
      <img src={ require('./img/bigquery.svg')} style={{ height: 40 }} />
      <div className='pt-callout pt-intent-primary' style={{margin: '10px 0'}}>
        <h5>Getting a BigQuery Keyfile</h5>
      <ol>
        <li>Go to the <a href="https://console.developers.google.com/projectselector/apis/credentials"><b>API Console Credentials</b></a> page</li>
        <li>From the project drop-down, select your project.</li>
        <li>On the <b>Credentials</b> page, select the <b>Create credentials</b> drop-down, then select <b>Service account key</b>.</li>
        <li>From the Service account drop-down, select an existing service account or create a new one.</li>
        <li>For <b>Key type</b>, select <b>JSON</b>, then select <b>Create</b>.</li>
        </ol>
      </div>
      <div className='pg-form'>
        <div>
          <label className="pt-label">
              Key file {" "}
              <span className="pt-text-muted">(.json, .pem, or .p12)</span>
              <div className="pt-control-group pt-fill">
                <label className="pt-file-upload">
                  <input type="file"
                    accept=".json,.pem,.p12"
                    disabled={connect.status == 'connecting' || connect.status == 'connected'}
                    onChange={e => getfile(e.target.files[0])}/> 
                  <span className="pt-file-upload-input">{
                    (credentials.keyFile
                      && credentials.keyFile.name) 
                    || 'Choose file...'}</span>
                </label>
              </div>
          </label>

          {credentials.bigquery && 
            credentials.bigquery.keyFile
            && (!credentials.bigquery.keyFile.name.match(/\.json$/))
            ? <div className='pt-control-group pt-vertical'><div className='pt-input-group'>
            {/*<span className={className+' pt-icon pt-icon-'+icon}/>*/}
              <input
                type='text'
                disabled={connect.status == 'connected' || connect.status === 'connecting'}
                className='pt-input'
                value={credentials.bigquery && credentials.bigquery.projectId}
                onChange={e => State.apply('config', 'bigquery', 'credentials', 'projectId', U.replace(e.target.value))}
                placeholder='Project Id'
                />
            </div><div className='pt-input-group'>
            {/*<span className={className+' pt-icon pt-icon-'+icon}/>*/}
              <input
                type='text'
                disabled={connect.status == 'connected' || connect.status === 'connecting'}
                className='pt-input'
                value={credentials.bigquery && credentials.bigquery.email}
                onChange={e => State.apply('config', 'bigquery', 'credentials', 'email', U.replace(e.target.value))}
                placeholder='Service Account Id'
                />
            </div></div>
            : null
          }         

          <label className="pt-control pt-switch">
            <input type="checkbox" checked={useLegacySql}
              onChange={e => State.apply('config', 'bigquery', 'useLegacySql', U.replace(e.target.checked))}/>
            <span className="pt-control-indicator"></span>
            Use Legacy SQL
          </label>

        </div>
    
        <FranchiseClientConnector connect={connect} />
        
        { connect.status != 'connected'
        ? <button disabled={connect.status === 'connecting' || connect.bridge_status !== 'connected' || !(credentials.keyFile) }
                  type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
              Connect
              <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
          </button>
        : <button type="button" className="pt-button pt-large  pt-intent-danger" onClick={e => disconnectDB()}>
              Disconnect
              <span className="pt-icon-standard pt-icon-offline pt-align-right"></span>
          </button> }      
      </div>
    </div>
  }
}


async function getSchema(){
    var table_list = await sendRequest({
        action: 'get_bigquery_schema'
    })

    // console.log('table_list', table_list)

    return table_list.schema
}

export async function run(query, cellId){
    let expandedQuery = expandQueryRefs(query, cellId);
    console.log(expandedQuery)
    let result = await _runQuery(expandedQuery);
    result.query = query;
    State.apply('connect', 'schema', U.replace(await getSchema()))
    await extractEditableColumns(result);
    await assignSuggestedName(result);
    // await new Promise(k => setTimeout(k, 3000));
    return result;
}


async function _runQuery(query){
    var response = await sendRequest({
      action: 'exec',
      sql: query,
      useLegacySql: !!State.get('config', 'bigquery', 'useLegacySql')
    })
    
    if(!response.results[0].length) return {
      columns: [],
      values: [],
      id: response.id
    }

    let columns = Object.keys(response.results[0][0])
    let result = {
        columns: columns,
        values: response.results[0].map(k => columns.map(f => k[f])),
        id: response.id
    }
    result.astInput = query;
    try { result.ast = SQLParser(query) } catch (err) { }
    return result;
}


export async function connectDB(){
    await connectHelper(async function(){
        const credentials = State.get('config', 'bigquery', 'credentials')
        // if(credentials.keyFile.name && credentials.keyFile.name.match(/\.json$/))
        let result = await sendRequest({ action: 'open', db: 'bigquery', credentials})
        if(!result.ready) throw new Error(result.error)

        State.apply('connect', 'schema', U.replace(await getSchema()))
    })
}


export function reference(name){
    return '#' + name
}

export function bridgeDisconnected(){
    if(State.get('connect', 'status') === 'connected'){
      State.apply('connect', 'status', U.replace('disconnected'))  
      console.log('bridge disconnected')
    }
}

async function disconnectDB(){
  await disconnectHelper(e => sendRequest({ action: 'close' }))
}


export function escapeValue(val){
    if(!isNaN(val)) return '' + val
    return "'" + (val + '') .replace(/'/g, "''") + "'"
}

export function escapeIdentifier(id, config){
    if(config.useLegacySql) return '[' + id+ ']'

    return '`' + id.replace(/`/g, '\\`') + '`'
}

export function assembleRowPredicate(result, rowIndex, config){
    return _.zip(result.editableColumns, result.values[rowIndex])
        .filter(k => k[0]) // for editable (non-computed) columns
        .map(([col, val]) => escapeIdentifier(col, config) + 
            // in SQL, you can't do x = NULL, but instead you have to do x IS NULL
            (val === null ? ' IS NULL' : (' = ' + escapeValue(val) )))
        .join(' AND ')
}

function escapeTableName(table, config){
  if(config.useLegacySql)
    return '[' + ((table.schema && table.schema != 'public') ? table.schema : '') + '.' + table.name + ']'
  
  return ((table.schema && table.schema != 'public')
    ? escapeIdentifier(table.schema, config)+'.'
    : '') + escapeIdentifier(table.name, config);
}

export function select_table_snippet(table, config){
    let table_name = escapeTableName(table, config)
    
    if(table.columns.length < 5) return 'SELECT '
      + table.columns.map(c => escapeIdentifier(c,config)).join(', ')
      + ' FROM ' + table_name + ' LIMIT 1000'
    
    return 'SELECT\n'
      + table.columns.map(e => '    '+escapeIdentifier(e, config)).join(', \n')
      + '\nFROM ' + table_name + '\nLIMIT 1000'
}






export function Clippy({connect, config}){
    return <div className="clippy-wrap">
        <div className="clippy">
            <section>
                <h2>SELECT Statement</h2>
                <CV mode="text/x-sqlite" code={`SELECT name, favorite_color FROM students WHERE age < 7`}/>
                <CV mode="text/x-sqlite" code={`SELECT date, price FROM ethereum_chart ORDER BY date DESC`}/>
            </section>

            <section>
            <h2>JOINs</h2>
            <CV mode="text/x-sqlite" code={`SELECT order_table.order_id, customer_table.customer_name, order_table.order_date FROM order_table INNER JOIN customer_table ON order_table.customer_id = customer_table.customer_id`}/>
            </section>

            <section>
            <h2>GROUP BY</h2>
            <CV mode="text/x-sqlite" code={`SELECT product, COUNT(*) AS sales FROM purchases GROUP BY product`}/>
            <CV mode="text/x-sqlite" code={`SELECT dept, SUM(salary) FROM employees GROUP BY dept`} />
            </section>

            {
              config && config.useLegacySql
              ? null
              : <section>
                <h2>Temporary Tables</h2>
                <CV mode="text/x-sqlite" code={`CREATE TEMP TABLE [IF NOT EXISTS] cohort AS [select statement]`}/>
                </section>
            }

            
            <section>
            <h2>Links</h2>
            <ul>
            <li><a target="_blank" href="https://cloud.google.com/bigquery/docs/reference/legacy-sql">BigQuery "Legacy SQL" Reference</a></li>
            <li><a target="_blank" href="https://cloud.google.com/bigquery/docs/reference/standard-sql/">BigQuery "Standard SQL" Reference</a></li>

            <li><a target="_blank" href="http://tutlane.com/tutorial/sqlite/sqlite-group-by-clause">GROUP BY Tutorial</a></li>
            <li><a target="_blank" href="http://www.sqlitetutorial.net/sqlite-inner-join/">INNER JOIN Tutorial</a></li>
            </ul>
            </section>

        </div>
    </div> 
}














