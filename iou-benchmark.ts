const sdk = require("@webwallet/sdk");
const bs58check = require("bs58check");
const request = require("request-promise");
const _ = require("lodash");
const bluebird = require("bluebird");

const defaultDate = new Date(2023).toISOString();

const WALLET_URIS = {
  PRODUCTION: "http://web-wallet-dot-core-prd.appspot.com/transaction",
  LOCAL: "http://localhost:8082/transaction",
  GCP_FUTURE: "http://34.77.237.255:8081/transaction",
  GCP_LEGACY: "http://34.78.22.71:8081/transaction",
};

const TIN = "wd7VoAD3PzRdRRuKUbSUzL2gFgSD4Z8HRC";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface Entity {
  scheme: string;
  public: string;
  secret: string;
  signer: string;
}

// const issuer: Entity = {
//   scheme: "ecdsa-ed25519",
//   public: "040847a066ec3d86b2766a2fad0331e64c34ce45d1e457c45b6eb5d171bd5143ce6b6873efd10ce0dba3001bea8d85fe2ab02c80dca3b00083b78f503dd0ce0275",
//   secret: "043cae98277b4cb909d2b81559ab907e9ae5321e790678494634bfcdea2b722d",
//   signer: "wbmMFVkmphCeb5QEXdTqfXp52EatuE1Quu"
// }

// const SYMBOL = issuer.signer
const SYMBOL = "wd7VoAD3PzRdRRuKUbSUzL2gFgSD4Z8HRC"; // TIN

// const rojo: Entity = {
//   scheme: "ecdsa-ed25519",
//   public: "0423f8b192884eb5d71802fb50f21068fa43c9733893a6d4bb420e2827647cb728178dfe197957c127ee6851250611d9205ed9a5435034f0169580e899e7b32282",
//   secret: "03ead306f42e95861bed33effe37f2bc2720d5f8da3ba286b358d78cfff245af",
//   signer: "wdEHHkz5FLAvb2UfmCSrw1w9Dn87reYuSP"
// }

const amarillo: Entity = {
  scheme: "ecdsa-ed25519",
  public:
    "04147f1c7d498559279b322ff5023b206fb7c138208f8b957810740124fdf4cadd5ae9f8fa1729f286c8922ba096e987e52c72ebfdf4382b3101e133225f3afa54",
  secret: "9a4811f1b5af9a810d2a89e172c24ff8a4bbb130d841d565c727d725f6d3a7",
  signer: "wc3Kgynkv96bK6Ukef3TrhP4CvZPkxQ1un",
};

const movii: Entity = {
  scheme: "ecdsa-ed25519",
  public:
    "04147f1c7d498559279b322ff5023b206fb7c138208f8b957810740124fdf4cadd5ae9f8fa1729f286c8922ba096e987e52c72ebfdf4382b3101e133225f3afa54",
  secret: "9a4811f1b5af9a810d2a89e172c24ff8a4bbb130d841d565c727d725f6d3a7",
  signer: "wVCmBRk2jz5fBi47kpzGZezoovzfudv6L2",
};
const rojo = movii;
const issuer = movii;

// issuer.scheme = movii.scheme
// issuer.public = movii.public
// issuer.secret = movii.secret
// issuer.signer = movii.signer

async function send(
  sourceAddress: string,
  sourceKeys: Entity,
  targetAddress: string,
  amount: string,
  symbol: string,
  expiry: string = defaultDate,
  logging: boolean = true
): Promise<{ res; miliseconds: number; times: object }> {
  /* Prepare IOU claims */
  let claims = {
    domain: "localhost",
    source: sourceAddress,
    target: targetAddress,
    amount,
    symbol,
    expiry: new Date(2023).toISOString(),
  };

  /* Write and sign IOU */
  let signers = [sourceKeys];

  let iou = sdk.iou.write(claims).sign(signers);

  /* Build transaction request body */
  let body = {
    data: {
      inputs: [iou],
    },
  };

  /* Send transaction request */
  // console.log(`${JSON.stringify(iou, null, 2)}`)
  if (logging) {
    console.log(`Sending ${amount} ${symbol} from ${sourceAddress} to ${targetAddress}`);
  }

  try {
    const hrstart = process.hrtime();
    const res = await request({
      method: "POST",
      uri: WALLET_URIS.LOCAL,
      body,
      headers: {
        "content-type": "application/json",
      },
      json: true,
    });
    const hrend = process.hrtime(hrstart);

    if (logging) {
      console.log("IOU dispatched!");
    }

    const miliseconds = hrend[0] * 1000000 + hrend[1] / 1000000;
    if (logging) {
      console.log(`Finished one in ${hrend[0]}s ${hrend[1] / 1000000}ms with:\n${JSON.stringify(res.times, null, 2)}`);
    }

    return {
      res,
      miliseconds,
      times: res.times,
    };
  } catch (err) {
    if (!logging) {
      console.log("ERROR OCCURRED");
    } else {
      console.log(`Error occurred: ${JSON.stringify(err, null, 2)}`);
    }

    return {
      res: null,
      miliseconds: null,
      times: null,
    };
  }
}

async function issue(amount: string, targetAddress: string, issuerEntity: Entity = issuer): Promise<void> {
  await send(issuerEntity.signer, issuerEntity, targetAddress, amount, SYMBOL, undefined, false);
}

const SIM_SIZE = {
  SMALL: "small",
  BIG: "big",
};

/* SCENARIOS

1) Many transactions at once, every transaction between a 
PARALLELIZATION_AMOUNT of different pair of addresses (different source, different target, they repeat in every batch)
- 10 in parallel, 50, 100, 500

2) Ping - send to another address, repeatedly, around 10000 times
- 1 by 1

*/

function generateEntity(): Entity {
  const entity: Entity = sdk.keypair.generate({ compressed: true });
  entity.signer = sdk.address.generate({ data: entity.public });

  return entity;
}

async function scenario1(paralellizationAmount: number, iterations: number) {
  const amount = "10";
  const issuanceAmount = paralellizationAmount * iterations * parseInt(amount);
  const entities = _.map(_.range(paralellizationAmount * 2), (a) => generateEntity());

  // fund all entities with enough money
  await bluebird.map(entities, async (e) => issue(`${issuanceAmount}`, e.signer), { concurrency: 1 });

  // build unique entity pairs - first to second, third to fourth etc.
  const pairs = _.chunk(entities, 2); // access pairs by indices

  // send parallelizationAmount of transactions between selected pairs, for iterations times
  // pairs must be completely unique (no overlap of source OR target)
  const data = [];
  for (let i = 0; i < iterations; i++) {
    const resData = await bluebird.map(
      pairs,
      (pair) => {
        return send(pair[0].signer, pair[0], pair[1].signer, amount, SYMBOL);
      },
      { concurrency: paralellizationAmount }
    );

    if (i % 10 === 0) {
      console.log(`Finished iteration ${i}`);
    }

    data.push(resData);
  }

  const dataFlat = _.flatten(data);

  // "setupTime": 7.287783,
  // "getUnspentOutputsTime": 251.173786,
  // "getOutputContentsTime": 514.898528,
  // "feedPreviousToOutputsTime": 0.561477,
  // "feedInputsToOutputsTime": 0.153722,
  // "buildDocumentTime": 0.532815,
  // "storeTransactionRecordTime": 212.119642,
  // "querySpendTransactionOutputsTime": 349.067399

  const getUnspentOutputsTimeTotal = _.reduce(
    _.filter(dataFlat, (r) => r.res),
    (sum, res) => sum + res.times.getUnspentOutputsTime,
    0
  );
  const getUnspentOutputsTimeAvg = getUnspentOutputsTimeTotal / 1.0 / dataFlat.length;

  const querySpendTransactionOutputsTimeTotal = _.reduce(
    _.filter(dataFlat, (r) => r.res),
    (sum, res) => sum + res.times.querySpendTransactionOutputsTime,
    0
  );
  const querySpendTransactionOutputsTimeAvg = querySpendTransactionOutputsTimeTotal / 1.0 / dataFlat.length;

  const erroredCount = _.reduce(dataFlat, (sum, dataPoint) => (sum + dataPoint.res ? 0 : 1), 0);
  const averageResponse =
    _.reduce(dataFlat, (sum, dataPoint) => (dataPoint.miliseconds ? sum + dataPoint.miliseconds : sum), 0) /
    (paralellizationAmount * iterations - erroredCount);

  const averageResponseByPair = _.map(_.range(paralellizationAmount), (pairIndex) => {
    const pairResponses = _.map(data, (iterationData) => iterationData[pairIndex]);

    const erroredCount = _.reduce(pairResponses, (sum, dataPoint) => (sum + dataPoint.miliseconds ? 0 : 1), 0);
    const averageResponse =
      _.reduce(pairResponses, (sum, dataPoint) => sum + dataPoint.miliseconds, 0) / (iterations - erroredCount);

    return averageResponse;
  });

  const averageResponseByIteration = _.map(_.range(iterations), (iterationIndex) => {
    const iterationResponses = data[iterationIndex];

    const erroredCount = _.reduce(iterationResponses, (sum, dataPoint) => (sum + dataPoint.miliseconds ? 0 : 1), 0);
    const averageResponse =
      _.reduce(iterationResponses, (sum, dataPoint) => sum + dataPoint.miliseconds, 0) /
      (paralellizationAmount - erroredCount);

    return averageResponse;
  });

  console.log("===============\nPERFORMANCE\n");

  console.log(`Average response: ${averageResponse}`);

  console.log(`Unspent outputs calculation: ${getUnspentOutputsTimeAvg}`);
  console.log(`Spend outputs calculation  : ${querySpendTransactionOutputsTimeAvg}`);

  console.log(`\n========\nAverage responses by pair:\n${JSON.stringify(averageResponseByPair, null, 2)}`);
  console.log(`\n========\nAverage responses by iteration:\n${JSON.stringify(averageResponseByIteration, null, 2)}`);

  console.log("\n\n===============\nERRORS\n");
  const totalErrors = _.reduce(dataFlat, (sum, dataPoint) => (sum + dataPoint.res ? 0 : 1), 0);

  const errorsByPair = _.map(_.range(paralellizationAmount), (pairIndex) => {
    const pairResponses = _.map(data, (iterationData) => iterationData[pairIndex]);
    const averageResponse = _.reduce(pairResponses, (sum, dataPoint) => (sum + dataPoint.res ? 0 : 1), 0);

    return averageResponse;
  });

  const errorsByIteration = _.map(_.range(iterations), (iterationIndex) => {
    const iterationResponses = data[iterationIndex];
    const averageResponse = _.reduce(iterationResponses, (sum, dataPoint) => (sum + dataPoint.res ? 0 : 1), 0);

    return averageResponse;
  });

  console.log(`Total errors: ${totalErrors}`);
  console.log(`Errors by pair: ${errorsByPair}`);
  console.log(`Errors by iteration: ${errorsByIteration}`);

  console.log(
    `\n========\nRaw data:\n${JSON.stringify(
      _.map(data, (d) => _.map(d, (e) => e.miliseconds)),
      null,
      2
    )}`
  );
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

  const TOTAL_CIRCULATION = simSize === SIM_SIZE.BIG ? 100000 : 10;
  const FRAGMENT_COUNT = simSize === SIM_SIZE.BIG ? 10000 : 10;
  const FRAGMENT_AMOUNT = TOTAL_CIRCULATION / FRAGMENT_COUNT;
  const LARGE_AMOUNT = simSize === SIM_SIZE.BIG ? FRAGMENT_AMOUNT * 1000 : 1;
  const MEDIUM_AMOUNT = simSize === SIM_SIZE.BIG ? FRAGMENT_AMOUNT * 100 : 1;
  const SMALL_AMOUNT = simSize === SIM_SIZE.BIG ? FRAGMENT_AMOUNT * 10 : 1;
  const MIDDLE_TRANSACTION_COUNT = 1;

  console.log(
    "Benchmark config:\n" +
      JSON.stringify(
        {
          TOTAL_CIRCULATION,
          FRAGMENT_COUNT,
          FRAGMENT_AMOUNT,
          LARGE_AMOUNT,
          MEDIUM_AMOUNT,
          SMALL_AMOUNT,
          MIDDLE_TRANSACTION_COUNT,
        },
        null,
        2
      )
  );

  // rojo first gets one big output it can spend
  console.log(`Issuing ${2 * TOTAL_CIRCULATION} to rojo`);
  // await issue(`${2 * TOTAL_CIRCULATION}`, rojo.signer)

  // rojo sends entire circulation in many small transactions to amarillo
  console.log(`Rojo sending total ${FRAGMENT_AMOUNT * FRAGMENT_COUNT} to Amarillo`);
  const rojoFragmentTimes = await bluebird.map(
    _.range(10),
    async (r) => {
      return send(rojo.signer, rojo, amarillo.signer, `${FRAGMENT_AMOUNT}`, SYMBOL);
    },
    { concurrency: 1 }
  );

  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // spending 1000 outputs each
  console.log(`Amarillo sending total ${LARGE_AMOUNT * MIDDLE_TRANSACTION_COUNT} to Rojo`);
  const largeAmarilloTimes = await bluebird.map(
    _.range(MIDDLE_TRANSACTION_COUNT),
    async (r) => {
      return send(amarillo.signer, amarillo, rojo.signer, `${LARGE_AMOUNT}`, SYMBOL, undefined);
    },
    { concurrency: 1 }
  );

  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // spending 100 outputs each
  console.log(`Amarillo sending total ${MEDIUM_AMOUNT * MIDDLE_TRANSACTION_COUNT} to Rojo`);
  const mediumAmarilloTimes = await bluebird.map(
    _.range(MIDDLE_TRANSACTION_COUNT),
    async (r) => {
      return send(amarillo.signer, amarillo, rojo.signer, `${MEDIUM_AMOUNT}`, SYMBOL, undefined);
    },
    { concurrency: 1 }
  );

  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // spending 1000 outputs each
  console.log(`Amarillo sending total ${SMALL_AMOUNT * MIDDLE_TRANSACTION_COUNT} to Rojo`);
  const smallAmarilloTimes = await bluebird.map(
    _.range(MIDDLE_TRANSACTION_COUNT),
    async (r) => {
      return send(amarillo.signer, amarillo, rojo.signer, `${SMALL_AMOUNT}`, SYMBOL);
    },
    { concurrency: 1 }
  );

  // amarillo still has a LOT of unspent outputs, send them back in a fragmented way
  const countToSend =
    FRAGMENT_COUNT -
    (MIDDLE_TRANSACTION_COUNT * SMALL_AMOUNT) / FRAGMENT_AMOUNT -
    (MIDDLE_TRANSACTION_COUNT * MEDIUM_AMOUNT) / FRAGMENT_AMOUNT -
    (MIDDLE_TRANSACTION_COUNT * LARGE_AMOUNT) / FRAGMENT_AMOUNT;

  console.log(`Amarillo sending total ${countToSend * FRAGMENT_AMOUNT} to Rojo`);
  const amarilloFragmentTimes = await bluebird.map(
    _.range(countToSend),
    async (r) => {
      return send(amarillo.signer, amarillo, rojo.signer, `${FRAGMENT_AMOUNT}`, SYMBOL);
    },
    { concurrency: 1 }
  );

  const rojoFragmentErrors = _.reduce(rojoFragmentTimes, (sum, res) => (sum + res.res ? sum : sum + 1), 0);
  const largeAmarilloErrors = _.reduce(largeAmarilloTimes, (sum, res) => (sum + res.res ? sum : sum + 1), 0);
  const mediumAmarilloErrors = _.reduce(mediumAmarilloTimes, (sum, res) => (sum + res.res ? sum : sum + 1), 0);
  const smallAmarilloErrors = _.reduce(smallAmarilloTimes, (sum, res) => (sum + res.res ? sum : sum + 1), 0);
  const amarilloFragmentErrors = _.reduce(amarilloFragmentTimes, (sum, res) => (sum + res.res ? sum : sum + 1), 0);
  console.log(
    `ERRORS:\n${JSON.stringify(
      {
        rojoFragmentErrors,
        largeAmarilloErrors,
        mediumAmarilloErrors,
        smallAmarilloErrors,
        amarilloFragmentErrors,
      },
      null,
      2
    )}`
  );

  const rojoFragmentTotalTime = _.reduce(
    _.filter(rojoFragmentTimes, (r) => r.res),
    (sum, res) => sum + res.miliseconds,
    0
  );
  const rojoFragmentAverageTime = rojoFragmentTotalTime / 1.0 / rojoFragmentTimes.length;

  const largeAmarilloTotalTime = _.reduce(
    _.filter(largeAmarilloTimes, (r) => r.res),
    (sum, res) => sum + res.miliseconds,
    0
  );
  const largeAmarilloAverageTime = largeAmarilloTotalTime / 1.0 / largeAmarilloTimes.length;

  const mediumAmarilloTotalTime = _.reduce(
    _.filter(mediumAmarilloTimes, (r) => r.res),
    (sum, res) => sum + res.miliseconds,
    0
  );
  const mediumAmarilloAverageTime = mediumAmarilloTotalTime / 1.0 / mediumAmarilloTimes.length;

  const smallAmarilloTotalTime = _.reduce(
    _.filter(smallAmarilloTimes, (r) => r.res),
    (sum, res) => sum + res.miliseconds,
    0
  );
  const smallAmarilloAverageTime = smallAmarilloTotalTime / 1.0 / smallAmarilloTimes.length;

  const amarilloFragmentTotalTime = _.reduce(
    _.filter(amarilloFragmentTimes, (r) => r.res),
    (sum, res) => sum + res.miliseconds,
    0
  );
  const amarilloFragmentAverageTime = amarilloFragmentTotalTime / 1.0 / amarilloFragmentTimes.length;

  console.log(
    `PERFORMANCE:\n${JSON.stringify(
      {
        rojoFragmentTotalTime,
        rojoFragmentAverageTime,
        largeAmarilloTotalTime,
        largeAmarilloAverageTime,
        mediumAmarilloTotalTime,
        mediumAmarilloAverageTime,
        smallAmarilloTotalTime,
        smallAmarilloAverageTime,
        amarilloFragmentTotalTime,
        amarilloFragmentAverageTime,
      },
      null,
      2
    )}`
  );

  console.log("\n\n=====================DETAILED TIME BREAKDOWN=====================\n");

  console.log("\nROJO FRAGMENT TIMES:\n");
  console.log(JSON.stringify(_.map(rojoFragmentTimes, (l) => l.miliseconds)));

  console.log("\nAMARILLO FRAGMENT TIMES:\n");
  console.log(JSON.stringify(_.map(amarilloFragmentTimes, (l) => l.miliseconds)));

  console.log("\nAMARILLO MID TRANSACTION TIMES:\n");
  console.log(
    JSON.stringify(_.map(_.concat(largeAmarilloTimes, mediumAmarilloTimes, smallAmarilloTimes), (l) => l.miliseconds))
  );
}

scenario2({ simSize: SIM_SIZE.SMALL }).then(() => console.log("DONE"));

// scenario1(100, 10).then(() => console.log('DONE'))
