import React from 'react'


import _ from 'lodash'
import {CartoVisualizer} from './carto'
import {PivotVisualizer, TableVisualizer, CardVisualizer} from './table'
import {LineChartVisualizer, BarChartVisualizer, Chart2DVisualizer} from './chart'
import {Position, Tooltip as BlueprintTooltip} from "@blueprintjs/core"
import {ExplainVisualizer} from './explain'

import XLSX from 'xlsx'

import swal from 'sweetalert2'

let map

const DownloadButton = ({type, onClick, disabled}) =>
  <button disabled={disabled} className='pt-button pt-large' onClick={onClick}>
    {type}
    <i className="pt-icon-standard fa fa-download pt-align-right" aria-hidden="true"></i>
  </button>


class DownloadVisualizer extends React.Component {
  static key = 'download-result'
  static desc = "Export Results"
  static icon =
    <i className="fa fa-download" aria-hidden="true"></i>

  static test(result) {
    return result.columns.length > 0
  }

  async tryDownload(data, type, extension) {
    const a = document.createElement('a')
    a.target = '_blank'
    try {
      const title = (await swal({
        input: 'text',
        showCancelButton: true,
        title: 'Save Result As ' + extension.toUpperCase(),
        inputPlaceholder: 'my_cool_file'
      }) || 'my_cool_file')

      a.download = title.match(/.+\..+/) ? title : title + '.' + extension
      a.href = URL.createObjectURL(new Blob([data], {type}))
      a.click()
    } catch (e) {
      console.log('cancelled download')
    }

  }

  getSheet() {
    const {columns, values} = this.props.result
    return XLSX.utils.aoa_to_sheet([columns, ...values])
  }

  getCSV() {
    this.tryDownload(
      XLSX.utils.sheet_to_csv(this.getSheet()),
      'text/csv',
      'csv')
  }

  getTSV() {
    this.tryDownload(
      XLSX.utils.sheet_to_csv(this.getSheet(), {FS: '\t'}),
      'text/tab-separated-values',
      'tsv')
  }

  getHTML() {
    this.tryDownload(
      XLSX.utils.sheet_to_html(this.getSheet()),
      'text/html',
      'html')
  }

  getJSON() {
    this.tryDownload(
      XLSX.utils.sheet_to_json(this.getSheet())
        .map(k => JSON.stringify(k))
        .join('\n'),
      'application/json',
      'json')
  }

  getSQL() {
    this.tryDownload(
      XLSX.utils.sheet_to_json(this.getSheet()),
      'application/sql',
      'sql')
  }

  getXLS() {
    const wb = {
      Sheets: {Sheet1: this.getSheet()},
      SheetNames: ['Sheet1']
    }

    this.tryDownload(
      s2ab(XLSX.write(wb, {bookType: 'xlsx', bookSST: true, type: 'binary'})),
      'application/vnd.ms-excel',
      'xlsx')
  }

  render() {
    let {result, view} = this.props

    return <div className='exporter'>
      <TableVisualizer {...this.props} />
      <div className='buttons-wrap'>
        <div className='buttons'>
          <DownloadButton type='CSV' onClick={e => this.getCSV()}/>
          <DownloadButton type='TSV' onClick={e => this.getTSV('\t')}/>
          <DownloadButton type='XLSX' onClick={e => this.getXLS()}/>
          <DownloadButton type='HTML' onClick={e => this.getHTML()}/>
          <DownloadButton type='JSON' onClick={e => this.getJSON()}/>
          {/*<DownloadButton disabled type='SQL'/>*/}
        </div>
      </div>
    </div>
  }
}


function s2ab(s) {
  var buf = new ArrayBuffer(s.length)
  var view = new Uint8Array(buf)
  for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF
  return buf
}


function addCSS(url) {
  var link = document.createElement('link')
  link.type = 'text/css'
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

import {latLng, divIcon} from 'leaflet'
import {Map, Marker, Popup, TileLayer, LayersControl, LayerGroup, ZoomControl} from 'react-leaflet'

import Leaflet from 'leaflet'

delete Leaflet.Icon.Default.prototype._getIconUrl

Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.1.0/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.1.0/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.1.0/images/marker-shadow.png',
})


class MapVisualizer extends React.Component {
  static key = 'map'
  static desc = "Map View"
  static icon = <i className="fa fa-map-marker" aria-hidden="true"></i>

  static test(result) {
    return result.columns.some(k => ['lat', 'latitude', 'lattitude'].includes(k.toLowerCase())) &&
      result.columns.some(k => ['lon', 'longitude', 'long', 'lng'].includes(k.toLowerCase()))
  }

  state = {loaded: false}

  componentDidMount() {
    this.loadLibrary()
  }

  loadLibrary() {
    addCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.1.0/leaflet.css')
  }

  componentWillMount() {
    map = null
  }

  posFromDatum(datum) {
    let {result} = this.props
    const latName = result.columns.find(k => ['lat', 'latitude', 'lattitude'].includes(k.toLowerCase()))
    const lonName = result.columns.find(k => ['lon', 'longitude', 'long', 'lng'].includes(k.toLowerCase()))
    let lat = datum[latName] || 0
    let lon = datum[lonName] || 0
    return latLng(+lat, +lon)
  }

  getLayerControl() {
    const googleSubdomains = [ 'mt0', 'mt1', 'mt2', 'mt3' ]
    const gis2Subdomains = [ 'tile0', 'tile1', 'tile2', 'tile3', 'tile4' ]
    return (
      <LayersControl position="topright">
        <LayersControl.BaseLayer name="OpenStreetMap.BlackAndWhite">
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OSM Dark">
          <TileLayer
            url='https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="2 gis">
          <TileLayer
            url='https://{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.3&r=g'
            subdomains={gis2Subdomains}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="google">
          <TileLayer
            url='https://{s}.google.com/vt?x={x}&y={y}&z={z}'
            subdomains={googleSubdomains}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="google satellite">
          <TileLayer
            url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
            subdomains={googleSubdomains}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="google hibride">
          <TileLayer
            url='https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}'
            subdomains={googleSubdomains}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
    )
  }

  getMarkerIcon() {
    return divIcon({
      html: `<div class="custom-leaflet-icon"></div>`
    })
  }

  getMarkers(k, i) {
    let {result} = this.props
    return (
      <Marker position={this.posFromDatum(_.zipObject(result.columns, k))} key={i} icon={this.getMarkerIcon()}>
        <Popup>
          <div>
            <table className="table table-hover table-striped table-condensed">
              <tbody>
              {_.map(_.zipObject(result.columns, k), (e, p) => <tr key={p}>
                <th>{p}</th>
                <td>{JSON.stringify(e)}</td>
              </tr>)}
              </tbody>
            </table>
          </div>
        </Popup>
      </Marker>
    )
  }

  render() {

    let {result} = this.props
    const position = [51.505, -0.09]
    return (
      <div className='map-container' style={{ width: '100%' }}>
        <Map
          ref={(ref) => { map = ref }}
          center={position} zoom={13}
          bounds={ result.values.map((k) => this.posFromDatum(_.zipObject(result.columns, k)))  }
          boundsOptions={{padding: [50, 50]}}
          style={{ height: '100%' }}>
          {this.getLayerControl()}
          {result.values.map((k, i) => this.getMarkers(k, i))}
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
        </Map>
      </div>
    )
  }
}


class SingleResultVisualizer extends React.Component {
  static key = 'single-result'
  static desc = "Single Result"
  static icon =
    <i className="fa fa-list" aria-hidden="true"></i>

  static test(result) {
    return result.values.length == 1 && result.columns.length == 1
  }

  render() {
    let {result, view} = this.props

    return <div className={"single-result " + (view.loading ? 'result-loading ' : '')}>
      <b>{result.columns[0]}</b>
      <pre>{result.values[0][0]}</pre>
    </div>
  }
}


const Visualizers = [
  ExplainVisualizer,
  PivotVisualizer, TableVisualizer,
  CardVisualizer,
  LineChartVisualizer,
  BarChartVisualizer,
  Chart2DVisualizer,
  MapVisualizer,
  DownloadVisualizer,
  CartoVisualizer
]


function NoVisualizer() {
  return <div>No Compatible Visualizer</div>
}


function Tooltip(props) {
  return <BlueprintTooltip
    position={Position.RIGHT}
    tetherOptions={{constraints: [{attachment: "together", to: "scrollParent"}]}}
    {...props} />
}


export class ResultVisualizer extends React.Component {
  state = {
    fullscreen: false
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(nextProps.result, this.props.result)
      || !_.isEqual(nextState, this.state)
      || nextProps.view.selected !== this.props.view.selected
      || nextProps.view.loading !== this.props.view.loading
      || !_.isEqual(nextProps.deltas, this.props.deltas)
      || !_.isEqual(nextProps.connect, this.props.connect)
      || nextProps.forceRenderToken !== this.props.forceRenderToken
  }

  onFullScreen(state) {
    this.setState({ fullscreen: state })
    if (map) requestAnimationFrame(() => map.leafletElement.invalidateSize())
  }

  render() {

    let {result, view, updateView, deltas, connect, config} = this.props

    const applicable = []
    for (let viz of Visualizers) {
      try {
        if (viz.test(result)) {
          applicable.push(viz)
        }
      } catch (err) {
      }
    }


    if (applicable.length == 0) {
      return <div>
        <div className={"single-result " + (view.loading ? 'result-loading ' : '')}>
          <i>(query returned no results)</i>
        </div>
      </div>
    }


    var Visualizer = applicable.find(k => k.key == view.selected) || applicable[0] || NoVisualizer
    let fullscreen = this.state.fullscreen
    if (fullscreen) {
      document.body.style.overflow = 'hidden'
    } else if (document.body.style.overflow != '') {
      document.body.style.overflow = ''
    }

    return (
      <div className={"output-wrap " + (fullscreen ? 'fullscreen ' : 'inline ')}>
        <Visualizer result={result} view={view} updateView={updateView} connect={connect} deltas={deltas} config={config}/>
        <div className='controls' onMouseDown={this.props.beginDrag}>
          {applicable.map(viz =>
            <Tooltip key={viz.key} content={viz.desc}>
              <button className={viz === Visualizer ? 'selected' : ''}
                      onClick={e => updateView({selected: viz.key})}>{viz.icon}</button>
            </Tooltip>)
          }
          <div className="spacer"/>

          {fullscreen ? <Tooltip content="Exit Full Screen">
            <button onClick={() => this.onFullScreen(false)}>
              <i className="fa fa-compress" aria-hidden="true"></i>
            </button>
          </Tooltip> : <Tooltip content="Full Screen">
            <button onClick={() => this.onFullScreen(true)}>
              <i className="fa fa-expand" aria-hidden="true"></i>
            </button>
          </Tooltip>}
        </div>
      </div>
    )
  }

}