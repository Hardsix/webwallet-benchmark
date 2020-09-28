'use strict'
/* eslint-disable */

const request = require('request-promise')

// const sdk = require('@webwallet/sdk')
const sdk = require('@webwallet/sdk')
// const IOU = sdk.iou
// const KEY = sdk.keypair

let keys = [
  {
    // scheme: 'ecdsa-ed25519',
    // signer: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
    // secret: '05acee8fb661fa5400abd9cda23acf2921960ab8720b65ba55259353dad0ccf4',
    // public: '035c2dc518d580d446f095621c32b9455ca5796e0297e9de55a23e679d32d85578',
    scheme: 'ecdsa-ed25519',
    signer: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
    secret: '0e614b2069c575f7b848c87ebdbe2567150f79c720b5556507ce6aed00f3ac34',
    public:
      '03596a0b6e0d8ac185d28d9dccb8f8f1b262704d871a6c10a1eaa1234a034d1f80',
  },
]

let source = sdk.keypair.generate({ compressed: true })
let target = sdk.keypair.generate({ compressed: true })

source.signer = sdk.address.generate({ data: source.public })
target.signer = sdk.address.generate({ data: target.public })

// let bitcoin = sdk.address.generate({
//   data: '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352',
//   format: {prefix: '00'}
// })
// console.log(bitcoin)

// keys = [source]
let sourceAddress = keys[0].signer
// let targetAddress = target.signer
let targetAddress = 'wT99yCRnoYrN3KvTte3XhkUzjB9naFbwHo'
// let targetAddress = 'wPS1uaKU885qgZrZmB38db3LfW2rQN5hNb'
// let targetAddress = 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi'
// let targetAddress = 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq'

// console.log(keys[0])

let claims = {
  domain: 'localhost',
  source: sourceAddress,
  target: targetAddress,
  // symbol: sourceAddress,
  // symbol: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
  symbol: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
  amount: '100',
  // credit: '-100',
  custom: '26c3cb1c29aa19cc63b19f2c8ed95ad8ca434dba80021f87969ff7c48aa0dfbb',
  expiry: new Date(Date.now() + 60).toISOString(),
}

let iou = sdk.iou.write(claims).sign(keys)
let claims2 = { ...claims, target: 'wZVRbFCLJxWuJ4GDYTM3YUrmpBtEdeqzJk' }
let iou2 = sdk.iou.write(claims2).sign(keys)
let claims3 = { ...claims, target: 'wQiR9NHdVsHSaqZEHysBFX8H9ch67ELN8S' }
// let iou3 = sdk.iou.write(claims3).sign(keys)
// console.log('iou2', JSON.stringify([iou, iou2], null, 3))

// iou.meta.custom = {
//   data: {
//     labels: ['upload']
//   }
// }
// console.log(iou)
// console.log(iou.meta)
// console.log(JSON.stringify(iou, null, 3))

let options = {
  uri: 'http://localhost:8082' + '/transaction',
  method: 'POST',
  qs: {},
  headers: {
    'content-type': 'application/json',
  },
  body: {
    data: {
      inputs: [iou],
      // inputs: [iou, iou2, iou3]
    },
    // sigs: []
  },
  json: true, // Automatically parses the JSON string in the response
}

// iou.meta.signatures[0].string = '304402200813081fe53a01aa685327d41b4fa6325adab4dfb47d67ec651154c3ef19b8090220036fe45c4b3635b30240da5ce8264348d452ee80733014fa170b569dc1133f39'

request(options)
  .then((response) => console.log(JSON.stringify(response, null, 2)))
  .catch((response) => console.log(JSON.stringify(response.message, null, 2)))
