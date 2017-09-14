import React from 'react'
import ReactDOM from 'react-dom'

import * as State from '../state'
import * as U from '../state/update'

import ReactCodeMirror from '@skidding/react-codemirror'
import CodeMirror from 'codemirror'

// import 'codemirror/mode/sql/sql'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/markdown/markdown'
import 'codemirror/keymap/sublime'

import 'codemirror/addon/display/placeholder'
import 'codemirror/addon/comment/comment'
import 'codemirror/addon/comment/continuecomment'

import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/selection/active-line'
import 'codemirror/addon/search/match-highlighter'

import './prediction'

import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/hint/show-hint'
import './sql-hint'

import 'codemirror/addon/display/placeholder'

import './md.less'

import { EditableText } from '@blueprintjs/core'

import swal from 'sweetalert2'

import { addCell } from '../notebook'
import { DB, getDB } from '../db/configure'
// import { ResultVisualizer } from './visualizer'
import _ from 'lodash'


import { Intent, Popover, Position, Switch, Tooltip as BlueprintTooltip } from "@blueprintjs/core";

function Tooltip(props){
    return <BlueprintTooltip 
        position={Position.RIGHT}
        tetherOptions={{constraints: [{ attachment: "together", to: "scrollParent" }]}} 
        {...props} />
}

export class Cell extends React.PureComponent {
    shouldComponentUpdate(nextProps){
        return nextProps.view !== this.props.view 
            || nextProps.connect !== this.props.connect
            || nextProps.deltas !== this.props.deltas
            || nextProps.forceRenderToken !== this.props.forceRenderToken
    }

	componentDidMount(){
        var cm = this.cmr.getCodeMirror();
        var el = document.createElement('span')
        cm.addWidget({ line: 0, ch: 0 }, el, false)
        el.style.left = ''
        el.style.top = ''
        el.style.position = ''
        el.className = 'slice-editor-widget'
        this.widget = el;
        this.componentDidUpdate()
    }

    componentDidUpdate(){
        ReactDOM.render(<SnippetWidget 
            updateView={e => this.props.updateView(e)}
            view={this.props.view}
            cmr={this.cmr}
            connect={this.props.connect}
            config={this.props.config} />, this.widget)
    }

    render(){
        let { view, updateView, connect, deltas, virtualSchema, config } = this.props;
        let db = DB(connect.active);
        let fresh = ((view.result && view.result.query) || '').trim() === (view.query || '').trim() 
            || view.error || (view.query || '').trim() === '' || view.loading || connect.status != 'connected';

        // let reference = options.referenceFn || (s => '#' + s);
        let hintRefRe = new RegExp(_.escapeRegExp(db.reference('SPLITTER')).replace('SPLITTER', '\\b(\\w*)\\b'))
        let modeRefRe = new RegExp('^' + _.escapeRegExp(db.reference('SPLITTER')).replace('SPLITTER', '(\\w*)'))

        const sql_options = {
            mode: db.syntax || 'text/plain',
            theme: 'hipster',
            // continueComments: true,
            highlightSelectionMatches: {
                // showToken: /\w/,
                trim: true
            },
            lineWrapping: true,
            extraKeys: {
                'Cmd-Enter': (cm) => runCell(view.id),
                'Ctrl-Enter': (cm) => runCell(view.id),
                "Ctrl-Space": "autocomplete"
            },
            // styleActiveLine: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            addModeClass: true,
            // referenceFn: db.reference,
            refRe: modeRefRe,
            placeholder: connect.status == 'connected' ? "Type query here, or click a bubble below." : '',

            showPredictions: /sql/i.test(db.syntax) ? true : false,

            hintOptions: /sql/i.test(db.syntax) ? {
              hint: CodeMirror.hint.sql,
              // referenceFn: db.reference,
              refRe: hintRefRe,

              tables: _.fromPairs((connect.schema || []).map(k => [k.name, k.columns]).concat(virtualSchema)),
            } : null,

            keyMap: "sublime",
        }

        const md_options = {
            mode: 'markdown',
            keyMap: "sublime",
            lineWrapping: true,
            theme: 'md',
            placeholder: 'Type Markdown here...',
            showPredictions: false
        }

        let md = view.markdown;

        return <div className='slice-wrap'>
            <div className={'slice ' + ((fresh || md) ? 'fresh ' : 'stale ') + (md ? 'markdown ' : 'code ')}>
                <div className='input-wrap'>
                    <ReactCodeMirror 
                        value={view.query} 
                        key='a'
                        ref={e => this.cmr = e}
                        onChange={query => updateView({ query: query })} 
                        options={md ? md_options : sql_options } />
                    
                    <BlueprintTooltip
                        content={<span>Refer to the results of this cell with <strong>{db.reference(view.name || view.suggestedName)}</strong></span>}
                        className="pt-tooltip-indicator">
                        <div className={"name " + ((view.result && view.result.nameable && db.reference) ? "shown" : "")} >
                            <span style={{color: '#adb7bf'}}>{db.reference('SPLITTER').split('SPLITTER')[0] || ''}</span>
                            <EditableText
                                value={view.name}
                                onChange={ name => updateView({ name: name.replace(/[^\w]/g, '') }) }
                                placeholder={view.suggestedName}
                                minWidth={30} />
                            <span style={{color: '#adb7bf'}}>{db.reference('SPLITTER').split('SPLITTER')[1] || ''}</span>
                        </div>
                    </BlueprintTooltip>

                    <div className='controls' onMouseDown={this.props.beginDrag}>
                        <Tooltip content="Archive Cell">
                            <button onClick={this.props.close} title="Archive Cell">
                                <i className="fa fa-close" aria-hidden="true"></i>
                            </button>
                        </Tooltip>
                        
                        {md ? null : <Tooltip content="Clone Cell">
                            <button onClick={this.props.fork}>
                                <i className="fa fa-clone" aria-hidden="true"></i>
                            </button>
                        </Tooltip>}

                        <div className="spacer" />
                        {md ? null :
                        (connect.status === 'connected' ? <Tooltip content="Run Query (Cmd-Enter)" intent={Intent.SUCCESS}>
                            <button onClick={ e => runCell(view.id) }>
                                {view.loading ?
                                    <i className="fa fa-gear fa-spin" aria-hidden="true"></i> :
                                    <i className={"fa fa-play " + ((view.query || '').trim() ? 'runnable' : '')} aria-hidden="true"></i>
                                }
                            </button>
                        </Tooltip>  : <Tooltip content="No database connected" intent={Intent.WARNING}>
                            <button title="No database connected" data-tip="No database connected" onClick={ e => runCell(view.id) }>
                                <i className="fa fa-exclamation-triangle" aria-hidden="true"></i>
                            </button>
                        </Tooltip>
                            )}
                    </div>
                </div>
                {md ? null
                : view.error ? 
                    <div className="error">{view.error}</div> : 
                    (view.result ? <ResultVisualizerLoader
                        view={view}
                        deltas={deltas}
                        connect={connect}
                        forceRenderToken={this.props.forceRenderToken}
                        config={config}
                        updateView={updateView}
                        beginDrag={this.props.beginDrag} 
                        result={view.result} /> : null)}
            </div>
        </div>
    }
}

// './visualizer'
var VisualizerModule, VisualizerReadyQueue = [];
setTimeout(async function(){
    VisualizerModule = await import('./visualizer');
    while(VisualizerReadyQueue.length > 0){
        try {
            VisualizerReadyQueue.pop()()
        } catch (err) {}
    }
}, 0)

class ResultVisualizerLoader extends React.PureComponent {
    componentWillUpdate(){
        this.checkModule()
    }
    componentWillMount(){
        this.checkModule()
    }
    checkModule(){
        if(!VisualizerModule){
            VisualizerReadyQueue.push(e => 
                this.setState({ visualizer: VisualizerModule }))
        }
    }
    render(){
        if(VisualizerModule){
            return <VisualizerModule.ResultVisualizer {...this.props} />
        }
        return <div className="visualizer-loading">
            <i className="fa fa-circle-o-notch fa-spin  fa-fw"></i> Loading...
        </div>;
    }
}


export function cellById(cellId){
    return ['notebook', 'layout', U.each, 'items', U.id(cellId)]
}

export function updateCell(cellId, update){
    State.apply(...cellById(cellId), U.merge(update))
}

export function getCell(cellId){
    return State.get(...cellById(cellId))
}

export async function runCell(cellId){
    if(getCell(cellId).markdown) return;

    if(State.get('connect', 'status') !== 'connected'){
        // immediately invoking swal causes it to be automatically dismissed
        // when runCell is triggered by Cmd-Enter
        requestAnimationFrame(_ => swal(
            'Oops...',
            "No database connected! Please connect to a database before running queries. ",
            'error'
        ))
        return
    }

	updateCell(cellId, { loading: true })
	try {
        let cell = getCell(cellId)
		var result = await getDB().run(cell.query, cellId);
		updateCell(cellId, { 
            loading: false, 
            result: result, 
            error: null,
            suggestedName: cell.suggestedName || result.suggestedName,
        })
	} catch (err) {
		updateCell(cellId, { loading: false, result: null, error: err.message })
	}
}

import { Select } from "@blueprintjs/labs";
import { Classes, MenuItem } from "@blueprintjs/core";


function SnippetWidget({ connect, view, cmr, updateView, config }){
    let db = DB(connect.active);
    var is_empty = (view.query || '').trim() === '';
    
    if(!connect.schema) return null;
    if(connect.status !== 'connected') return null;
    if(view.markdown) return null;
    
    function replaceText(text, tokenize = false){
        let cm = cmr.getCodeMirror()
        updateView({ query: text })
        cm.setValue(text)

        if(tokenize){
            let markMap = {}
            for(let [start, end, text] of derange(/(\".*?\")/g, text)){
                let el = document.createElement('span')
                el.innerText = text
                el.className = 'schema-token'
                let mark = cm.markText(cm.posFromIndex(start), cm.posFromIndex(end), {
                    atomic: true,
                    replacedWith: el
                })
                if(!markMap[text]) markMap[text] = [];
                markMap[text].push(mark);

                el.onclick = function(){
                    let pos = mark.find()
                    cm.setSelections(markMap[text].map(k => { let p = k.find(); return { anchor: p.from, head: p.to } }))
                    cm.focus()
                }
            }    
        }
        

        cm.setCursor(1e8, 1e8)
        cm.focus()
    }
    let visible_schema = connect.schema.filter(k => !(k.schema && k.schema.startsWith('_')) );
    
    return <div className={'slice-editor-widget ' + (is_empty ? 'slice-visible' : 'slice-hidden')}>{
        visible_schema.length > 8 ? 
            _.map(_.groupBy(connect.schema, 'schema'), (k, i) => 
                <Select
                    key={i}
                    items={k}
                    noResults={<MenuItem disabled text="No results." />}
                    onItemSelect={film => setTimeout(j => replaceText(db.select_table_snippet(film, config)), 0)}
                    itemPredicate={(query, film, index) => film.name.toLowerCase().indexOf(query.toLowerCase().trim()) != -1}
                    itemRenderer={({ handleClick, item: film, isActive }) => (
                        <MenuItem
                            className={isActive ? Classes.ACTIVE : ""}
                            key={film.name}
                            onClick={handleClick}
                            label={film.columns.join(', ')}
                            text={film.name}
                        />
                    )}>
                    <div className="token">
                        {i || 'default'}
                        <span className="pt-icon-standard pt-icon-caret-down"></span>
                    </div> 
                </Select>
            ) : visible_schema.map(table => 
            <BlueprintTooltip key={table.name} 
                content={table.columns.join(', ')} 
                position={Position.BOTTOM} 
                intent={Intent.PRIMARY}>
                <div className="token" 
                    onClick={e => replaceText(db.select_table_snippet(table, config)) }
                >{table.name}</div>
            </BlueprintTooltip>
        )}
        <BlueprintTooltip content={"Create Table"} position={Position.BOTTOM} intent={Intent.WARNING}>
            <div className="token create-table" 
                    onClick={e => replaceText(db.create_table_snippet(connect.schema), true) }>
                    <span className="pt-icon-standard pt-icon-plus"></span>
                </div>
        </BlueprintTooltip>

        <BlueprintTooltip content={"Convert to Markdown Cell"} position={Position.BOTTOM}>
            <div className="token create-text" 
                    onClick={e => {
                        updateView({ markdown: true })
                        // this works around a bug in the codemirror placeholder library
                        // which doesn't update placeholder text if the thing has focus
                        requestAnimationFrame(e => {
                            let cm = cmr.getCodeMirror()
                            cm.setCursor(1e8, 1e8)
                            cm.focus()    
                        })
                    } }>
                    <i className="fa fa-comment"></i>
                </div>
        </BlueprintTooltip>
    </div>
}


// code originally written for hypernote
function derange(re, text){
    var match, ranges = [], pos = 0;
    while(match = re.exec(text)){
        ranges.push([match.index, re.lastIndex, match[1]])
    }
    return ranges;
}

function rangesub(ranges, replaceWith){
    var offset = 0;
    ranges.sort((a, b) => a[0] - b[0])
    for(var i = 0; i < ranges.length; i++){
        var [start, end, sub] = ranges[i];
        offset += replaceWith(start + offset, end + offset, sub) - (end - start)
    }
}

function rangesubtext(ranges, text, replacer){
    rangesub(ranges, (start, end, sub) => {
        var flag = replacer(sub)
        text = text.slice(0, start) + flag + text.slice(end)
        return flag.length
    })
    return text;
}




export class ArchivedCell extends React.PureComponent {
	render(){
		let { view, connect } = this.props;
        let db = DB(connect.active);
        
	    return <div className='slice-wrap'>
	        <div className='slice'>
	            <div className='input-wrap'>
	                <ReactCodeMirror 
	                    value={view.query} 
	                    options={{
	                        readOnly: true,
	                        mode: db.syntax || 'text/plain',
	                        theme: 'hipster',
                            addModeClass: true,
	                        lineWrapping: true
	                    }} />
	                <div className='controls'>
                        <Tooltip content="Unarchive">
    	                    <button onClick={e => untrashCell(view.id)}>
    	                        <i className="fa fa-level-up" aria-hidden="true"></i>
    	                    </button>
                        </Tooltip>
                        <Tooltip content="Remove Permanently" intent={Intent.DANGER}>
    	                    <button onClick={e => removeTrash(view.id)}>
    	                        <i className="fa fa-trash" aria-hidden="true"></i>
    	                    </button>   
                        </Tooltip>
	                </div>
	            </div>
	        </div>
	    </div>
	}
}



function removeTrash(cellId){
	State.batch(_ => {
		State.apply('trash', 'cells', U.removeId(cellId))	

		if(State.get('trash', 'cells').length === 0){
			State.apply('trash', 'open', U.replace(false))
		}
	})
}

function untrashCell(cellId){
	State.batch(_ => {
		let cell = State.get('trash', 'cells', U.id(cellId))
		removeTrash(cellId)
		addCell(cell)
	})
}


