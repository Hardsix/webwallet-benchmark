const sdk = require('@webwallet/sdk')
const bs58check = require('bs58check')
const request = require('request-promise')
const _ = require('lodash')
const bluebird = require('bluebird')

const defaultDate = (new Date(2023)).toISOString()

interface Entity {
  scheme: string
  public: string
  secret: string
  signer: string
}

const issuer: Entity = {
  scheme: "ecdsa-ed25519",
  public: "0423f8b192884eb5d71802fb50f21068fa43c9733893a6d4bb420e2827647cb728178dfe197957c127ee6851250611d9205ed9a5435034f0169580e899e7b32282",
  secret: "03ead306f42e95861bed33effe37f2bc2720d5f8da3ba286b358d78cfff245af",
  signer: "wdEHHkz5FLAvb2UfmCSrw1w9Dn87reYuSP"
}

const SYMBOL = issuer.signer

const rojo: Entity = {
  scheme: "ecdsa-ed25519",
  public: "040847a066ec3d86b2766a2fad0331e64c34ce45d1e457c45b6eb5d171bd5143ce6b6873efd10ce0dba3001bea8d85fe2ab02c80dca3b00083b78f503dd0ce0275",
  secret: "043cae98277b4cb909d2b81559ab907e9ae5321e790678494634bfcdea2b722d",
  signer: "wbmMFVkmphCeb5QEXdTqfXp52EatuE1Quu"
}

const amarillo: Entity = {
  scheme: "ecdsa-ed25519",
  public: "04147f1c7d498559279b322ff5023b206fb7c138208f8b957810740124fdf4cadd5ae9f8fa1729f286c8922ba096e987e52c72ebfdf4382b3101e133225f3afa54",
  secret: "9a4811f1b5af9a810d2a89e172c24ff8a4bbb130d841d565c727d725f6d3a7",
  signer: "wc3Kgynkv96bK6Ukef3TrhP4CvZPkxQ1un"
}

async function send(sourceAddress: string, sourceKeys: Entity, targetAddress: string, amount: string, symbol: string, expiry: string = defaultDate, logging: boolean = false) {
  /* Prepare IOU claims */
  let claims = {
    domain: 'localhost',
    source: sourceAddress,
    target: targetAddress,
    amount,
    symbol,
    expiry: (new Date(2023)).toISOString()
  }

  /* Write and sign IOU */
  let signers = [sourceKeys]

  let iou = sdk.iou.write(claims).sign(signers)

  /* Build transaction request body */
  let body = {
    data: {
      inputs: [iou]
    }
  }

  /* Send transaction request */
  // console.log(`${JSON.stringify(iou, null, 2)}`)
  if (logging) {
    console.log(`Sending ${amount} ${symbol} from ${sourceAddress} to ${targetAddress}`)
  }

  try {
    const res = await request({
      method: 'POST',
      uri: 'http://localhost:8082/transaction',
      body,
      headers: {
        'content-type': 'application/json',
      },
      json: true,
    })
    
    console.log('IOU dispatched!')
  } catch (err) {
    console.log('ERROR OCCURRED')
    // console.log(`Error occurred: ${JSON.stringify(err, null, 2)}`)
    return
  }
}

async function issue(amount: string, targetAddress: string) {
  await send(issuer.signer, issuer, targetAddress, amount, SYMBOL)
}

async function main() {
  // rojo first gets one big output it can spend
  issue('1000000', rojo.signer)

  // rojo sends 1.000.000 in many small transactions to amarillo
  const rojoFragmentTimes = await bluebird.map(_.range(100000), async r => {
    const hrstart = process.hrtime()

    await send(rojo.signer, rojo, amarillo.signer, '10', SYMBOL)

    const hrend = process.hrtime(hrstart)
    console.log(`GOT IT IN ${hrend[1] / 1000000} miliseconds!`)
    return hrend[1] / 1000000 // miliseconds
  }, { concurrency: 5 })

  // since amarillo now has a LOT of unspent outputs, it now tries to spend them by sending back 10 transactions one by one,
  // each transaction being 1000 (spends 100 outputs)
  const responsesToBigAmarillo = await bluebird.each(_.range(10), async r => {
    const res = await send(amarillo.signer, amarillo, rojo.signer, '1000', SYMBOL)
  }, { concurrency: 5 })

  // amarillo still has a LOT of unspent outputs amounting to 990.000, and it sends them back in a fragmented way
  const responsesToAmarillo = await bluebird.map(_.range(99000), async r => {
    const res = await send(amarillo.signer, amarillo, rojo.signer, '10', SYMBOL)
  }, { concurrency: 5 })
}

main()
  .then(() => console.log('DONE'))
