/* eslint-disable */

const neo4j = require('neo4j-driver').v1
const query = require('./post-transaction-query (old)')
const params = require('./post-transaction-params (old)')

const driver = neo4j.driver(
  'bolt://localhost',
  neo4j.auth.basic('neo4j', 'design'),
)

const session = driver.session()

async function run() {
  let result
  result = await session.run('match (n) return count(n) as count')
  console.log(result.records[0].get('count'))
  await session.run('match (n) detach delete n')

  let result1 = await session.run(query, params.S_U_S)
  result1.records.forEach(function (record) {
    record.keys.forEach((key) => {
      console.log(key, ': ', record.get(key))
    })
  })

  let result2 = await session.run(query, params.S_U_S_2)
  result2.records.forEach(function (record) {
    record.keys.forEach((key) => {
      console.log(key, ': ', record.get(key))
    })
  })

  let result3 = await session.run(query, params.U_S_U)
  result3.records.forEach(function (record) {
    record.keys.forEach((key) => {
      console.log(key, ': ', record.get(key))
    })
  })

  // session.close()
}

run()
