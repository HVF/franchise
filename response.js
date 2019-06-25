let createClient = (() => {
    var _ref3 = _asyncToGenerator(function*(db, credentials) {
        if (db === 'postgres') return yield createPostgresClient(credentials)
        if (db === 'bigquery') return yield createBigQueryClient(credentials)
        if (db === 'mysql') return yield createMySQLClient(credentials)
        throw new Error('database ' + db + ' not recognized')
    })

    return function createClient(_x4, _x5) {
        return _ref3.apply(this, arguments)
    }
})()

let createMySQLClient = (() => {
    var _ref4 = _asyncToGenerator(function*(credentials) {
        const client = yield mysql.createConnection(credentials)
        return {
            query(sql) {
                return _asyncToGenerator(function*() {
                    const [rows, fields] = yield client.execute(sql)
                    console.log(rows, fields)
                    if (fields) {
                        const field_list = fields.map(function(k) {
                            return k.name
                        })
                        return {
                            columns: field_list,
                            values: rows.map(function(row) {
                                return field_list.map(function(k) {
                                    return row[k]
                                })
                            }),
                        }
                    } else {
                        return {
                            columns: ['result'],
                            values: [[rows]],
                        }
                    }
                })()
            },
            close() {
                return _asyncToGenerator(function*() {
                    return yield client.end()
                })()
            },
        }
    })

    return function createMySQLClient(_x6) {
        return _ref4.apply(this, arguments)
    }
})()

let createPostgresClient = (() => {
    var _ref5 = _asyncToGenerator(function*(credentials) {
        const client = new PostgresClient(credentials)
        ;[1082, 1114, 1184].forEach(function(oid) {
            return client.setTypeParser(oid, function(val) {
                return val
            })
        })
        yield client.connect()
        return {
            query(sql) {
                return _asyncToGenerator(function*() {
                    let results = yield client.query({
                        text: sql,
                        rowMode: 'array',
                    })
                    if (Array.isArray(results)) {
                        results = results[results.length - 1]
                    }
                    // console.log(results.rows, results)
                    if (results.rows.length > 10000)
                        throw new Error(
                            'Too many result rows to serialize: Try using a LIMIT statement.'
                        )
                    return results
                })()
            },
            close: client.end.bind(client),
        }
    })

    return function createPostgresClient(_x7) {
        return _ref5.apply(this, arguments)
    }
})()

function _asyncToGenerator(fn) {
    return function() {
        var gen = fn.apply(this, arguments)
        return new Promise(function(resolve, reject) {
            function step(key, arg) {
                try {
                    var info = gen[key](arg)
                    var value = info.value
                } catch (error) {
                    reject(error)
                    return
                }
                if (info.done) {
                    resolve(value)
                } else {
                    return Promise.resolve(value).then(
                        function(value) {
                            step('next', value)
                        },
                        function(err) {
                            step('throw', err)
                        }
                    )
                }
            }
            return step('next')
        })
    }
}

const { Client: PostgresClient } = require('pg')
const mysql = require('mysql2/promise')
const BigQueryClient = require('@google-cloud/bigquery')
const tmp = require('tmp')
const fs = require('fs')

const credentials = require('./credentials.js')

const localCtx = {}
module.exports = (() => {
    var _ref = _asyncToGenerator(function*(message, ctx = localCtx) {
        const { action, id } = message

        try {
            if (action === 'open') {
                const { credentials, db } = message

                ctx.client = yield createClient(db, credentials)
                return { ready: true }
            } else if (action === 'exec') {
                const { sql } = message

                const results = yield ctx.client.query(sql, message)
                return { results }
            } else if (action === 'close') {
                yield ctx.client.close()

                return { closed: true }
            } else if (action == 'get_postgres_credentials') {
                return credentials
            } else if (action == 'get_bigquery_schema') {
                const get = (() => {
                    var _ref2 = _asyncToGenerator(function*(o, prop, ...rest) {
                        return typeof prop === 'undefined'
                            ? o
                            : typeof o[prop] === 'function'
                            ? get(yield o[prop](), ...rest)
                            : Array.isArray(o[prop])
                            ? Promise.all(
                                  o[prop].map(function(sub) {
                                      return get(sub, ...rest)
                                  })
                              )
                            : typeof prop === 'function'
                            ? get(yield prop(o), ...rest)
                            : new Error('not found: ' + o + ' ' + prop)
                    })

                    return function get(_x2, _x3) {
                        return _ref2.apply(this, arguments)
                    }
                })()

                const flatten = function(arr, result = []) {
                    arr.forEach(function(value) {
                        return Array.isArray(value) ? flatten(value, result) : result.push(value)
                    })
                    return result
                }

                const raw = yield get(
                    ctx.client,
                    'getDatasets',
                    0,
                    'getTables',
                    0,
                    'getMetadata',
                    function(metadata) {
                        return metadata[0]
                    }
                )

                const schema = flatten(raw).map(function(table) {
                    return {
                        schema: table.tableReference.datasetId,
                        name: table.tableReference.tableId,
                        columns: table.schema.fields.map(function(f) {
                            return f.name
                        }),
                    }
                })

                return { schema }
            } else {
                throw new Error('Unknown action: ' + action)
            }
        } catch (e) {
            console.log(e)
            return { error: e.message || e.stack.split('\n')[0] }
        }
    })

    function response(_x) {
        return _ref.apply(this, arguments)
    }

    return response
})()

function createBigQueryClient(credentials) {
    if (credentials.keyFile) {
        const { name, data } = credentials.keyFile

        const { name: keyFilename, fd } = tmp.fileSync({ postfix: name })
        fs.writeFileSync(fd, Buffer.from(data, 'hex'))

        credentials.keyFilename = keyFilename
    }
    console.log(credentials)
    const client = new BigQueryClient(credentials)
    return {
        query: (sql, { useLegacySql }) => client.query({ query: sql, useLegacySql }),
        getDatasets: () => client.getDatasets(),
        close() {
            console.log('no bigquery close method')
        },
    }
}
