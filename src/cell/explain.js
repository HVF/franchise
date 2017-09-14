import React from 'react'
import ReactDOM from 'react-dom'
import classList from 'classnames'

export class ExplainVisualizer extends React.Component {
  static key = 'explain';
  static desc = "Explain Visualizer";
  static icon = <i className="fa fa-cogs" />

  static test(result){
    return result.columns[0] === 'QUERY PLAN'
  }

  render(){
    // <PlanView root={this.props.result.values[0][0][0]} />
    let result = this.props.result;
    if(typeof result.values[0][0] != 'object'){
      return <div className="single-row">
        Run with <code>EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)</code> to use Postgres Explain Visualizer
      </div>
    }
    // console.log(result.values[0][0][0])
    return <div className="single-row">
      <PlanView roots={result.values[0][0]} />
    </div>
  }
}



function PlanView({ roots }){
  return <div className="plan">
    <ul>{roots.map((k, i) => <li key={i}><PlanNode plan={k.Plan} /></li>)}</ul>
  </div>
}

function PlanNode({ plan }){
  return <div className="plan-node-root">
    <div className="plan-node">
      
      <header>
        <h4>{plan['Node Type']}</h4>
        <span>
         <span className="node-duration">
         {plan['Actual Total Time']}
         <span className="text-muted">s
             | </span><strong>42</strong>
            <span className="text-muted">%</span>
         </span>
      </span>
      </header>
    </div>
    {plan.Plans ? <ul>{plan.Plans.map((k, i) => <li key={i}><PlanNode plan={k} /></li>)}</ul> : null}
  </div>
}