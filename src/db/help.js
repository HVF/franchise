import _ from 'lodash'
import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import { DB } from './configure'
// import { Icon } from '@blueprintjs/core';


export default function HelpPage(props){
    const { connect, empty, config } = props;

    if(empty) return null;

    let db = DB(connect.active);

    return <div className="help-page">
        <div className="help-tab" onClick={ e => animateScrollHere(e.target) }>
            <span className="pt-icon-standard pt-icon-help"></span>  {db.name} Help
        </div>
        <div className="help-content">
            {db.Clippy ? <db.Clippy key="clippy" connect={connect} config={config[connect.active]}/> : null}
        </div>
    </div>
}


function ease(t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 }

function animateScrollHere(el){
    let s0 = document.body.scrollTop,
        s1 = el.offsetTop - 10,
        t0 = Date.now(),
        t1 = t0 + 400;

    function helper(){
        document.body.scrollTop = s0 + ease((Date.now() - t0) / (t1 - t0)) * (s1 - s0)

        if(Date.now() < t1){
            requestAnimationFrame(helper)    
        }
    }
    helper()
}