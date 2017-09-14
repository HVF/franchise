import React, {Component} from 'react'

import * as State from '../../state'
import * as U from '../../state/update'

import _ from 'lodash'
import SQLParser from 'sqlite-parser'
import SQLiteWorker from 'worker-loader!./worker.js'
// import * as SQLGenerate from 'sqlgenerate'

export const key = 'sqlite'
export const name = "SQLite"
export const syntax = 'text/x-sqlite'
import 'whatwg-fetch'


import { connectHelper, disconnectHelper, extractEditableColumns, assignSuggestedName, expandQueryRefs } from '../generic'
export { getStagingValue, assembleDeltaQuery, updateStagingValue, create_table_snippet, select_table_snippet } from '../generic'

import CV from '../../util/codeviewer'
import swal from 'sweetalert2'


const drop = e => {
    e.preventDefault()
    connectDB(e.dataTransfer)
}

// SQLite370.svg

export class Configure extends Component{
    componentDidMount(){
        window.addEventListener("drop", drop)
    }
    componentWillUnmount(){
        window.removeEventListener("drop", drop)
    }
    render(){
        const { config, connect } = this.props
        return <div>
            <img src={require('../img/sqlite.svg')} style={{ height: 40 }} />
            <p>
                Franchise includes an in-browser version of the powerful SQLite engine. 
            </p>

            <input style={{
                position: 'absolute',
                top: -10000,
                left: -10000
            }} 
            accept='.sql,.csv,.json,.jsonl,.xlsx,.xls,.sqlite,.db,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json'
            type="file" ref={e => this.picker = e} onChange={e => connectDB(e.target)} /> 

            {connect.status == 'connected' ? <div>

                <button type="button" className="pt-button pt-large  pt-intent-danger" onClick={e => disconnectDB()}>
                       Disconnect
                       <span className="pt-icon-standard pt-icon-offline pt-align-right"></span>
                   </button>
            </div> : <div style={{ opacity: connect.status == 'connecting' ? 0.5 : 1 }}>
                <p>
                    Click the button below to browse for <b>CSV</b>, <b>XLSX</b>, <b>JSON</b>, <b>SQLite</b>, or <b>SQL</b> files on your computer.
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div className="open-thumb" onClick={e => this.picker.click()} style={{ flexShrink: 0 }}>
                        <i className="fa fa-3x fa-folder-open" aria-hidden="true"></i> 
                        <div style={{ display: 'inline-block', width: 70, marginLeft: 10 }}>Browse Data File</div>
                    </div>
                    <div style={{ flexGrow: 1 }}> or create a <a href="javascript:void(0)" onClick={e => connectDB()}>blank notebook</a> </div>
                </div>
                <br />
                <p>
                    Don’t have any data handy? No problem, check out one of our <b>sample notebooks</b>:
                </p>

                <div className="samples">
                    <a href="/demos/crime_v8.html">
                    <div className="sample-thumb" style={{ backgroundImage: `url(${require('../img/map.png')})`}}>
                        <div className="title">Crime in LA</div>
                    </div>
                    </a>
                    <a href="/demos/crime_v8.html">
                    <div className="sample-thumb" style={{ backgroundImage: `url(${require('../img/scatter.png')})`}}>
                        <div className="title">Sales Data</div>
                    </div>
                    </a>
                    <a href="/demos/enron.html">
                    <div className="sample-thumb" style={{ backgroundImage: `url(${require('../img/card.png')})`}}>
                        <div className="title">Enron Emails</div>
                    </div>
                    </a>
                </div>
            </div>}
            


        </div>
    }
}

// export class Configure extends Component{
//     componentDidMount(){
//         window.addEventListener("drop", drop)
//     }
//     componentWillUnmount(){
//         window.removeEventListener("drop", drop)
//     }
//     render(){
//         const { config, connect } = this.props
//         return <div>
//             <h2>SQLite <span style={{color: '#aaa', fontSize: 'small'}}>/ CSV / XLS / XLSX / JSON</span></h2>
//             <p>
//                 Play around with SQLite by importing a sqlite, sql, csv, or xslx file.
//             </p>
            
//             <label className="pt-label">
//                     Import file {" "}
//                     <span className="pt-text-muted">(optional)</span>
//                     <div className="pt-input-group">
//                 <label className="pt-file-upload">
//                     <input type="file" disabled={connect.status == 'connecting' || connect.status == 'connected'} onChange={e => connectDB(e.target)} /> 
//                     <span className="pt-file-upload-input">Choose file...</span>
//                 </label>
//                 </div>
//             </label>

//             <p>
//             { connect.status != 'connected' ? 
//                 (connect.status == 'connecting' ? 
//                     <button disabled type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
//                         Connect
//                         <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
//                     </button> :
//                     <button type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
//                         Connect
//                         <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
//                     </button> ) :
//                 <button type="button" className="pt-button pt-large  pt-intent-danger" onClick={e => disconnectDB()}>
//                         Disconnect
//                         <span className="pt-icon-standard pt-icon-offline pt-align-right"></span>
//                     </button> }
//             </p>

//             { connect.status != 'connected' ? <p>
//                 Alternatively, start with some sample data: {" "}
//                     <a href="javascript:void(0)" onClick={e => connectDB(require('file-loader!../../../data/inventory.json'), 'Inventory')}>inventory.json</a>{", "}
//                     <a href="javascript:void(0)" onClick={e => connectDB(require('file-loader!../../../data/employees.sql'), 'Employees')}>employees.sql</a>{", "}
//                     <a href="javascript:void(0)" onClick={e => connectDB(require('file-loader!../../../data/geo_states.sql'), 'States')}>geo_states.sql</a>{", "}
//                     <a href="javascript:void(0)" onClick={e => connectDB(require('file-loader!../../../data/tibbles.csv'), 'Sales')}>sales.csv</a>
//             </p> : null }
//         </div>
//     }
// }


export function reference(name){
    return '#' + name
    // return '{{' + name + '}}'
}

async function readFile(picker){
    var file, fileName = '';
    if(picker && picker.files && picker.files.length > 0){
        fileName = picker.files[0].name;
        file = await new Promise((resolve, reject) => {
            let fr = new FileReader()
            fr.onload = e => {
                resolve(fr.result)
            }
            fr.readAsArrayBuffer(picker.files[0])
        })
    }else if(typeof picker === 'string'){
        let response = await fetch(picker);
        return await response.arrayBuffer()
    }else if(picker && picker.dump){
        console.log("loading from dump", picker)
        return Buffer.from(picker.dump, 'base64').buffer;
    }
    return file;
}


export async function connectDB(picker, name){
    await connectHelper(async function(){
        if(!name && picker && picker.files){
            name = picker.files[0] && picker.files[0].name.replace(/\..*?$/, '')
        }
        
        let file = await readFile(picker);

        if(file && file.byteLength && file.byteLength > 10000000){
            await swal({
                title: 'Large Files Not Supported',
                text: 'Currently, the pure-javascript SQLite engine doesn\'t play nicely with large files. Caveat Emptor, Here Be Dragons.',
                type: 'error',
            })
        }
        // const DATA = 
        console.log(file)

        let sqlite = await makeSqlite(file, name);
        
        State.apply('connect', '_sqlite', U.replace(sqlite))
        State.apply('connect', 'schema', U.replace(await getSchema()))
    })
}

async function disconnectDB(){
    await disconnectHelper(async function(){
        let sqlite = State.get('connect')._sqlite;
        if(sqlite && sqlite.worker){ sqlite.worker.terminate() }    
    })
}

async function _runCommand(...args){
    let result = await State.get('connect', '_sqlite').runCommand(...args);
    return result;
}

export async function exportData(){
    let result = await _runCommand({ action: 'export' })
    return {
        dump: Buffer.from(result.buffer).toString('base64')
    }
    // console.log(result)
    // return result
}



async function getSchema(){
    var table_list = await _runCommand({ action: 'exec', sql: 'SELECT name, sql FROM sqlite_master where type = "table"' })
    if(table_list.results.length < 1) return [];

    return table_list.results[0].values.map(([name, sql]) => {
        let ast = SQLParser(sql)
        return { 
            name: name, 
            columns: ast.statement[0].definition.filter(k => k.variant == 'column').map(k => k.name)
        }
    })
}

export async function run(query, cellId){
    let expandedQuery = expandQueryRefs(query, cellId);
    console.log(expandedQuery)
    let result = await _runQueryFixSQLite(expandedQuery);
    result.query = query;
    State.apply('connect', 'schema', U.replace(await getSchema()))
    await extractEditableColumns(result);
    await assignSuggestedName(result);
    // await new Promise(k => setTimeout(k, 3000));
    return result;
}


// SQLite doesn't display column names for SELECT with no rows
async function _runQueryFixSQLite(query){
    var response = await _runCommand({ action: 'exec', sql: query })
    let result = response.results[response.results.length - 1] || {}

    result.astInput = query;
    try { result.ast = SQLParser(query) } catch (err) { }

    // SQLite doesn't output any result if the result of a query has no rows
    // we want it to emit an empty column header ideally, so we generate it
    // from the AST
    if(result.ast && !result.columns){
        for(let stmt of result.ast.statement){
            let columns = [];
            if(stmt.variant === 'select' && stmt.from && stmt.from.type === 'identifier'){
                let table_from = stmt.from.name;
                for(let col of stmt.result){
                    if(col.type === 'identifier' && col.variant === 'column'){
                        columns.push(col.alias || col.name)
                    }else if(col.type === 'identifier' && col.variant === 'star'){
                        // TODO: support table.* type star identifiers
                        columns = columns.concat((await getSchema()).find(k => k.name == table_from).columns)
                    }
                }
                result = { values: [], columns: columns }
            }  
        }
    }
    result.id = response.id;
    return result;
}


// https://sqlite.org/lang.html
async function makeSqlite(buffer, sname){
    var worker = new SQLiteWorker(); 
    var replyQueue = [], rejectQueue = [];
    var messageCounter = 0;
    worker.onmessage = function(event) {
        replyQueue[event.data.id](event.data)
        rejectQueue.shift()
    };
    worker.onerror = function(e) {
        console.log("Worker error: ", e)
        rejectQueue.shift()(e)
    };
    function runCommandCore(packet){
        return new Promise((resolve, reject) => {
            packet.id = ++messageCounter;
            replyQueue[packet.id] = resolve
            rejectQueue.push(reject)
            worker.postMessage(packet)
        })
    }
    var startup = await runCommandCore({ 
        action: 'open',
        buffer,
        sname
    });
    return {
        worker: worker,
        async runCommand(command){
            if(!(await startup).ready)
                throw new Error('Failed to initialize database!');
            return await runCommandCore(command)
        }
    }
}


export function escapeValue(val){
    return "'" + (val + '') .replace(/'/g, "''") + "'"
}

export function escapeIdentifier(id){
    if(typeof id != 'string') debugger;
    return '"' + (id + '').replace(/"/g, '""') + '"'
}

export function assembleRowPredicate(result, rowIndex){
    return _.zip(result.editableColumns, result.values[rowIndex])
        .filter(k => k[0]) // for editable (non-computed) columns
        .map(([col, val]) => escapeIdentifier(col) + 
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


// const join_example = `SELECT
//     OrderTable.OrderID,
//     CustomerTable.CustomerName,
//     OrderTable.OrderDate
// FROM
//     OrderTable INNER JOIN CustomerTable
// ON
//     OrderTable.CustomerID = CustomerTable.CustomerID`


// const group_example1 = `SELECT
//     job, SUM(salary)
// FROM
//     EmployeesTable
// GROUP BY
//     job`

// const group_example2 = `SELECT
//     restaurant, COUNT(review)
// FROM
//     ReviewsTable
// GROUP BY
//     restaurant`

// export class Clippy extends React.PureComponent {

//     render(){

//         const {connect} = this.props
// //        <h2 className='top'>How to combine tables: Joins</h2>
// //            <p>To get results that combine multiple tables, write a select statement
// //                that uses the SQLite <CV small mode="text/x-sqlite" code="INNER JOIN"/> keyword with the SQLite <tt>ON</tt> keyword.
// //                </p>
// //            <p><a href="http://www.sqlitetutorial.net/sqlite-inner-join/">Here's an INNER JOIN tutorial</a>, and here's an example: </p>
// //            <CV mode="text/x-sqlite" code={join_example}/>
// //            <p>Although you'll be using <tt>INNER JOIN</tt>s nine times out of ten, you might also
// //            need <a href="http://www.sqlitetutorial.net/sqlite-left-join/">
// //                LEFT JOIN
// //            </a> and <a href="http://www.sqlitetutorial.net/sqlite-union/">
// //                UNION
// //            </a>
// //            </p>
// //            <h2>How to count or add up results: Group By</h2>
// //            <p>To get a summary for each unique value in a column of your table, use the SQLite <CV small mode="text/x-sqlite" code="GROUP BY"/> keyword.</p>
// //            <p><a href="http://tutlane.com/tutorial/sqlite/sqlite-group-by-clause">Here's a GROUP BY tutorial</a>, and here's an adding-up example:</p>
// //            <CV mode="text/x-sqlite" code={group_example1}/>
// //            <p>Here's a counting example:</p>
// //            <CV mode="text/x-sqlite" code={group_example2}/>
//         return <div className="clippy-wrap">
//             <div className="clippy">
//                 <section>
//                     <h2>SELECT Statement</h2>
//                     <CV mode="text/x-sqlite" code={`SELECT name, favorite_color FROM students WHERE age < 7`}/>
//                     <CV mode="text/x-sqlite" code={`SELECT date, price FROM ethereum_chart ORDER BY date DESC`}/>
//                 </section>

//                 <section>
//                 <h2>JOINs</h2>
//                 <CV mode="text/x-sqlite" code={`SELECT OrderID, FROM order_table INNER JOIN customer_table ON order_table.customer_id = customer_table.customer_id`}/>
//                 </section>

//                 <section>
//                 <h2>GROUP BY</h2>
//                 <CV mode="text/x-sqlite" code={`SELECT product, COUNT(*) AS sales FROM purchases GROUP BY product`}/>
//                 <CV mode="text/x-sqlite" code={`SELECT dept, SUM(salary) FROM employees GROUP BY dept`} />
//                 </section>


//                 <section>
//                 <h2>Temporary Tables</h2>
//                 <CV mode="text/x-sqlite" code={`CREATE TEMP TABLE [IF NOT EXISTS] cohort AS [select statement]`}/>
//                 </section>

                
//                 <section>
//                 <h2>Links</h2>
//                 <ul>
//                 <li><a target="_blank" href="https://sqlite.org/lang.html">SQLite Language Reference</a></li>
//                 <li><a target="_blank" href="http://tutlane.com/tutorial/sqlite/sqlite-group-by-clause">GROUP BY Tutorial</a></li>
//                 <li><a target="_blank" href="http://www.sqlitetutorial.net/sqlite-inner-join/">INNER JOIN Tutorial</a></li>
//                 </ul>
//                 </section>

//             </div>
//         </div> 

//     }
// }
