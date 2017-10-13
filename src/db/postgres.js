import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import _ from 'lodash'
import SQLParser from 'sqlite-parser'
import { UnmountClosed } from 'react-collapse';

import CV from '../util/codeviewer'

export const key = 'postgres'
export const name = "PostgreSQL"
export const syntax = 'text/x-pgsql'

export const requires_bridge = true;

export async function bridgeConnected(){
  console.log('bridge connect')
  const credentials = await sendRequest({ action: 'get_postgres_credentials' })
  
  State.apply('config', 'postgres', 'credentials', U.def({ }), old_credentials => ({
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
  render(){
    // <p>Tried to connect {this.state.tries} times.</p>
    const {connect, config} = this.props;

    const credentialHints = {
      host: 'localhost',
      port: '5432',
      database: 'mydb',
      user: 'dbuser',
      password: 'password (optional)',
    }

    let credentials = (config.postgres && config.postgres.credentials) || {}

    const Field = (type, icon, className='') => <div className='pt-input-group'>
      {icon ? <span className={className+' pt-icon pt-icon-'+icon}/> : null }
      <input
        type={type === 'password' ? 'password' : 'text'}
        disabled={connect.status == 'connected' || connect.status === 'connecting'}
        className='pt-input'
        value={credentials[type]||''}
        onChange={e => State.apply('config', 'postgres', 'credentials', type, U.replace(e.target.value))}
        placeholder={credentialHints[type]} 
        />
    </div>



    return <div>
      <img src={ require('./img/postgres.svg')} style={{ height: 40 }} />

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
  let page_size = 9997; // must be < 10,000 so we stay under the 10,000 row limit
  let schema_rows = [];
  let cur_offset = 0;
  do {
    var page_results = await sendRequest({
        action: 'exec',
        sql: `SELECT table_schema, table_name, column_name
              FROM information_schema.columns 
              WHERE table_schema not in ('pg_catalog', 'information_schema', 'pg_internal')
              LIMIT ${page_size} OFFSET ${cur_offset}`
    })
    cur_offset += page_size;
    schema_rows = schema_rows.concat(page_results.results.rows);
    // console.log(page_results.results.rows)
  } while (page_results.results.rows.length === page_size);
  
  if(schema_rows.length < 1) return [];

  return _.map(_.groupBy(schema_rows, 
    ([schema, table, column]) => schema + '.' + table), 
    columns => ({
      schema: columns[0][0],
      name: columns[0][1],
      columns: columns.map(k => k[2])
    }))
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
    var response = await sendRequest({ action: 'exec', sql: query })
    let columns = response.results.fields.map(k => k.name);
    let result = {
        columns,
        values: response.results.rows,
        id: response.id
    }
    result.astInput = query;
    try { result.ast = SQLParser(query) } catch (err) { }
    return result;
}


export async function connectDB(){
    await connectHelper(async function(){
        let result = await sendRequest({ action: 'open', db: 'postgres', credentials: State.get('config', 'postgres', 'credentials')});
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
    const escaped = id.split('.').map(id => '"' + id.replace(/"/g, '""') + '"').join('.');
    return escaped
}

function escapePredicateIdentifier(id, config, numeric){
    const escaped = id.split('.').map(id => '"' + id.replace(/"/g, '""') + '"').join('.');
    if (numeric) return escaped + '::numeric'
    return escaped
}

export function assembleRowPredicate(result, rowIndex){
    return _.zip(result.editableColumns, result.values[rowIndex])
        .filter(k => k[0]) // for editable (non-computed) columns
        .map(([col, val]) => escapePredicateIdentifier(col, null, !isNaN(val)) + 
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
            <CV mode="text/x-sqlite" code={`SELECT order_table.order_id, customer_table.customer_name, order_table.order_date FROM order_table INNER JOIN customer_table ON order_table.customer_id = customer_table.customer_id`}/>
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
            <li><a target="_blank" href="https://www.postgresql.org/docs/9.4/static/sql.html">PostgreSQL Language Reference</a></li>
            <li><a target="_blank" href="https://www.postgresql.org/docs/8.3/static/tutorial-agg.html">GROUP BY Tutorial</a></li>
            <li><a target="_blank" href="https://www.postgresql.org/docs/8.3/static/tutorial-join.html">INNER JOIN Tutorial</a></li>
            </ul>
            </section>

        </div>
    </div> 
}

