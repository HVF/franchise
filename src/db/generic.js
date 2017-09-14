import _ from 'lodash'

import { getDB } from './configure'
import { addCell, isEmpty, addTrash } from '../notebook'
import { getCell } from '../cell'

import * as State from '../state'
import * as U from '../state/update'

export async function connectHelper(initializeDB){
    State.apply('connect', U.merge({
        status: 'connecting',
        error: null
    }))
    try {
        if(initializeDB) await initializeDB();
        State.batch(_ => {
            State.apply('connect', U.merge({ status: 'connected', error: null }))
            State.apply('config', U.merge({ open: false })) 
            if(isEmpty()) addCell();
        })
    } catch (err) {
        console.error(err)
        State.apply('connect', U.merge({ status: 'disconnected', error: err.toString() }))
    }
}

export async function disconnectHelper(destructDB){
    try {
        if(destructDB) await destructDB();
        State.apply('connect', 'status', U.replace('unconfigured'))
    } catch (err) {
        console.error(err)
        State.apply('connect', U.merge({ status: 'disconnected', error: err.toString() }))
    }
}

export async function disconnectDB(){
    await disconnectHelper()
}


async function getCachedSchema(){
    return State.get('connect', 'schema')
}


function tokenizeSQL(sql){
    if(!sql.length) return []
    for(let quote of ['"', '`']) if(sql.startsWith(quote)) {
        const re = new RegExp(`^${quote}(?:[^${quote}\\\\]|\\\\.)*${quote}`)
        const string = sql.match(re)[0]
        return [{type: 'identifier', raw: string}, ...tokenizeSQL(sql.slice(string.length))]
    }
    for(let quote of ['`', '\\$[^\\$]+\\$']) {
        const re = new RegExp(`^${quote}(?:[^${quote}\\\\]|\\\\.)*${quote}`)
        const match = sql.match(re)
        if(!match) continue;

        const string = match[0]
        return [{type: 'string', raw: string}, ...tokenizeSQL(sql.slice(string.length))]
    }
    if(sql.startsWith('--')) {
        const i = sql.indexOf('\n')
        return [{type: 'comment', raw: sql.slice(0,i)}, ...tokenizeSQL(sql.slice(i))]
    }
    let rest = tokenizeSQL(sql.slice(1));
    if(rest.length > 0 && rest[0].type === 'code'){
        return [{ type: 'code', raw: sql[0] + rest[0].raw }, ...rest.slice(1)]
    }else{
        return [{ type: 'code', raw: sql[0] }, ...rest]
    }
}

export function expandQueryRefs(query, cellId){
    let reference = getDB().reference;
    if(!reference) return query;
    if(cellId){
        let cell = getCell(cellId),
            sourceName = (cell.name || cell.suggestedName);
        return _expandQueryRefs(query, { [sourceName]: true })
    }else{
        return _expandQueryRefs(query)
    }
}

function _expandQueryRefs(query, visited={}, queryname){
    var tns = tokenizeSQL(query)
    console.assert(tns.map(k => k.raw).join('') == query)
    let reference = getDB().reference;
    // let [pre, post] = reference('SPLITTER').split('SPLITTER');
    // let refRe = new RegExp(_.escapeRegExp(pre || '') + '\\b(\\w+)\\b' + _.escapeRegExp(post || ''), 'g');
    let reText = _.escapeRegExp(reference('SPLITTER')).replace('SPLITTER', '\\b(\\w+)\\b'),
        reMatch = new RegExp('^' + reText + '$'),
        refRe = new RegExp(reText, 'g')

    const replacer = (all, name) => {
        if(visited[name]) throw new Error('Circular query reference detected. Check '+reference(name)+'.')
        visited[name] = true
        const subquery = getNamedQuery(name)
        if(!subquery) throw new Error(`${reference(name)}${queryname ? ' (referenced in ' + reference(queryname) +')' : ''} does not exist.`)
        return '(\n' + _expandQueryRefs(subquery, visited, name) + '\n) AS "' + reference(name) + '"'    
    }
    return tns.map(token => {
        let {type, raw} = token

        if(type === 'identifier'){
            let ident = reMatch.exec(raw.slice(1, -1));
            if(ident) return replacer('', ident[1]);
        }
        if(type !== 'code') return raw;
        return raw.replace(refRe, replacer)
    }).join('')
}

function getNamedQuery(name){
    let allCells = State.getAll('notebook', 'layout', U.each, 'items', U.each);
    for(let cell of allCells){
        if(!(cell.result && cell.result.nameable)) continue;
        if(cell.name ? (cell.name === name) : (cell.suggestedName === name)){
            return cell.result.query;
        }
    }
}



export async function assignSuggestedName(result){
    if(!result.ast) return;
    let ast = result.ast;
    if(!(ast.statement.length === 1 && ast.statement[0].variant === 'select')) return;

    let allCells = State.getAll('notebook', 'layout', U.each, 'items', U.each);
    let next_index = 1;
    for(let view of allCells){
        for(let name of [view.name, view.suggestedName]){
            let m = /^query(\d+)$/.exec(name);
            if(m) next_index = Math.max(parseInt(m[1])+1, next_index);    
        }
    }

    let nextQueryName = 'query'+next_index;

    result.suggestedName = nextQueryName;
    result.nameable = true;
}


export async function extractEditableColumns(result, getSchema = getCachedSchema){
    if(!result.ast) return;
    if(!result.columns) return;
    let stmt = result.ast.statement[0];
    if(!(stmt.variant === 'select' && stmt.from && stmt.from.type === 'identifier')) return;
    let table_from = stmt.from.name;
    if(stmt.with) return;
    let columns = [];
    for(let col of stmt.result){
        if(col.type === 'identifier' && col.variant === 'column'){
            let alias = col.alias || col.name;
            if(alias == 'oid' || alias == '_rowid_') alias = 'rowid';
            if(alias != result.columns[columns.length]){
                console.error("annotateEditable is broken for this query " + alias + " != " + result.columns[columns.length]);
                return
            }
            columns.push({
                alias: alias,
                name: col.name,
                editable: true
            })
        }else if(col.type === 'identifier' && col.variant === 'star' 
            && (col.name == '*' || col.name == table_from + '.*') ){
            let schema = await getSchema();
            let tableSchema = schema.find(k => k.name.toLowerCase() == table_from.toLowerCase());
            if(!tableSchema){
                console.error(`could not find table '${table_from}' in schema including ${JSON.stringify(schema.map(k => k.name))}`)
                return
            }
            for(let star_col of tableSchema.columns){
                if(star_col != result.columns[columns.length]){
                    console.error("annotateEditable is broken for this query " + star_col +  " != " + result.columns[columns.length]);
                    return
                }
                columns.push({
                    alias: star_col,
                    name: star_col,
                    editable: true
                })

            }
        }else{
            columns.push({
                alias: col.name,
                editable: false
            })
        }
    }

    if(result.columns.length != columns.length){
        console.error("annotateEditable is broken for this query")
        console.log(result.columns, columns)
        return
    }

    result.editableColumns = columns.map(col => col.editable ? col.name : null)
    result.tableName = table_from;
}

function matchRowPredicate(delta, template){
    return delta.tableName === template.tableName 
        && delta.rowPredicate === template.rowPredicate
        && delta.column === template.column
}

export function getStagingValue(deltas, oldValue, result, rowIndex, colIndex, db, config){
    if(!result.editableColumns) return oldValue;
    if(deltas.changes.length == 0) return oldValue;

    let template = {
        tableName: result.tableName,
        rowPredicate: db.assembleRowPredicate(result, rowIndex, config),
        column: result.editableColumns[colIndex]
    }

    let matchingChange = deltas.changes.find(k => matchRowPredicate(k, template))
    if(matchingChange) return matchingChange.newValue;
    return oldValue;
}

export async function updateStagingValue(newValue, result, rowIndex, colIndex, config){
    let rowPredicate = getDB().assembleRowPredicate(result, rowIndex, config);
    let countResult = await getDB().run(`SELECT COUNT(*) FROM ${getDB().escapeIdentifier(result.tableName, config)} WHERE ` + rowPredicate)
    console.log('countResult', rowPredicate, countResult)
    if(+countResult.values[0][0] !== 1) throw new Error("Unable to uniquely identify changed row.");
    let oldValue = result.values[rowIndex][colIndex];
    let nuDelta = {
        tableName: result.tableName,
        rowPredicate: rowPredicate,
        column: result.editableColumns[colIndex],
        newValue: newValue
    };
    State.apply('deltas', 'changes', deltas =>
        deltas.filter(k => !matchRowPredicate(k, nuDelta)).concat(
            nuDelta.newValue === oldValue ? [] : [ nuDelta ]));
    if(State.get('deltas', 'changes').length == 0)
        State.apply('deltas', U.merge({ error: null, open: false }));
}

export function assembleDeltaQuery(deltas, config){
    return _.map(_.groupBy(deltas.changes, k => k.tableName), (changes, table) => 
        `-- ${table}\n` + 
        _.map(_.groupBy(changes, k => k.rowPredicate), (changes, rowPredicate) => 
                `UPDATE ${getDB().escapeIdentifier(table, config)} SET \n` +
                changes.map((change, i) => 
                    '\t' + getDB().escapeIdentifier(change.column, config) + ' = ' + getDB().escapeValue(change.newValue)
                ).join(',\n') + `\nWHERE ${rowPredicate};`
            ).join('\n\n')
    ).join('\n\n')
}


export function create_table_snippet(){
    return `DROP TABLE IF EXISTS new_table; 
CREATE TABLE new_table (id integer, name text);
INSERT INTO new_table VALUES (1, 'WOW');`;
}

function escape_table_name(table){
    const { escapeIdentifier } = getDB()
    return ((table.schema && table.schema != 'public')
        ? escapeIdentifier(table.schema)+'.'
        : '') + escapeIdentifier(table.name);
}

export function select_table_snippet(table){
    const { escapeIdentifier } = getDB()
    let table_name = escape_table_name(table)
    if(table.columns.length < 5) return 'SELECT ' + table.columns.map(escapeIdentifier).join(', ') + ' FROM ' + table_name + ' LIMIT 1000'
    return 'SELECT\n' + table.columns.map(e => '    '+escapeIdentifier(e)).join(', \n') + '\nFROM ' + table_name + '\nLIMIT 1000'
}



