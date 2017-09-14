import React from 'react'
import ReactDOM from 'react-dom'

import CJS from 'chart.js'

import _ from 'lodash'

function humanize(i){
  const power = Math.log(i) / Math.log(10)
  if(power >= 9) return (i/Math.pow(10, 9)) + 'B'
  if(power >= 6) return (i/Math.pow(10, 6)) + 'M'
  if(power >= 3) return (i/Math.pow(10, 3)) + 'K'
  return i
}

function truncateLabel(value) {
    if(value.length > 13){
      return value.substr(0, 10) + '...'
    }
    return value;
}

const pass = (x, ...y) => (console.log(x, ...y), x)

export class LineChartVisualizer extends React.Component {
  static key = 'line-chart';
  static desc = "Line Chart";
  static icon = <i className="fa fa-line-chart" aria-hidden="true"></i>;

  static test(result){
    // return result.columns.length === 1

    return result.values[0].some(k => !isNaN(+k)) 
        && result.values.length > 1

  }

  render(){
    let { result, view } = this.props;

    // result.values is rows of [v1,v2,v3]

    let label_index = result.columns.map((k, i) => i)
      .find((i) => isNaN(+result.values[0][i])) || 0;
    let numeric_col_indices = result.columns.map((k, i) => i)
      .filter(k => !isNaN(+result.values[0][k]) && k != label_index);

    let valid_row_indicies = result.values.map((v,i) => [v,i])
      .filter(([v,i]) => numeric_col_indices.every(index => v[index] != null))
      .map(([v,i]) => i)


    const labels = valid_row_indicies.map(index => result.values[index][label_index])

    const color = (r, alpha) => 'hsla(' + r * 255 + ', 100%, 50%, '+alpha+')'

    const datasets = numeric_col_indices.map((j, i) => {

      const r = i / numeric_col_indices.length
      const data = valid_row_indicies.map( index => result.values[index][j] )

      return {
        borderColor: color(r, .4),
        backgroundColor: color(r, .2),
        pointBorderColor: 'transparent',
        pointBackgroundColor: 'transparent',
        pointHoverBackgroundColor: color(r, .4),
        fill: data.every( d => d >= 0 ) && (i ? '-1' : 'start'),
        label: result.columns[j],
        // stack: 'stack1',
        data
      }
    })

    const options = {
      animation:false,
      scales: {
          yAxes: [{
              stacked: true
          }],
          xAxes: [{
            ticks: {
              callback: truncateLabel,
            }
          }]
      },
      tooltips: {
        mode: 'index',
        intersect: true
      },
      maintainAspectRatio: false,
      responsive: true
    }

    // select "name", "population", "area" * 100 from "geo_states" limit 10
    return <div style={{flex: 1, overflow: 'auto'}} className="chart-container">
      <Chart
      type='line'
      options={options}
      data={{
        labels,
        datasets
      }}/>
    </div>
  }
}

export class BarChartVisualizer extends React.Component {
  static key = 'bar-chart';
  static desc = "Bar Chart";
  static icon = <i className="fa fa-bar-chart" aria-hidden="true"></i>;

  static test(result){
    // return result.columns.length === 1

    return result.values[0].some(k => !isNaN(+k)) 
        && result.values.length > 1

  }

  render(){
    let { result, view } = this.props;

    // result.values is rows of [v1,v2,v3]

    let label_index = result.columns.map((k, i) => i)
      .find((i) => isNaN(+result.values[0][i])) || 0;
    let numeric_col_indices = result.columns.map((k, i) => i)
      .filter(k => !isNaN(+result.values[0][k]) && k != label_index);
      
    let valid_row_indicies = result.values.map((v,i) => [v,i])
      .filter(([v,i]) => numeric_col_indices.every(index => v[index] != null))
      .map(([v,i]) => i)


    const labels = valid_row_indicies.map(index => result.values[index][label_index])

    const color = (r, alpha) => 'hsla(' + r * 255 + ', 100%, 50%, '+alpha+')'

    const datasets = numeric_col_indices.map((j, i) => {

      const r = i / numeric_col_indices.length
      const data = valid_row_indicies.map( index => result.values[index][j] )

      return {
        borderColor: color(r, .4),
        backgroundColor: color(r, .2),
        hoverBackgroundColor: color(r, .4),
        // pointBorderColor: 'transparent',
        // pointBackgroundColor: 'transparent',
        // pointHoverBackgroundColor: color(r, .4),
        fill: data.every( d => d >= 0 ) && (i ? '-1' : 'start'),
        label: result.columns[j],
        stack: 'stack1',
        data
      }
    })

    const options = {
      animation:false,
      tooltips: {
        mode: 'index',
        intersect: true
      },
      scales: {
          xAxes: [{
            ticks: {
              callback: truncateLabel,
            }
          }]
        },
      maintainAspectRatio: false,
      responsive: true
    }

    // select "name", "population", "area" * 100 from "geo_states" limit 10
    return <div style={{flex: 1, overflow: 'auto'}} className="chart-container">
      <Chart
      type='bar'
      options={options}
      data={{
        labels,
        datasets
      }}/>
    </div>
  }
}

const pairs = arr => {
  if(arr.length < 2) return []
  const res = []
  for(var i = 1; i < arr.length; i+=2)
    res.push([arr[i-1],arr[i]])
  return res
}

export class Chart2DVisualizer extends React.Component {
  static key = 'chart-2d';
  static desc = "Scatter Plot";
  static icon = <span className="pt-icon-standard pt-icon-scatter-plot"></span>;

  static test(result){
    // return result.columns.length === 2
    return result.values[0].filter(k => !isNaN(+k)).length >= 2;
  }

  render(){
    let { result, view } = this.props;


    let label_index = result.columns.map((k, i) => i)
      .find((i) => isNaN(+result.values[0][i]));
    let numeric_col_indices = result.columns.map((k, i) => i)
      .filter(k => !isNaN(+result.values[0][k]));
    // let non_numeric_col_indices = result.columns.map((k, i) => i)
    //   .filter(k => isNaN(+result.values[0][k]));
    let valid_row_indicies = result.values.map((v,i) => [v,i])
      .filter(([v,i]) => numeric_col_indices.every(index => v[index] != null))
      .map(([v,i]) => i)


    const labels = valid_row_indicies.map(index => result.values[index][label_index])

    const color = (r, alpha) => 'hsla(' + r * 255 + ', 100%, 50%, '+alpha+')'

    const datasets = [{      
      // borderColor: color(0, .4),
      // backgroundColor: 'transparent',
      showLine: false,
      borderColor: color(0, .4),
      backgroundColor: color(0, .2),
      pointHoverBackgroundColor: color(0, .4),
      label: '('+result.columns[numeric_col_indices[0]] + ', ' + result.columns[numeric_col_indices[1]]+')',
      data: valid_row_indicies.map( index => ({
        x: result.values[index][numeric_col_indices[0]],
        y: result.values[index][numeric_col_indices[1]]
      }) )
    }]

    const options = {
      animation:false,
      scales: {
          xAxes: [{
              scaleLabel: {
                display: true,
                labelString: result.columns[numeric_col_indices[0]]
              },
            ticks: {
              callback: truncateLabel,
            }
          
          }],
          yAxes: [{
              scaleLabel: {
                display: true,
                labelString: result.columns[numeric_col_indices[1]]
              }
          }]
      },
      tooltips: {
        callbacks: {
          afterLabel({index}){
            return result.columns.map((c, i) => c+': '+result.values[valid_row_indicies[index]][i])
          }
        }
      },
      maintainAspectRatio: false,
      responsive: true
    }

    return <div style={{flex: 1, overflow: 'auto'}} className="chart-container">
      <Chart
      type='scatter'
      options={options}
      data={{
        labels,
        datasets
      }}/>
    </div>
  }
}


class Chart extends React.Component {

  componentDidUpdate(){
    // console.log('updated chart')
    const {type, data, options} = this.props
    Object.assign(this.data, {type, data, options})
    this.c.update()
    this.c.resize()
  }

  componentDidMount(){
    const ctx = this.canvas.getContext('2d')
    const {type, data, options} = this.props
    this.data = {type, data, options}
    this.c = new CJS(ctx, this.data)
  }
  render(){
    return <canvas ref={e => this.canvas = e} className='chart'></canvas>
  }
}