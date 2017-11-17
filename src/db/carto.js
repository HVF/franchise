import React from 'react'

import * as State from '../state'
import * as U from '../state/update'

import SQLParser from 'sqlite-parser'

import CV from '../util/codeviewer'

export const key = 'carto'
export const name = 'CARTO'
export const syntax = 'text/x-pgsql'

import { connectHelper, expandQueryRefs, extractEditableColumns, assignSuggestedName } from './generic'
export { getStagingValue, updateStagingValue, select_table_snippet } from './generic'

export function create_table_snippet(){
    return `DROP TABLE IF EXISTS new_table;
CREATE TABLE new_table (id integer, name text);
SELECT CDB_CartoDBFyTable('your_user_name','new_table');
INSERT INTO new_table (cartodb_id, the_geom, id, name) VALUES (1, st_geometryfromtext('POINT(0 0)', 4326), 1, 'WOW')`;
}

export class Configure extends React.Component {
  render() {
    const {connect, config} = this.props;

    const credentialHints = {
      host: 'Host name (e.g carto.com)',
      user: 'User name',
      apiKey: 'API key',
    };

    let credentials = (config.carto && config.carto.credentials) || {};

    const Field = (type, icon, className='') =>
      <div className='pt-input-group'>
        {icon ? <span className={className + ' pt-icon pt-icon-' + icon} /> : null}
        <input
          type={type === 'password' ? 'password' : 'text'}
          disabled={connect.status == 'connected' || connect.status === 'connecting'}
          className='pt-input'
          value={credentials[type] || ''}
          onChange={e => State.apply('config', 'carto', 'credentials', type, U.replace(e.target.value))}
          placeholder={credentialHints[type]}
        />
      </div>

    return <div>
      <img src={require('./img/carto.png')} style={{height: 40}} />
      <div className='pg-form'>
        <div>
          <div>
            <div className='pt-control-group pt-fill'>
              {Field('host', 'cloud')}
            </div>
            <div className='pt-control-group pt-vertical'>
              {Field('user', 'user')}
              {Field('apiKey', 'lock')}
            </div>
          </div>
        </div>

        {
          connect.status != 'connected' ?
            <button disabled={connect.status === 'connecting'} type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>Connect <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span></button> :
            <button type="button" className="pt-button pt-large  pt-intent-danger" onClick={e => disconnectDB()}>Disconnect <span className="pt-icon-standard pt-icon-offline pt-align-right"></span></button>
        }
      </div>
    </div>
  }
}

export async function connectDB() {
  await connectHelper(async function() {
    let result = await sendRequest('select 1');
    if (!result) {
      throw new Error("Couldn't connect to server");
    } else if (result.error) {
      throw new Error(result.error);
    }

    State.apply('connect', 'schema', U.replace(await getSchema()));
  })
}

export function disconnectDB() {
  State.apply('connect', 'status', U.replace('unconfigured'))
}

export async function sendRequest(query) {
  let response = await fetch('https://' + State.get('config', 'carto', 'credentials', 'user') + '.' + State.get('config', 'carto', 'credentials', 'host') + '/api/v1/sql?q=' + encodeURIComponent(query) + '&api_key=' + State.get('config', 'carto', 'credentials', 'apiKey'));

  return await response.json();
}

export function reference(name) {
  return '{{' + name + '}}';
}

async function getSchema() {
  var table_list = undefined;
  try {
    table_list = await sendRequest("SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE table_schema = '" + State.get('config', 'carto', 'credentials', 'user') + "' and table_name not like 'analysis_%25'");
  } catch (exception) {

  }

  if (!(table_list && table_list.rows && table_list.rows.length > 0)) {
    return [];
  }

  return _.map(_.groupBy(table_list.rows,
    (row) => row.table_schema + '.' + row.table_name),
    columns => ({
      schema: columns[0]["table_schema"],
      name: columns[0]["table_name"],
      columns: columns.map(k => k["column_name"])
    })
  );
}

export async function run(query, cellId) {
  let expandedQuery = expandQueryRefs(query, cellId);
  let result = await _runQuery(expandedQuery);

  result.query = query;
  result.expandedQuery = expandedQuery;

  State.apply('connect', 'schema', U.replace(await getSchema()));

  await extractEditableColumns(result);
  await assignSuggestedName(result);

  return result;
}

async function _runQuery(query) {
  query = preProcess(query);
  var response = await sendRequest(query);

  if (response.error) {
    throw new Error(response.error);
  }

  let columns = Object.keys(response.fields);
  let values = [];

  for (let i = 0; i < response.rows.length; i++) {
    let row = [];
    for (let key in response.rows[i]) {
      row.push(response.rows[i][key]);
    }
    values.push(row);
  }
  let result = {
    columns,
    values: values,
    id: response.id,
    time: response.time
  };

  result.astInput = query;
  try {
    result.ast = SQLParser(query);
  } catch (err) {
    if (!result.values.length) {
      throw new Error(err);
    }
  }

  return result;
}

export function escapeValue(val){
    if(!isNaN(val)) return '' + val
    return "'" + (val + '') .replace(/'/g, "''") + "'"
}

export function escapeIdentifier(id, config){
    const escaped = id.split('.').map(id => '"' + id.replace(/"/g, '""') + '"').join('.');
    return escaped
}

function preProcess(query) {
  if (query) {
    return query.replace(/(?:\r\n|\r|\n)/g, ' ');
  }
}

function escapePredicateIdentifier(id, config, numeric){
    const escaped = id.split('.').map(id => '"' + id.replace(/"/g, '""') + '"').join('.');
    if (numeric) return escaped + '::numeric'
    return escaped
}

export function assembleRowPredicate(result, rowIndex){
    return _.zip(result.editableColumns, result.values[rowIndex])
        .filter(k => k[0]) // for editable (non-computed) columns
        .map(([col, val]) => escapePredicateIdentifier(col, null, !isNaN(val)) +
            // in SQL, you can't do x = NULL, but instead you have to do x IS NULL
            (val === null ? ' IS NULL' : (' = ' + escapeValue(val) )))
        .join(' AND ')
}

export function Clippy(props){
    return <div className="clippy-wrap">
        <div className="clippy">
            <section>
                <h2>SELECT Statement</h2>
                <CV mode="text/x-pgsql" code={`SELECT * FROM "builder-demo".sf_trees WHERE caretaker = 'DPW'`}/>
                <CV mode="text/x-pgsql" code={`SELECT * FROM "builder-demo".world_commerce WHERE exports_total > 64367776220`}/>
            </section>

            <section>
            <h2>SPATIAL</h2>
            <CV mode="text/x-pgsql" code={`SELECT cartodb_id,
       st_centroid(the_geom) AS the_geom,
       st_centroid(the_geom_webmercator) AS the_geom_webmercator
       FROM "builder-demo".world_commerce`}/>
            </section>

            <section>
            <h2>GEOCODING</h2>
            <CV mode="text/x-pgsql" code={`WITH polygon AS
  (SELECT cdb_geocode_admin0_polygon('USA') AS the_geom)
SELECT the_geom,
       st_transform(the_geom, 3857) AS the_geom_webmercator
       FROM polygon`}/>
            <CV mode="text/x-pgsql" code={`WITH A AS
  (SELECT cdb_geocode_namedplace_point('Madrid') AS the_geom)
SELECT the_geom,
       st_transform(the_geom, 3857) AS the_geom_webmercator
       FROM A`} />
            </section>


            <section>
            <h2>ISODISTANCE</h2>
            <CV mode="text/x-pgsql" code={`WITH isodistance AS
  (SELECT the_geom
   FROM cdb_isodistance('POINT(-3.70568 40.42028)'::geometry, 'walk', ARRAY[300, 600, 900]::integer[]))
SELECT st_transform(the_geom, 3857) AS the_geom_webmercator,
       the_geom
       FROM isodistance`}/>
            </section>

            <section>
            <h2>ROUTING</h2>
            <CV mode="text/x-pgsql" code={`WITH route AS
  (SELECT shape AS the_geom
   FROM cdb_route_point_to_point('POINT(-3.70237112 40.41706163)'::geometry,'POINT(-3.69909883 40.41236875)'::geometry, 'car', ARRAY['mode_type=shortest']::text[]))
SELECT st_transform(the_geom, 3857) AS the_geom_webmercator,
       the_geom
       FROM route`}/>
            </section>

            <section>
            <h2>Links</h2>
            <ul>
            <li><a target="_blank" href="https://www.postgresql.org/docs/9.4/static/sql.html">PostgreSQL Language Reference</a></li>
            <li><a target="_blank" href="https://postgis.net/docs/reference.html">PostGIS Reference</a></li>
            <li><a target="_blank" href="https://carto.com/docs/">CARTO Documentation</a></li>
            <li><a target="_blank" href="https://carto.com/docs/carto-engine/sql-api/">CARTO SQL API</a></li>
            <li><a target="_blank" href="https://carto.com/docs/carto-engine/dataservices-api/">CARTO Data Services API</a></li>
            <li><a target="_blank" href="https://carto.com/docs/carto-engine/cartocss/">CARTOCSS Language Reference</a></li>
            </ul>
            </section>

        </div>
    </div>
}
