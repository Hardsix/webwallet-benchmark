import { sleepAsync } from './utils/sleep'
import { defaultDate, entitiesData, Entity, WALLET_URIS } from './config/data'
import { generateEntity } from './utils/generate-entity'
const sdk = require('@webwallet/sdk')
const request = require('request-promise')
const _ = require('lodash')
const bluebird = require('bluebird')

const SIM_SIZE = {
  SMALL: 'small',
  BIG: 'big',
}

const runConfig = {
  issuer: entitiesData.stg.testBank1,
  // symbol: entitiesData.stg.testBank1.signer, 
  symbol: entitiesData.stg.TIN_SYMBOL_STG,
  rojo: entitiesData.local.rojo,
  amarillo: entitiesData.local.amarillo,
  logLevel: 1,
  showAllRawResults: false,
  simSize: SIM_SIZE.SMALL,
  walletUri: WALLET_URIS.GCP_STG,
  apiReturnsTimes: false, // true if wallet api returns `times` breakdown in transaction response
}

async function send(sourceAddress: string, sourceKeys: Entity, targetAddress: string, amount: string, symbol: string, expiry: string = defaultDate, logLevel: number = 1, randomErrors = false) 
: Promise<{ res, miliseconds: number, times: object }> {
  const rand = Math.floor(Math.random() * Math.floor(2))

  if (randomErrors && rand) {
    return {
      res: null,
      miliseconds: null,
      times: null,
    }
  }

  /* Prepare IOU claims */
  const claims = {
    domain: 'localhost',
    source: sourceAddress,
    target: targetAddress,
    amount,
    symbol,
    expiry: (new Date(2023)).toISOString(),
  }

  /* Write and sign IOU */
  const signers = [sourceKeys]

  const iou = sdk.iou.write(claims).sign(signers)

  /* Build transaction request body */
  const body = {
    data: {
      inputs: [iou]
    }
  }

  /* Send transaction request */
  if (logLevel > 0) {
    console.log(`Sending ${amount} ${symbol} from ${sourceAddress} to ${targetAddress}`)
  }

  try {
    const hrstart = process.hrtime()
    const res = await request({
      method: 'POST',
      uri: `${runConfig.walletUri}`,
      body,
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'connection': 'close',
      },
      json: true,
    })
    const hrend = process.hrtime(hrstart)

    if (logLevel > 1) {
      console.log('IOU dispatched!')
    }

    const miliseconds = (hrend[0] * 1000) + (hrend[1] / 1000000)
    if (logLevel > 1) {
      console.log(`Finished one in ${hrend[0]}s ${hrend[1] / 1000000}ms with:\n${JSON.stringify(
        res.times, null, 2
      )}`)
    }

    return {
      res,
      miliseconds,
      times: res.times,
    }
  } catch (err) {
    if (logLevel <= 2) {
      console.log('ERROR OCCURRED')
    } else {
      console.log(`Error occurred: ${JSON.stringify(err, null, 2)}`)
    }

    return {
      res: null,
      miliseconds: null,
      times: null,
    }
  }
}

async function issue(amount: string, targetAddress: string, issuerEntity: Entity = runConfig.issuer): Promise<void> {
  await send(issuerEntity.signer, issuerEntity, targetAddress, amount, runConfig.symbol, undefined, runConfig.logLevel)
}

/* SCENARIOS

1) Many transactions at once, every transaction between a 
PARALLELIZATION_AMOUNT of different pair of addresses (different source, different target, they repeat in every batch)
- 10 in parallel, 50, 100, 500

2) Ping - send to another address, repeatedly, around 10000 times
- 1 by 1

*/


async function scenario1(paralellizationAmount: number, iterations: number) {
  const amount = '10'
  const issuanceAmount = paralellizationAmount * iterations * parseInt(amount)
  const entities = _.map(_.range(paralellizationAmount * 2), a => generateEntity())

  // fund all entities with enough money
  await bluebird.map(entities, async e => issue(`${issuanceAmount}`, e.signer), { concurrency: 1 })

  // build unique entity pairs - first to second, third to fourth etc.
  const pairs = _.chunk(entities, 2) // access pairs by indices

  // send parallelizationAmount of transactions between selected pairs, for iterations times
  // pairs must be completely unique (no overlap of source OR target)
  const data = []
  for (let i = 0; i < iterations; i++) {
    const resData = await bluebird.map(pairs, pair => {
      // this will randomly throw errors
      // return send(pair[0].signer, pair[0], pair[1].signer, amount, runConfig.symbol, undefined, 0, true)

      return send(pair[0].signer, pair[0], pair[1].signer, amount, runConfig.symbol)
    }, { concurrency: paralellizationAmount })

    if (i % 10 === 0) {
      console.log(`Finished iteration ${i}`)
    }

    data.push(resData)
  }

  const dataFlat = _.flatten(data)

  let getUnspentOutputsTimeTotal
  let getUnspentOutputsTimeAvg
  let querySpendTransactionOutputsTimeTotal
  let querySpendTransactionOutputsTimeAvg
  if (runConfig.apiReturnsTimes) {
    getUnspentOutputsTimeTotal = _.reduce(_.filter(dataFlat, r => r.res), (sum, res) => sum + res.times.getUnspentOutputsTime, 0)
    getUnspentOutputsTimeAvg = getUnspentOutputsTimeTotal / 1.0 / dataFlat.length

    querySpendTransactionOutputsTimeTotal = _.reduce(_.filter(dataFlat, r => r.res), (sum, res) => sum + res.times.querySpendTransactionOutputsTime, 0)
    querySpendTransactionOutputsTimeAvg = querySpendTransactionOutputsTimeTotal / 1.0 / dataFlat.length
  }
  
  const erroredCount = _.reduce(dataFlat, (sum, dataPoint) => sum + (dataPoint.res ? 0 : 1), 0)
  const averageResponse = _.reduce(dataFlat, (sum, dataPoint) => dataPoint.miliseconds ? sum + dataPoint.miliseconds : sum, 0) / (paralellizationAmount * iterations - erroredCount)

  const averageResponseByPair = _.map(_.range(paralellizationAmount), pairIndex => {
    const pairResponses = _.map(data, iterationData => iterationData[pairIndex])

    const erroredCount = _.reduce(pairResponses, (sum, dataPoint) => sum + (dataPoint.miliseconds ? 0 : 1), 0)
    const averageResponse = _.reduce(pairResponses, (sum, dataPoint) => sum + dataPoint.miliseconds, 0) / (iterations - erroredCount)

    return averageResponse
  })

  console.log('===============\nPERFORMANCE\n')
  console.log(`Average response (ms): ${averageResponse}ms`)

  if (runConfig.apiReturnsTimes) {
    console.log(`Unspent outputs calculation: ${getUnspentOutputsTimeAvg}`)
    console.log(`Spend outputs calculation  : ${querySpendTransactionOutputsTimeAvg}`)
  }
  
  console.log(`\n========\nAverage responses by pair (ms):\n${JSON.stringify(averageResponseByPair, null, 2)}`)
  console.log('\n\n===============\nERRORS\n')
  const totalErrors = _.reduce(dataFlat, (sum, dataPoint) => sum + (dataPoint.res ? 0 : 1), 0)
  
  const errorsByPair = _.map(_.range(paralellizationAmount), pairIndex => {
    const pairResponses = _.map(data, iterationData => iterationData[pairIndex])
    const averageResponse = _.reduce(pairResponses, (sum, dataPoint) => sum + (dataPoint.res ? 0 : 1), 0)

    return averageResponse
  })

  const errorsByIteration = _.map(_.range(iterations), iterationIndex => {
    const iterationResponses = data[iterationIndex]
    const averageResponse = _.reduce(iterationResponses, (sum, dataPoint) => sum + (dataPoint.res ? 0 : 1), 0)

    return averageResponse
  })

  console.log(`Total errors: ${totalErrors}`)
  console.log(`Errors by pair: ${errorsByPair}`)
  console.log(`Errors by iteration: ${errorsByIteration}`)

  if (runConfig.showAllRawResults) {
    console.log(`\n========\nRaw data (ms):\n${JSON.stringify(_.map(data, d => _.map(d, e => e.miliseconds)), null, 2)}`)
  }
}

async function scenario2({ simSize = SIM_SIZE.BIG }) {
  // SHORT SIMULATION
  // const TOTAL_CIRCULATION = 100
  // const FRAGMENT_COUNT = 100
  // const FRAGMENT_AMOUNT = TOTAL_CIRCULATION / FRAGMENT_COUNT
  // const LARGE_AMOUNT = 1
  // const MEDIUM_AMOUNT = 1
  // const SMALL_AMOUNT = 1
  // const MIDDLE_TRANSACTION_COUNT = 1

  // LONG SIMULATION
  // const TOTAL_CIRCULATION = 100000
  // const FRAGMENT_COUNT = 10000
  // const FRAGMENT_AMOUNT = TOTAL_CIRCULATION / FRAGMENT_COUNT
  // const LARGE_AMOUNT = FRAGMENT_AMOUNT * 1000
  // const MEDIUM_AMOUNT = FRAGMENT_AMOUNT * 100
  // const SMALL_AMOUNT = FRAGMENT_AMOUNT * 10
  // const MIDDLE_TRANSACTION_COUNT = 1

  const TOTAL_CIRCULATION = simSize === SIM_SIZE.BIG ? 100000 : 10
  const FRAGMENT_COUNT =  simSize === SIM_SIZE.BIG ? 10000 : 10
  const FRAGMENT_AMOUNT = TOTAL_CIRCULATION / FRAGMENT_COUNT
  const LARGE_AMOUNT = simSize === SIM_SIZE.BIG ? FRAGMENT_AMOUNT * 1000 : 1
  const MEDIUM_AMOUNT = simSize === SIM_SIZE.BIG ? FRAGMENT_AMOUNT * 100 : 1
  const SMALL_AMOUNT = simSize === SIM_SIZE.BIG ? FRAGMENT_AMOUNT * 10 : 1
  const MIDDLE_TRANSACTION_COUNT = 1

  console.log('Benchmark config:\n' + JSON.stringify({
    TOTAL_CIRCULATION,
    FRAGMENT_COUNT,
    FRAGMENT_AMOUNT,
    LARGE_AMOUNT,
    MEDIUM_AMOUNT,
    SMALL_AMOUNT,
    MIDDLE_TRANSACTION_COUNT,
  }, null, 2))

  // rojo first gets one big output it can spend
  console.log(`Issuing ${2 * TOTAL_CIRCULATION} to rojo`)
  await issue(`${2 * TOTAL_CIRCULATION}`, runConfig.rojo.signer)

  // rojo sends entire circulation in many small transactions to amarillo
  console.log(`Rojo sending total ${FRAGMENT_AMOUNT * FRAGMENT_COUNT} to Amarillo`)
  const rojoFragmentTimes = await bluebird.map(_.range(10), async r => {
    return send(runConfig.rojo.signer, runConfig.rojo, runConfig.amarillo.signer, `${FRAGMENT_AMOUNT}`, runConfig.symbol)
  }, { concurrency: 1 })
  
  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // spending 1000 outputs each
  console.log(`Amarillo sending total ${LARGE_AMOUNT * MIDDLE_TRANSACTION_COUNT} to Rojo`)
  const largeAmarilloTimes = await bluebird.map(_.range(MIDDLE_TRANSACTION_COUNT), async r => {
    return send(runConfig.amarillo.signer, runConfig.amarillo, runConfig.rojo.signer, `${LARGE_AMOUNT}`, runConfig.symbol, undefined)
  }, { concurrency: 1 })

  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // spending 100 outputs each
  console.log(`Amarillo sending total ${MEDIUM_AMOUNT * MIDDLE_TRANSACTION_COUNT} to Rojo`)
  const mediumAmarilloTimes = await bluebird.map(_.range(MIDDLE_TRANSACTION_COUNT), async r => {
    return send(runConfig.amarillo.signer, runConfig.amarillo, runConfig.rojo.signer, `${MEDIUM_AMOUNT}`, runConfig.symbol, undefined)
  }, { concurrency: 1 })

  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // spending 1000 outputs each
  console.log(`Amarillo sending total ${SMALL_AMOUNT * MIDDLE_TRANSACTION_COUNT} to Rojo`)
  const smallAmarilloTimes = await bluebird.map(_.range(MIDDLE_TRANSACTION_COUNT), async r => {
    return send(runConfig.amarillo.signer, runConfig.amarillo, runConfig.rojo.signer, `${SMALL_AMOUNT}`, runConfig.symbol)
  }, { concurrency: 1 })

  // amarillo still has a LOT of unspent outputs, send them back in a fragmented way
  const countToSend = FRAGMENT_COUNT 
    - (MIDDLE_TRANSACTION_COUNT * SMALL_AMOUNT / FRAGMENT_AMOUNT) 
    - (MIDDLE_TRANSACTION_COUNT * MEDIUM_AMOUNT / FRAGMENT_AMOUNT) 
    - (MIDDLE_TRANSACTION_COUNT * LARGE_AMOUNT / FRAGMENT_AMOUNT)

  console.log(`Amarillo sending total ${countToSend * FRAGMENT_AMOUNT} to Rojo`)
  const amarilloFragmentTimes = await bluebird.map(_.range(countToSend), async r => {
      return send(runConfig.amarillo.signer, runConfig.amarillo, runConfig.rojo.signer, `${FRAGMENT_AMOUNT}`, runConfig.symbol)
    },
  { concurrency: 1 })

  const rojoFragmentErrors = _.reduce(rojoFragmentTimes, (sum, res) => sum + res.res ? sum : sum + 1, 0)
  const largeAmarilloErrors = _.reduce(largeAmarilloTimes, (sum, res) => sum + res.res ? sum : sum + 1, 0)
  const mediumAmarilloErrors = _.reduce(mediumAmarilloTimes, (sum, res) => sum + res.res ? sum : sum + 1, 0)
  const smallAmarilloErrors = _.reduce(smallAmarilloTimes, (sum, res) => sum + res.res ? sum : sum + 1, 0)
  const amarilloFragmentErrors = _.reduce(amarilloFragmentTimes, (sum, res) => sum + res.res ? sum : sum + 1, 0)
  console.log(`ERRORS:\n${JSON.stringify({
    rojoFragmentErrors,
    largeAmarilloErrors,
    mediumAmarilloErrors,
    smallAmarilloErrors,
    amarilloFragmentErrors,
  }, null, 2)}`)

  const allTimes = _.concat(rojoFragmentTimes, largeAmarilloTimes, mediumAmarilloTimes, smallAmarilloTimes)
  const allResponsesTotalTime = _.reduce(_.filter(allTimes, r => r.res), (sum, res) => sum + res.miliseconds, 0)
  const allResponsesAverageTime = allResponsesTotalTime / 1.0 / allTimes.length

  const rojoFragmentTotalTime = _.reduce(_.filter(rojoFragmentTimes, r => r.res), (sum, res) => sum + res.miliseconds, 0)
  const rojoFragmentAverageTime = rojoFragmentTotalTime / 1.0 / rojoFragmentTimes.length

  const largeAmarilloTotalTime = _.reduce(_.filter(largeAmarilloTimes, r => r.res), (sum, res) => sum + res.miliseconds, 0)
  const largeAmarilloAverageTime = largeAmarilloTotalTime / 1.0 / largeAmarilloTimes.length

  const mediumAmarilloTotalTime = _.reduce(_.filter(mediumAmarilloTimes, r => r.res), (sum, res) => sum + res.miliseconds, 0)
  const mediumAmarilloAverageTime = mediumAmarilloTotalTime / 1.0 / mediumAmarilloTimes.length
  
  const smallAmarilloTotalTime = _.reduce(_.filter(smallAmarilloTimes, r => r.res), (sum, res) => sum + res.miliseconds, 0)
  const smallAmarilloAverageTime = smallAmarilloTotalTime / 1.0 / smallAmarilloTimes.length

  const amarilloFragmentTotalTime = _.reduce(_.filter(amarilloFragmentTimes, r => r.res), (sum, res) => sum + res.miliseconds, 0)
  const amarilloFragmentAverageTime = amarilloFragmentTotalTime / 1.0 / amarilloFragmentTimes.length

  console.log(`PERFORMANCE (ms):\n${JSON.stringify({
    allResponsesAverageTime: `${allResponsesAverageTime}ms`,
    rojoFragmentTotalTime: `${rojoFragmentTotalTime}ms`,
    rojoFragmentAverageTime: `${rojoFragmentAverageTime}ms`,
    largeAmarilloTotalTime: `${largeAmarilloTotalTime}ms`,
    largeAmarilloAverageTime: `${largeAmarilloAverageTime}ms`,
    mediumAmarilloTotalTime: `${mediumAmarilloTotalTime}ms`,
    mediumAmarilloAverageTime: `${mediumAmarilloAverageTime}ms`,
    smallAmarilloTotalTime: `${smallAmarilloTotalTime}ms`,
    smallAmarilloAverageTime: `${smallAmarilloAverageTime}ms`,
    amarilloFragmentTotalTime: `${amarilloFragmentTotalTime}ms`,
    amarilloFragmentAverageTime: `${amarilloFragmentAverageTime}ms`,
  }, null, 2)}`)

  if (runConfig.showAllRawResults) {
    console.log('\n\n=====================DETAILED TIME BREAKDOWN=====================\n')
  
    console.log('\nROJO FRAGMENT TIMES (ms)\n')
    console.log(JSON.stringify(_.map(rojoFragmentTimes, l => l.miliseconds)))
    
    console.log('\nAMARILLO FRAGMENT TIMES:\n')
    console.log(JSON.stringify(_.map(amarilloFragmentTimes, l => l.miliseconds)))

    console.log('\nAMARILLO MID TRANSACTION TIMES:\n')
    console.log(JSON.stringify(_.map(_.concat(largeAmarilloTimes, mediumAmarilloTimes, smallAmarilloTimes), l => l.miliseconds)))
  }
}

function runScenario1FullSuite() {
  const scenarioDesc = '1 - parallel transactions'
  const scenario = scenario1
  const scenarios = [
    {
      scenarioDesc,
      scenario,
      pairs: 5,
      iterations: 10,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 5,
      iterations: 50,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 20,
      iterations: 10,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 20,
      iterations: 50,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 50,
      iterations: 10,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 50,
      iterations: 50,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 100,
      iterations: 10,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 100,
      iterations: 50,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 200,
      iterations: 10,
    },
    {
      scenarioDesc,
      scenario,
      pairs: 500,
      iterations: 15,
    },
  ]
  
  bluebird.each(scenarios, async scenario => {
    console.log(`
    ===============
    +++++++++++++++
    ===============\n
    RUNNING SCENARIO - ${scenario.scenarioDesc}: ${scenario.pairs} pairs, ${scenario.iterations} iterations!
    \n    ===============
    +++++++++++++++
    ===============\n
    `)
    await scenario.scenario(scenario.pairs, scenario.iterations)
    await sleepAsync(10000)
  })
}

function runScenario2FullSuite() {
  const scenarioDesc = '2 - long running transaction chains'
  const scenario = scenario2
  const scenarios = [
    {
      scenarioDesc,
      scenario,
      simSize: SIM_SIZE.SMALL,
    },
    {
      scenarioDesc,
      scenario,
      simSize: SIM_SIZE.BIG,
    } 
  ]
  
  bluebird.each(scenarios, async scenario => {
    console.log(`
    ===============
    +++++++++++++++
    ===============\n
    RUNNING SCENARIO - ${scenario.scenarioDesc}: Size ${scenario.simSize}!
    \n    ===============
    +++++++++++++++
    ===============\n
    `)
    await scenario.scenario({ simSize: scenario.simSize })
    await sleepAsync(10000)
  })
}

// runScenario1FullSuite()
runScenario2FullSuite()

// runConfig.logLevel = 3
// scenario2({ simSize: SIM_SIZE.BIG })
//   .then(() => console.log('DONE'))

// scenario1(2, 5).then(() => console.log('DONE'))


