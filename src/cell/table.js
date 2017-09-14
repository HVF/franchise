import React from 'react'
import ReactDOM from 'react-dom'

import { Table, Column, Cell, ColumnHeaderCell, EditableName, TableLoadingOption, EditableCell, TruncatedFormat } from '@blueprintjs/table';
import { Intent, Menu, MenuItem, Switch } from '@blueprintjs/core';
import { DB } from '../db/configure.js'

import _ from 'lodash';
import swal from 'sweetalert2'


export class TableVisualizer extends React.Component {
    static desc = "Table View";
    static key = 'table';
    static icon = 
        // <span className="pt-icon-standard pt-icon-th"></span>;
        <i className="fa fa-table" aria-hidden="true"></i>;

    static test(result){
        return result.columns.length > 0
    }

    render(){
        let { result, view, deltas, connect, config } = this.props;
        let db = DB(connect.active);

        function castNull(x){
            if(x === null) return ''
            return x + '';
        }

        function isColumnEditable(colIndex){
            if(!result.tableName) return false;
            if(!result.editableColumns) return false;
            if(!db.getStagingValue) return false;
            if(!db.updateStagingValue) return false;
            if(connect.status != 'connected') return false;

            return result.editableColumns[colIndex]
        }

        function isColumnSortable(colIndex){
            if(!result.tableName) return false;
            if(!result.editableColumns) return false;
            if(!db.getStagingValue) return false;
            if(!db.updateStagingValue) return false;
            if(connect.status != 'connected') return false;

            return true
        }

        function renderCell(rowIndex, colIndex){
            let raw_value = result.values[rowIndex][colIndex];

            if(!isColumnEditable(colIndex)){
                return <Cell>
                    <TruncatedFormat>{castNull(raw_value)}</TruncatedFormat>
                </Cell>
            }
            let changed_value = db.getStagingValue(deltas, raw_value, result, rowIndex, colIndex, db, config);
            return  <EditableCellWrapper 
                loading={view.loading}
                value={castNull(changed_value)}
                intent={changed_value != raw_value ? Intent.WARNING : null}
                onConfirm={async (value) => 
                    await db.updateStagingValue(value, result, rowIndex, colIndex, config)} />
        }

        return <Table 
            numRows={result.values.length} 
            getCellClipboardData={(row, col) => castNull(result.values[row][col])}
            loadingOptions={
                view.loading ? [TableLoadingOption.CELLS, TableLoadingOption.COLUMN_HEADERS, TableLoadingOption.ROW_HEADERS] : []
            }>{
                result.columns.map((name, colIndex) => 
                    <Column name={name} key={name} 
                        renderColumnHeader={(colIndex) => 
                            <ColumnHeaderCell
                                // renderMenu={isColumnSortable(colIndex) ? ((cellIndex) => <Menu>
                                //     <MenuItem iconName="sort-asc" onClick={e => {


                                //         console.log('sort ascending', result)
                                //     }} text="Sort Asc" />
                                //     <MenuItem iconName="sort-desc" text="Sort Desc" />
                                // </Menu>) : null} 
                                name={result.columns[colIndex]} 
                                renderName={name => <div className="bp-table-truncated-text"> 
                                        {isColumnEditable(colIndex) ? <i className="fa-pencil fa editable-icon" /> : null} {name} </div>}  />}
                        renderCell={renderCell} />)
            }</Table>
    }
}

class EditableCellWrapper extends React.Component {
    state = {}
    componentWillReceiveProps(){
        this.setState({ loading: false })
        clearTimeout(this.cancelTimeout)
    }
    render(){
        return <EditableCell 
            {...this.props}
            loading={this.state.loading || this.props.loading}
            onCancel={e => {
                clearTimeout(this.cancelTimeout)
                this.setState({ loading: false })
            }}
            onConfirm={async (value, rowIndex, colIndex) => {
                clearTimeout(this.cancelTimeout)
                if(value === this.props.value){
                    this.setState({ loading: false }) // cancel
                }else{
                    this.setState({ loading: true })
                    this.cancelTimeout = setTimeout(k => this.setState({ loading: false }), 5000)

                    try {
                        await this.props.onConfirm(value, rowIndex, colIndex)
                    } catch (err) { 
                        // immediately invoking swal causes it to be automatically dismissed
                        // when runCell is triggered by Cmd-Enter
                        requestAnimationFrame(_ => swal(
                            'Oops...',
                            err.message,
                            'error'
                        ))
                    }
                    clearTimeout(this.cancelTimeout)
                    this.setState({ loading: false })
                }
            }}  />
    }
}





import { Slider, Button, EditableText } from '@blueprintjs/core'

export class CardVisualizer extends React.Component {
  static key = 'single-row';
  static desc = "Card View";
  static icon = 
    <i className="fa fa-vcard-o" aria-hidden="true"></i>;

  state = { page: 0, inserting: false, hideNull: true }
  static test(result){
    return result.values.length >= 1 && result.columns.length >= 1
  }

  render(){
    let { result, view, connect, deltas, config } = this.props;
    let db = DB(connect.active);
    let rowIndex = this.state.page;
    let {hideNull} = this.state;

    function isColumnEditable(colIndex){
        if(!result.tableName) return false;
        if(!result.editableColumns) return false;
        if(!db.getStagingValue) return false;
        if(!db.updateStagingValue) return false;
        if(connect.status != 'connected') return false;

        return result.editableColumns[colIndex]
    }

    function stringifyValue(value){
        if(typeof value === 'object') return JSON.stringify(value);
        return value + ''
    }

    function renderRow(field, colIndex, rowIndex){
        if(hideNull && !(getStagingValue(rowIndex, colIndex) || getRawValue(rowIndex, colIndex))) return null

        return <tr key={field + rowIndex}>
            <th>{field} {isColumnEditable(colIndex) ? <i className="fa-pencil fa editable-icon" style={{ color: '#bbb' }} /> : null}</th>
            <td>{renderValue(rowIndex, colIndex)}</td>
        </tr>
    }

    function getRawValue(rowIndex, colIndex){
        if(!result.values[rowIndex]) return "ERROR";
        return result.values[rowIndex][colIndex]
    }

    function getStagingValue(rowIndex, colIndex){
        return db.getStagingValue(deltas, getRawValue(rowIndex, colIndex), result, rowIndex, colIndex, db, config);
    }

    console.log('config',config)

    function renderValue(rowIndex, colIndex){
        let changed_value = getStagingValue(rowIndex, colIndex)
        let raw_value = getRawValue(rowIndex, colIndex);

        if(!isColumnEditable(colIndex)){
            return <span className="field-value">{stringifyValue(raw_value)}</span>
        }

        return <EditableText 
            multiline
            defaultValue={stringifyValue(changed_value || '')}
            intent={changed_value != raw_value ? Intent.WARNING : null}
            onConfirm={value => {
                if(value != changed_value) 
                    db.updateStagingValue(value, result, rowIndex, colIndex, config);
            }} />
    }

    let insertable = result.tableName && result.editableColumns.length > 0;
    // <Switch checked={this.state.hideNull} label="Hide Nulls" onChange={e => this.setState({ hideNull: !this.state.hideNull }) } />
    return <div className={"single-row " + (view.loading ? 'result-loading ' : '')}>
      <div style={{ paddingBottom: 15, padding: 5, display: 'flex' }}>
        <Slider 
            disabled={result.values.length < 2 || this.state.inserting}  
            min={1} max={result.values.length} 
            value={rowIndex + 1} 
            labelStepSize={Math.max(1, Math.floor(result.values.length / 10))}
            onChange={e => this.setState({ page: e - 1 })} />
        {insertable ? <div style={{ paddingLeft: 20 }}>
            <Button 
                iconName="add" 
                active={this.state.inserting} 
                onClick={e => this.setState({ inserting: !this.state.inserting })}>Insert</Button>
        </div> : null}
      </div> 
      
      { (this.state.inserting && insertable && connect.schema.find(k => k.name == result.tableName))
        ? <table>
            <tbody>{
              connect.schema.find(k => k.name == result.tableName)
                .columns.map((field, colIndex) => <tr key={field + rowIndex}>
                <th>{field}</th>
                <td>[Insertion Not Yet Supported]</td>

              </tr>)
            }</tbody>
          </table>
        : <table>
            <tbody>{
              result.columns.map((field, colIndex) => renderRow(field, colIndex, rowIndex))
            }</tbody>
          </table>}
    </div>
  }
}


export class PivotVisualizer extends React.Component {
    static key = 'pivot';
    static desc = "Pivot Table";
    static icon = 
        <span className="pt-icon-standard pt-icon-pivot-table"></span>;
    
    static test(result){
        if(!result.ast) return false;
        if(!result.ast.statement) return false;
        if(result.ast.statement.length != 1) return false;
        let stmt = result.ast.statement[0];
        if(stmt.variant != 'select') return false;
        if(!stmt.group) return false;
        let grup = stmt.group;
        if(grup.variant != 'list') return false;
        
        const pivotIndices = [];
        result.columns.forEach((r, i) => {
            if(groupAxes.some(k => k.toLowerCase() === r.toLowerCase())) pivotIndices.push(i)
        })
        return pivotIndices.length == 2
    }
    render(){
        let { result, view, connect, deltas } = this.props;
        let db = DB(connect.active);

        let stmt = result.ast.statement[0];
        let grup = stmt.group;
        let groupAxes = grup.expression.map(k => k.name);

        let valIndices = [],
            pivotIndices = [];
        result.columns.forEach((r, i) => {
            if(groupAxes.some(k => k.toLowerCase() === r.toLowerCase())){
                pivotIndices.push(i)
            }else{
                valIndices.push(i)
            }
        })

        pivotIndices = pivotIndices.map(pivot => ({
            name: result.columns[pivot],
            index: pivot,
            values: _.uniq(result.values.map(k => k[pivot]))
        }))
        

        if(pivotIndices.length != 2){
            return <div className="single-row">
                Currently only 2 axis pivot tables are supported.
            </div>
        }

        function getPivotValue(xPivot, yPivot){
            let match = result.values.find(k => 
                    k[pivotIndices[0].index] === yPivot &&
                    k[pivotIndices[1].index] === xPivot)
            if(match) return valIndices.map(k => {
                let val = match[k]
                if(parseFloat(val)) return val.toFixed(2);
                return val
            }).join(', ');
            return ''
        }

        return <div className="pivot-visualizer"><table className="pt-table pt-bordered">
            <thead><tr><td />{pivotIndices[1].values.map(xPivot => <th>{xPivot}</th>)}</tr></thead>
            <tbody>{
                pivotIndices[0].values.map(yPivot => <tr>
                    <td><b>{yPivot}</b></td>
                    {
                    pivotIndices[1].values.map(xPivot => <td>
                        { getPivotValue(xPivot, yPivot) }
                    </td>)
                }</tr>)
            }</tbody></table></div>
    }
}
