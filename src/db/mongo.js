import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import _ from 'lodash'

export const key = 'mongo'
export const name = "MongoDB"
export const syntax = 'javascript'

// import mingo from 'mingo'

import { connectHelper, disconnectDB } from './generic'
export { disconnectDB } from './generic'

export function Configure({ config, connect }) {
    return <div>
        <h2>MongoDB</h2>
        <p>
            Mongo wongo dongo flongo
        </p>
        <p>
        { connect.status != 'connected' ? 
            (connect.status == 'connecting' ? 
                <button disabled type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
                    Connect
                    <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
                </button> :
                <button type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
                    Connect
                    <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
                </button> ) :
            <button type="button" className="pt-button pt-large  pt-intent-danger" onClick={e => disconnectDB()}>
                    Disconnect
                    <span className="pt-icon-standard pt-icon-offline pt-align-right"></span>
                </button> }
        </p>
    </div>
}


export function create_table_snippet(){
    return `db.createCollection("new_table");`;
}

export function select_table_snippet(table){
    // return 'select ' + table.columns.map(e => '"' + e + '"').join(', ') + ' from "' + table.name + '"'
}

async function getSchema(){
    let db = State.get('connect', '_db');
    return db._collections.map(tableName => ({
        name: tableName,
        columns: []
    }))
}


class Collection {
    _items = [];

    find(query, projection){
        let q = new mingo.Query(query);
        return q.find(this._items, projection)
    }
    insert(doc){
        return Array.isArray(doc) ? this.insertMany(doc) : this.insertOne(doc)
    }
    insertOne(doc){
        this._items.push(doc)
    }
    insertMany(docs){
        docs.forEach(doc => this.insertOne(doc))
    }
}

class Database {
    _collections = []
    createCollection(name){
        this[name] = new Collection()
        this._collections.push(name)
    }
}


export async function run(query){
    var db = State.get('connect', '_db')
    let result = formatResults(eval(query))
    result.query = query;
    State.apply('connect', 'schema', U.replace(await getSchema()))
    return result;
}


function formatResults(data){
    if(data === undefined){
        return { }
    }
    return {
        columns: ['one', 'two', 'three'],
        values: [[1,2,3], [4,5,6], [7,8,9], [10,11,12]]
    }
}

async function connectDB(picker){
    await connectHelper(async function(){
        State.apply('connect', '_db', U.replace(new Database))
        State.apply('connect', 'schema', U.replace(await getSchema()))
    })
}


