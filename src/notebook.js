import _ from 'lodash'

import React from 'react'
import ReactDOM from 'react-dom'

import BreadLoaf from 'breadloaf'
import { Cell, ArchivedCell } from './cell'
import { DB } from './db/configure'

import * as State from './state'
import * as U from './state/update'

export default class Notebook extends React.PureComponent {
    render(){
        let { notebook, trash, connect, deltas, config } = this.props;
        let show_button = notebook.layout.length > 0 || connect.status === 'connected';
        let db = DB(connect.active);
        let virtualSchema = _.flatMap(notebook.layout, k => k.items)
                .filter(k => k.result && k.result.nameable)
                .map(k => [db.reference(k.name || k.suggestedName), k.result.columns]);

        return <BreadLoaf 
            element={ <Cell 
                forceRenderToken={ notebook.forceRenderToken }
                deltas={deltas} 
                connect={connect} 
                virtualSchema={virtualSchema} 
                config={config[connect.active]}/> }
            layout={notebook.layout}
            updateLayout={ (layout, action, item) => updateLayout(layout, action, item) }
            onMoved={ node => requestAnimationFrame(e => State.apply('notebook', 'forceRenderToken', U.inc)) }
            footer={[
                show_button ? <GinormousAddButton key="super-size-me" /> : null,
                ...trashViewer({ notebook, trash, connect }),
                // db.Clippy ? <db.Clippy key="clippy" connect={connect}/> : null,
                <div className="bottom-spacer" key="bottom-spacer" />
            ]} />
    }
}


function updateLayout(layout, action, item){
    if(action == 'fork' || action == 'close'){
        delete item.name
        delete item.suggestedName
        if(item.result) delete item.result.nameable;
    }

    State.batch(_ => {
        State.apply('notebook', 'layout', U.replace(layout))
        if(action == 'close'){
            // don't add either if it's empty or the same as an existing trashed item
            if(item.query && item.query.trim() && !State.get('trash', 'cells').some(k => k.query.trim() == item.query.trim())){
                State.apply('trash', 'cells', U.prepend(item))
            }
        }
    })  
}


class GinormousAddButton extends React.PureComponent {
    render(){
        return <div className={"fake-row row-1 "} key="add-btn" onClick={ e => addCell() }>
            <span>
                <div className="bread-col">
                    <div className="fake-slice">
                        <div style={{ margin: '-20px 0'}}>+</div>
                    </div>
                </div>
            </span>
        </div>
    }
}


// we need to return an array for react-flip-move, but you can't return
// an array in a real react component, so this is a function which returns
// an array of react elements

function trashViewer({ notebook, trash, connect }){
    if(trash.cells.length == 0) return [];

    let toggler = <div className="bread-row row-1" key="toggler">
        <span>
            <div className="toggler" onClick={e => State.apply('trash', 'open', U.toggle)}>{
                trash.open ? 
                <div><span>▼</span> Collapse Archived Cells ({ trash.cells.length })</div> :
                <div><span>▶</span> Open Archived Cells ({ trash.cells.length })</div>
            }</div>
        </span>
    </div>;

    let trashItems = !trash.open ? [] : trash.cells.map(view => 
        <div className="bread-row row-1 archived-slice" key={view.id}>
            <span>
                <div className="bread-col">
                    <ArchivedCell connect={connect} view={view} />
                </div>
            </span>
        </div>)
    return [ toggler, ...trashItems ]
}



function uuid(){
    return Math.random().toString(36).slice(3, 10)
}

export function isEmpty(){
    return State.get('notebook', 'layout').length === 0;
}

export function addCell(item = {}){
    State.apply('notebook', 'layout', U.append({ rowId: uuid(), items: 
        [ { id: uuid(), query: '', loading: false, ...item } ] }))
}

export function addTrash(item = {}){
    State.apply('trash', 'cells', U.prepend(
        { id: uuid(), query: '', loading: false, ...item } ))
}
