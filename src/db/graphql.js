import React from 'react'
import _ from 'lodash'
import { GraphQLClient } from 'graphql-request'
import { introspectSchema } from 'graphql-tools'

import * as State from '../state'
import * as U from '../state/update'
import { connectHelper, disconnectDB } from './generic'

export { disconnectDB, getStagingValue } from './generic'

export const key = 'graphql'
export const name = "GraphQL"
export const syntax = 'graphql'

export class Configure extends React.Component {
  render() {
    const {connect, config} = this.props;

    const credentialHints = {
      endpoint: 'endpoint address',
      token: 'authorization token (optional)',
    }

    let credentials = (config.graphql && config.graphql.credentials) || {}

    const Field = (type, icon, className = '') => <div className='pt-input-group'>
      {icon ? <span className={className + ' pt-icon pt-icon-' + icon} /> : null}
      <input
        type={type === 'password' ? 'password' : 'text'}
        disabled={connect.status == 'connected' || connect.status === 'connecting'}
        className='pt-input'
        value={credentials[type] || ''}
        onChange={e => State.apply('config', 'graphql', 'credentials', type, U.replace(e.target.value))}
        placeholder={credentialHints[type]}
      />
    </div>

    return <div>
      <img src={require('./img/graphql.svg')} style={{ height: 60 }} />
      <p>
        {Field('endpoint', 'globe')}
      </p>
      <p>
        {Field('token', 'lock')}
      </p>
      <p>
        {connect.status != 'connected' ?
          (connect.status == 'connecting' ?
            <button disabled type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
              Connect
                    <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
            </button> :
            <button type="button" className="pt-button pt-large  pt-intent-primary" onClick={e => connectDB()}>
              Connect
                    <span className="pt-icon-standard pt-icon-arrow-right pt-align-right"></span>
            </button>) :
          <button type="button" className="pt-button pt-large  pt-intent-danger" onClick={e => disconnectDB()}>
            Disconnect
                    <span className="pt-icon-standard pt-icon-offline pt-align-right"></span>
          </button>}
      </p>
    </div>
  }
}

export async function run(query) {
  var db = State.get('connect', '_db')
  const results = await fetcher({ query })
  let result = {}
  const data = results.data[Object.keys(results.data)[0]]
  
  if (data != null) {
    result = formatResults(data)
  }
  result.query = query;
  State.apply('connect', 'graphqlschema', U.replace(await getSchema()))
  return result;
}

export function reference(name){
  return '#' + name
}

const database = () => {
  const { endpoint, token} = State.get('config', 'graphql', 'credentials')
  const options = token ? { headers: { Authorization: `Bearer ${token}`}} : {}
  return new GraphQLClient(endpoint, options)
}

const fetcher = ({ query, variables, operationName, context }) => {
  const db = State.get('connect', '_db');
  return db.request(query, variables).then(data => { return { data } })
};

const getSchema = async () => {
  return introspectSchema(fetcher)
}

function formatResults(data) {
  return {
    columns: Object.keys(data[0]),
    values: data.map(d => Object.values(d))
  }
}

async function connectDB() {
  console.log('connectDB started')
  await connectHelper(async function () {
    State.apply('connect', '_db', U.replace(database()))
    State.apply('connect', 'graphqlschema', U.replace(await getSchema()))
  })
}



