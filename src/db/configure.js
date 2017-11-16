import React from 'react'
import _ from 'lodash'

import Tabs, { TabPane } from 'rc-tabs';
import TabContent from 'rc-tabs/lib/TabContent';
import InkTabBar from 'rc-tabs/lib/InkTabBar';
import { UnmountClosed } from 'react-collapse';

import * as State from '../state'
import * as U from '../state/update'


import * as SQLiteConnector from './sqlite'
import * as PostgresConnector from './postgres'
import * as BigQueryConnector from './bigquery'

import * as MySQLConnector from './mysql'
import * as MongoConnector from './mongo'

import * as CartoConnector from './carto'

const Databases = [
    SQLiteConnector,
    PostgresConnector,
    MySQLConnector,
    BigQueryConnector,
    CartoConnector,
    // 'MySQL',
    'MongoDB',
    // MySQLConnector,
    // MongoConnector,
    'Microsoft SQL Server',
    'Oracle',
    'IBM DB2',
    'Teradata',
]


export default class Configure extends React.PureComponent {
    render(){
        let { config, connect, empty } = this.props;
        let db = DB(connect.active);
        let connected = connect.status === 'connected';
        let connectable = connected || connect.status === 'connecting';
        let force_open = empty && !connected;
        return <div className="configure">
            <div onClick={e => State.apply('config', 'open', U.toggle)}
                className={connect.status + ' banner ' + (force_open ? '' : 'can-toggle ')}>{{
                    connecting: <div className="body">
                            <i className="fa fa-spinner fa-spin fa-fw"></i>
                            {" "}
                            Connecting to {db.name || 'database'}</div>,
                    connected: <div className="body">Connected to {db.name}</div>,
                    disconnected: <div className="body">Disconnected from {db.name} {connect.error ? <i>({connect.error})</i> : null}</div>,
                    unconfigured: <div className="body">Connect to a Database</div>
                }[connect.status]}
                {!force_open ? <div className="toggle" >
                    <div>Settings <i
                        className={"fa " + (config.open ? 'fa-caret-up' : 'fa-caret-down')}
                        aria-hidden="true"></i></div>
                </div> : null}
            </div>
            <UnmountClosed isOpened={config.open || force_open} springConfig={{stiffness: 150, damping: 20}}>
            <Tabs
                activeKey={connectable ? db.key : connect.active}
                tabBarPosition="left"
                destroyInactiveTabPane
                onChange={ key => State.apply('connect', 'active', U.replace(key)) }
                renderTabBar={()=> <InkTabBar />}
                renderTabContent={()=><TabContent animated={false} style={{ height: 'auto' }} />}>{
                    Databases.map(c => {
                        if(typeof c == 'string') return <TabPane tab={c} key={c} disabled={true}>{c}</TabPane>;

                        return <TabPane tab={(c === db && connectable) ?
                                <span>{c.name} <i className="fa fa-plug" aria-hidden="true"></i></span> :
                                c.name
                        } key={c.key} disabled={connectable && c !== db}>
                            { c.Configure ?
                                <c.Configure config={config} connect={connect} /> :
                                <div className="error">No configuration interface defined for {c.name} connector</div> }
                        </TabPane>
                    })
                }</Tabs>
            </UnmountClosed>
        </div>
    }
}


export function DB(key){
    return Databases.find(k => k.key === key)
}

export function getDB(){
    return DB(State.get('connect', 'active'))
}
