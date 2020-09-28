const sdk = require('@webwallet/sdk')
const bs58check = require('bs58check')
const request = require('request-promise')

const defaultDate = (new Date(2023)).toISOString()

async function send(source: string, sourceSigner: string, target: string, amount: string, symbol: string, expiry: string = defaultDate, logging: boolean = false) {
  /* Prepare IOU claims */
  let claims = {
    domain: 'localhost',
    source: source,
    target: target,
    amount,
    symbol,
    expiry: (new Date(2023)).toISOString()
  }

  /* Write and sign IOU */
  let signers = [sourceSigner]

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
    console.log(`Sending ${amount} ${symbol} from ${source} to ${target}`)
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

async function main() {
  /* Generate cryptographic keys and addresses */
  let source = sdk.keypair.generate()
  let target = sdk.keypair.generate()

  /* Generate wallet addresses from public keys */

  source.signer = sdk.address.generate({ data: source.public })
  target.signer = sdk.address.generate({ data: target.public })

  await send(source.signer, source, target.signer, '10', source.signer)
}

main()
  .then(() => console.log('DONE'))
