/* eslint-disable */

const neo4j = require('neo4j-driver').v1
const query = require('./post-transaction-query')
const params = require('./post-transaction-params')

const driver = neo4j.driver(
  'bolt://localhost:11012',
  neo4j.auth.basic('neo4j', 'design'),
)

const session = driver.session()

async function run() {
  let result
  // result = await session.run('match (n) return count(n) as count')
  // console.log(result.records[0].get('count'))
  await session.run('match (n) detach delete n')
  // await session.run('merge (:IOU {id: "53972f816cae508cdc2b5ee6fdc78cd2961307394dc99159cd457b05cd199d41"})')
  await session.run(`
  merge (countspace:Countspace {id: "wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq"})
  merge (countspace)-[:Addresses]->(address:Address {id: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq'})
  merge (countspace)-[:Addresses]->(address2:Address {id: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi'})
  merge (address)-[:Outputs {id: '0'}]->(transaction:Transaction {id: "f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882"})
  merge (address2)-[:Outputs {id: '1'}]->(transaction)
  `)

  // merge (countspace)-[:Transactions]->(:Transaction {id: "4fe8e93bddb9a8b632fbe101210460edfc27e14e7206d862ee9fb0dfa97614bd"})
  // merge (countspace)-[:IOUs]->(:IOU {id: "53972f816cae508cdc2b5ee6fdc78cd2961307394dc99159cd457b05cd199d41"})

  const result1 = await session.run(query, params.S_U_S)
  result1.records.forEach(function (record) {
    record.keys.forEach((key) => {
      console.log(key, ': ', record.get(key))
    })
  })

  // let result2 = await session.run(query, params.S_U_S_2)
  // result2.records.forEach(function (record) {
  //   record.keys.forEach(key => {
  //     console.log(key, ': ', record.get(key))
  //   })
  // })

  // let result2 = await session.run(query, params.U_S_U)
  // result2.records.forEach(function (record) {
  //   console.log(record.get('id'))
  //   console.log(record.get('inputs'))
  //   console.log(record.get('outputs'))
  // })

  session.close()
}

run()
