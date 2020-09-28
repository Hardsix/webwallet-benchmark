/* eslint-disable */

const neo4j = require('neo4j-driver').v1
const bluebird = require('bluebird')
const random = require('crypto').randomBytes
const query = require('./post-transaction-query')
const {
  puzzles: { address },
  hashing,
  keypair,
} = require('../core/webwallet/packages/cryptools')

const algorithms = 'sha256'
const driver = neo4j.driver(
  'bolt://localhost',
  neo4j.auth.basic('neo4j', 'password'),
)

function generateValues({ funding } = {}) {
  let id = hashing.create({ data: random(30), algorithms })
  let inputs = [hashing.create({ data: random(30), algorithms })]
  let source = address.generate({ data: keypair.generate() })
  let target = address.generate({ data: keypair.generate() })
  let symbol = source

  return { id, inputs, source, target, symbol }
}

function generateParams({ id, inputs, funding = [], source, target, symbol }) {
  return {
    id: id,
    countspaces: [
      {
        symbol: symbol,
        inputs: inputs.map((value, index) => ({ hash: value })),
        outputs: [
          {
            index: 0,
            address: source,
            sources: funding.length ? [`${funding[0]}`] : [],
          },
          {
            index: 1,
            address: target,
            sources: funding.length > 1 ? [`${funding[1]}`] : [],
          },
        ],
        sources: funding,
      },
    ],
  }
}

const total = 1000
let timestamp = new Date().getTime()
let transactions = Array(total)
  .fill(false)
  .map(({ funding }, index) => generateParams({ ...generateValues(), funding }))
console.log('txn gen:', transactions.length, new Date().getTime() - timestamp)

async function submitTransaction(params, driver) {
  let session = driver.session()
  let neo4jTxn = session.writeTransaction(async (transaction) => {
    return await transaction.run(query, params)
  })
  // await new Promise(resolve => setTimeout(resolve, 1000))
  // await neo4jTxn.commit()
  return neo4jTxn
}

timestamp = new Date().getTime()

async function run({ query, driver, transactions }) {
  const session = driver.session()
  await session.run('match (n) detach delete n')
  let results = await bluebird.map(
    transactions,
    (txn) => submitTransaction(txn, driver),
    { concurrency: 10 },
  )
  // let results = await bluebird.map(transactions, txn => submitTransaction(txn, driver), {concurrency: 10})
  session.close()

  // console.log('txn bytes:', JSON.stringify(transactions).length)
  console.log('txn processing: ', new Date().getTime() - timestamp)
  // console.log(JSON.stringify(results, null, 3))
}

const chained = []
const chainLength = 10
let base = transactions[0]
// console.log(base)
Array(chainLength)
  .fill(0)
  .forEach((txn) => {
    let id = hashing.create({ data: random(30), algorithms })
    let inputs = [hashing.create({ data: random(30), algorithms })]
    let { symbol } = base.countspaces[0]
    let target = base.countspaces[0].outputs[1].address
    let previous = chained[chained.length - 1]
    // let funding = previous ? [previous.id] : []
    let funding = previous ? [`${previous.id}::0`, `${previous.id}::1`] : []
    let params = generateParams({
      id,
      inputs,
      funding,
      source: symbol,
      target,
      symbol,
    })
    chained.push(params)
  })

let spread = (array, property) =>
  array.reduce((rdc, txs) => [...rdc, ...txs[property]], [])

const bundled = [
  {
    id: transactions[0].id,
    // inputs: spread(transactions, 'inputs'),
    countspaces: spread(transactions, 'countspaces'),
  },
]

// run({query, driver, transactions})
//  console.log(JSON.stringify(transactions[1], null, 3))

// function oldRecordFormat(countspaces) {
//   let newRecords = {id: '', inputs: [], outputs: []}
//   countspaces.forEach(countspace => {
//     newRecords.id = countspace.id // txn id
//     newRecords.inputs.push(...countspace.inputs)
//     newRecords.outputs.push(...countspace.outputs.map(({ address, sources }) => {
//       return {address, counter: countspace.symbol, sources}
//     }))
//   })
//   return newRecords
// }
const batchSize = 20
const batched = [
  {
    id: 'f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882',
    countspaces: [
      {
        symbol: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
        inputs: [{ hash: hashing.create({ data: random(30), algorithms }) }],
        outputs: [
          {
            index: 0,
            address: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
            sources: [],
          },
          {
            index: 1,
            address: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
            sources: [],
          },
        ],
        sources: [],
      },
    ],
  },
  {
    id: hashing.create({ data: random(30), algorithms }),
    countspaces: [
      {
        symbol: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
        inputs: Array(batchSize)
          .fill(0)
          .map(() => {
            return { hash: hashing.create({ data: random(30), algorithms }) }
          }),
        outputs: [
          {
            index: 0,
            address: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
            sources: [
              'f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882::0',
            ],
          },
          {
            index: 1,
            address: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
            sources: [
              'f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882::1',
            ],
          },
          ...(() =>
            Array(batchSize - 2)
              .fill(0)
              .map((_, index) => {
                return {
                  index: index + 2,
                  address: address.generate({ data: keypair.generate() }),
                  sources: [],
                }
              }))(),
        ],
      },
    ],
  },
]

batched.map((txn) => console.log(txn.id))
// console.log(JSON.stringify(chained, null, 3))
// console.log(JSON.stringify(bundled, null, 3))
timestamp = new Date().getTime()
// console.log(JSON.stringify(chained, null, 3))
// run({query, driver, transactions})
// run({ query, driver, transactions: chained })
run({ query, driver, transactions: bundled })
// run({query, driver, transactions: batched})
// peerToPeer()

async function peerToPeer() {
  const session = driver.session()
  await session.run('match (n) detach delete n')

  sendAllFrom('wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq', transactions)
  let transactions2 = spendPrevious(transactions)
  // console.log(JSON.stringify(transactions, null, 3))
  timestamp = new Date().getTime()
  await run({ query, driver, transactions })
  // await new Promise(resolve => setTimeout(resolve, 1000))
  // console.log(JSON.stringify(transactions2, null, 3))
  timestamp = new Date().getTime()
  await run({ query, driver, transactions: transactions2 })

  session.close()
}

function sendAllFrom(address, transactions) {
  transactions.forEach((transaction) => {
    transaction.countspaces.forEach((countspace) => {
      countspace.inputs[0].hash = hashing.create({
        data: random(30),
        algorithms,
      })
      countspace.outputs[0].address = address
      countspace.symbol = address
    })
    transaction.id = hashing.create({ data: random(30), algorithms })
  })
}

function spendPrevious(transactions) {
  return transactions.map((previous) => {
    let funding = [previous.id + '::1']
    let transaction = generateParams({ ...generateValues(), funding })
    previous.countspaces.forEach((countspace, index) => {
      transaction.countspaces[index].symbol = countspace.symbol
      transaction.countspaces[index].outputs[0].address =
        countspace.outputs[1].address
    })
    return transaction
  })
}
