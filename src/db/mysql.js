import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import _ from 'lodash'
import SQLParser from 'sqlite-parser'
import { UnmountClosed } from 'react-collapse';

import CV from '../util/codeviewer'

export const key = 'mysql'
export const name = "MySQL"
export const syntax = 'text/x-mysql'

export const requires_bridge = true;

export async function bridgeConnected(){
  console.log('bridge connect')
  // const credentials = await sendRequest({ action: 'get_credentials' })
  const credentials = {
    host: 'localhost',
    port: '3306',
    database: '',
    user: 'root',
    password: ''
  }
  State.apply('config', 'mysql', 'credentials', U.def({ }), old_credentials => ({
    ...credentials,
    ...old_credentials,
    autofilled: Object.keys(credentials)
      .filter(k => k != 'id') // don't include the message id
      .some(k => !(k in old_credentials))
  }))
}


import { FranchiseClientConnector, sendRequest, disconnectBridge } from './bridge'
import { connectHelper, disconnectHelper, extractEditableColumns, assignSuggestedName, expandQueryRefs } from './generic'
export { getStagingValue, assembleDeltaQuery, updateStagingValue, create_table_snippet, select_table_snippet } from './generic'

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

  render(){
    // <p>Tried to connect {this.state.tries} times.</p>
    const {connect, config} = this.props;

    const credentialHints = {
      host: 'localhost',
      port: '3306',
      database: 'mydb',
      user: 'dbuser',
      password: 'password (optional)',
    }
    let credentials = (config.mysql && config.mysql.credentials) || {}

    const Field = (type, icon, className='') => <div className='pt-input-group'>
      {icon ? <span className={className+' pt-icon pt-icon-'+icon}/> : null }
      <input
        type={type === 'password' ? 'password' : 'text'}
        disabled={connect.status == 'connected' || connect.status === 'connecting'}
        className='pt-input'
        value={credentials[type]||''}
        onChange={e => State.apply('config', 'mysql', 'credentials', type, U.replace(e.target.value))}
        placeholder={credentialHints[type]} 
        />
    </div>



    return <div>
      <img src={ require('./img/mysql.svg')} style={{ height: 40 }} />
      <p />
      <div className='pg-form'>

        <div>
          <div>
            <UnmountClosed isOpened={!!credentials.autofilled && connect.bridge_status === 'connected'}>
              <div className='pt-callout pt-icon-tick pt-intent-success'>
                  <div>Franchise auto-filled some of your credentials using your system's defaults.</div>
              </div>
            </UnmountClosed>
            <div className='pt-control-group pt-fill'>
              {Field('host', 'cloud')}
              {Field('port')}
            </div>

            <div className='pt-control-group pt-vertical'>
              {Field('user', 'user')}
              {Field('password', 'lock')}
            </div>

            {Field('database', 'database')}
          </div>
          {/*<div>derp</div>*/}
        </div>
    
        <FranchiseClientConnector connect={connect} />
        
        { connect.status != 'connected'
        ? <button disabled={connect.status === 'connecting' || connect.bridge_status !== 'connected'}
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
        action: 'exec',
        sql: `SELECT table_name, data_type, column_name FROM information_schema.columns WHERE table_schema = database();`
    })

    return _.map(_.groupBy(table_list.results.values, k => k[0]), 
        (cols, table_name) => ({ name: table_name, columns: cols.map(k => k[2]) }) )

    // console.log(table_list)
    // var table_list = await sendRequest({
    //     action: 'exec',
    //     sql: `SELECT DISTINCT table_schema, table_name, string_agg(column_name, '<<comma>>') AS cols
    //           FROM information_schema.columns 
    //           WHERE table_schema not in ('pg_catalog', 'information_schema')
    //           GROUP BY table_schema, table_name;`
    // })
    // if(table_list.results.rows.length < 1) return [];
    // return table_list.results.rows.map(([table_schema, table_name, cols]) => {
    //     var columnNames = cols.split('<<comma>>')
    //     return { schema: table_schema, name: table_name, columns: columnNames }
    // })
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
    console.log(result)
    return result;
}


async function _runQuery(query){
    var response = await sendRequest({ action: 'exec', sql: query })
    // let columns = response.results.fields.map(k => k.name);
    let result = {
        columns: response.results.columns,
        values: response.results.values,
        // columns,
        // values: response.results.rows,
        id: response.id
    }
    result.astInput = query;
    try { result.ast = SQLParser(query) } catch (err) { }
    return result;
}


export async function connectDB(){
    await connectHelper(async function(){
        let result = await sendRequest({ action: 'open', db: 'mysql', credentials: State.get('config', 'mysql', 'credentials')});
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

export function escapeIdentifier(id, type){
    const escaped = '`' + id.replace(/`/g, '``') + '`'
    return escaped
}

export function assembleRowPredicate(result, rowIndex){
    return _.zip(result.editableColumns, result.values[rowIndex])
        .filter(k => k[0]) // for editable (non-computed) columns
        .map(([col, val]) => escapeIdentifier(col, typeof val) + 
            // in SQL, you can't do x = NULL, but instead you have to do x IS NULL
            (val === null ? ' IS NULL' : (' = ' + escapeValue(val) )))
        .join(' AND ')
}

export function Clippy(props){
    return <div className="clippy-wrap">
        <div className="clippy">
            <section>
                <h2>SELECT Statement</h2>
                <CV mode="text/x-sqlite" code={`SELECT name, favorite_color FROM students WHERE age < 7`}/>
                <CV mode="text/x-sqlite" code={`SELECT date, price FROM ethereum_chart ORDER BY date DESC`}/>
            </section>

            <section>
            <h2>JOINs</h2>
            <CV mode="text/x-sqlite" code={`SELECT OrderID, FROM order_table INNER JOIN customer_table ON order_table.customer_id = customer_table.customer_id`}/>
            </section>

            <section>
            <h2>GROUP BY</h2>
            <CV mode="text/x-sqlite" code={`SELECT product, COUNT(*) AS sales FROM purchases GROUP BY product`}/>
            <CV mode="text/x-sqlite" code={`SELECT dept, SUM(salary) FROM employees GROUP BY dept`} />
            </section>


            <section>
            <h2>Temporary Tables</h2>
            <CV mode="text/x-sqlite" code={`CREATE TEMP TABLE [IF NOT EXISTS] cohort AS [select statement]`}/>
            </section>

            
            <section>
            <h2>Links</h2>
            <ul>
            <li><a target="_blank" href="https://sqlite.org/lang.html">SQLite Language Reference</a></li>
            <li><a target="_blank" href="http://tutlane.com/tutorial/sqlite/sqlite-group-by-clause">GROUP BY Tutorial</a></li>
            <li><a target="_blank" href="http://www.sqlitetutorial.net/sqlite-inner-join/">INNER JOIN Tutorial</a></li>
            </ul>
            </section>

        </div>
    </div> 
}

