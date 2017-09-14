import _ from 'lodash'
import React from 'react'

import { addTrash } from './notebook'
import { runCell } from './cell'

import * as State from './state'
import * as U from './state/update'

import { DB, getDB } from './db/configure'
import { UnmountClosed } from 'react-collapse';


export default function DeltaPane({ deltas, connect }){
    if(deltas.changes.length === 0) return null;
    if(connect.status !== 'connected') return null;

    return <div className="write-queue">
        <UnmountClosed isOpened={deltas.open}>
            <DeltaReview deltas={deltas} />
        </UnmountClosed>
        
        { deltas.loading ? <div>
            <span style={{ paddingRight: 10 }}><i className="fa fa-gear fa-spin  fa-fw"></i> </span>
            Applying changes...
        </div> : 
        <div className="toggle-delta" onClick={e => State.apply('deltas', 'open', U.toggle)}>{
            deltas.open ? 
            <div><span>▲</span> Collapse Pending Changes ({ deltas.changes.length })</div> :
            <div><span>▶</span> Review Pending Changes ({ deltas.changes.length })</div>
        }</div> }
    </div>
}

function DeltaReview({ deltas }){    
    return <div className="collapse">

        <button type="button" className="pt-button pt-intent-warning" 
            style={{
                float: 'right'
            }}
            onClick={e => applyDeltas()}>
            Apply Changes
            <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
        </button>

        <div>
            {deltas.error ? <div className="error">{deltas.error}</div> : null }

            {_.map(_.groupBy(deltas.changes.map((k, i) => ({ ...k, index: i })), k => k.tableName), (changes, table) => <div key={table}>
                    <strong>{table}</strong>
                    {_.map(_.groupBy(changes, k => k.rowPredicate), (changes, rowPredicate) => 
                        <div key={rowPredicate} className='changes'>
                            <div style={{color: '#aaa', marginBottom: 10}}>UPDATE "{table}" SET </div>
                            {_.sortBy(changes, 'column').map((change, i) => <div key={i} className="change">
                                <button onClick={e => {
                                    State.apply('deltas', 'changes', U.removeIndex(change.index))
                                    if(State.get('deltas', 'changes').length == 0)
                                        State.apply('deltas', U.merge({ error: null, open: false }));
                                }}><i className="fa fa-times" aria-hidden="true" /></button>
                                "{change.column}" = '{change.newValue}' 
                                {i < changes.length - 1 ? <span style={{color: '#aaa'}}>,</span> : null }
                            </div>)}
                            <div style={{color: '#aaa', marginTop: 10}}>{'\n'}WHERE {rowPredicate};</div>
                        </div>)}
                </div>)}
        </div>    
    </div>    
}


export async function applyDeltas(){
    State.apply('deltas', U.merge({ error: null, open: false, loading: true }))

    let affectedTables = _.uniq(State.get('deltas', 'changes').map(k => k.tableName));
    let affectedCells = State.getAll('notebook', 'layout', U.each, 'items', U.match(k => 
        k.result && affectedTables.includes(k.result.tableName)), 'id');

    let db = getDB();
    let query = db.assembleDeltaQuery(State.get('deltas'), {useLegacySql: false});
    try {
        await db.run(query);
    } catch (err) {
        State.apply('deltas', U.merge({ error: err.message, open: true, loading: false }))
        return
    }

    await State.batch(async () => {
        State.apply('deltas', U.merge({ changes: [], loading: false }))
        addTrash({ query: query })
        await Promise.all(affectedCells.map(cellId => runCell(cellId)))    
    })
}
