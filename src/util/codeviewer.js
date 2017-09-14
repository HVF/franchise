import React, {Component} from 'react'

import CodeMirror from 'codemirror'
import "codemirror/addon/runmode/runmode"

export default class CodeViewer extends Component {
    componentDidMount(){
        CodeMirror.runMode(this.props.code, this.props.mode, this.node)
    }
    componentDidUpdate(){
        CodeMirror.runMode(this.props.code, this.props.mode, this.node)
    }
    render() {
    	if(this.props.small) return <code className="cm-s-default" ref={d => this.node = d}/>
        return <pre className="cm-s-default" ref={d => this.node = d}/>
    }
}
