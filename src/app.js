import _ from 'lodash'
import React from 'react'

import * as State from './state'
import * as U from './state/update'

import './app.less'

import Configure from './db/configure'
import Notebook from './notebook'
import DeltaPane from './delta'
import ExportButton from './state/export'
import HelpPage from './db/help'

export default class App extends React.PureComponent {
    componentWillMount(){
        document.getElementById('loader').style.display = 'none'
    }
    render(){
        let { state } = this.props;
        let empty = state.notebook.layout.length == 0 
            // && state.trash.cells.length == 0
            && state.connect.status != 'connected';
        return <div>
            <div className="first-page">
                <Header empty={empty} />
                <div className="configure-wrap">
                    <Configure 
                        config={state.config} 
                        connect={state.connect} 
                        empty={empty} />
                </div>
                <Notebook 
                    notebook={state.notebook} 
                    connect={state.connect} 
                    deltas={state.deltas}
                    trash={state.trash}
                    config={state.config}/>
                <DeltaPane deltas={state.deltas} connect={state.connect} />
            </div>
            <HelpPage empty={empty} connect={state.connect} config={state.config} />
        </div>
    }
    
}


class Header extends React.PureComponent {
    render(){
        return <div className="header-wrap">
            <div className="header">
                <a href="/" target="_blank"><h1>Franchise</h1></a>
                <SloganToggler />
                { this.props.empty ? null : <ExportButton /> }
            </div>   
        </div> 
    }
}

class SloganToggler extends React.PureComponent {
    slogans = [
        'what you get when you add a lot of sequels',

        'the mcdonalds of sql clients',
        'vaguely sounds like "french fries"',
        'the tool that makes you click on the slogan text',
        'polyamorously relational before it was cool',
        'the ibuprofen for data headaches',
        'Give me your tired, your poor, your huddled data yearning to breathe free.',
        'remarkably painless',
        'best thing since sliced bread',
        'how do you pronounce sql anyway',
        'shall i compare thee to a summer\'s data',
        'a sql notebook',
        'a new kind of sql client',
        'look on my JOINs ye mighty and despair',
        'hello future'
    ]
    state = { index: 0 }
    render(){
        return <span className="slogan" onClick={e => this.setState({ index: this.state.index + 1 })}>
            {this.slogans[this.state.index % this.slogans.length]}
        </span>
    }
}

