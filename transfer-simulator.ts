const { ApiClient, TransferApi, LinkApi } = require('../shared/tinapi/dist')
const bb = require('bluebird')

const secrets = {
  amarillo: {
    apiKey: 'db70532fe8187ea1b4209589f096a19ef4d70c5ce389433172f47d7b',
    clientId: 'fb10d5fe7d8340a6d4410ac2f2bf53f5',
    clientSecret: '29f8bb84a2a89fc60d67ccc6e0740f4e3c078637fe9c638f'
  },
  rojo: {
    apiKey: '4333dfbb17cc46575ae9d86f1cae0d7b57b87d52775e4b16c52a5e25',
    clientId: '76655f61416871123b07ea9ad5629c91',
    clientSecret: 'd401f1e8283dc2b34f0a12e1af11480681f8dd7f68e02363'
  }
}

const config = {
  rojoUser: {
    wallet: 'wWgafa3Ajf323d6MTDYbFbKt9Q7WteSzBL',
    ref: '$573120021844',
  },
  amarilloUser: {
    wallet: 'weJg7f2fF5v6pV7Eh7wdBHi68K1SQrsjMg',
    ref: '$573010071856',
  },
}


const createClient = (secrets) => {
  const apiClient = new ApiClient()
  apiClient.basePath = 'localhost'
  
  const apiKeyAuth = apiClient.authentications.apiKeyAuth
  apiKeyAuth.apiKey = secrets.apiKey
  
  const apiTokenAuth = apiClient.authentications.apiTokenAuth
  apiTokenAuth.clientId = secrets.clientId
  apiTokenAuth.clientSecret = secrets.clientSecret
  
  const transferClient = new TransferApi(apiClient)
  const linkClient = new LinkApi(apiClient)

  return {
    apiClient,
    transferClient,
    linkClient,
  }
}

const createLinks = async (amarillo, rojo) => {
  const linkToRojoOptions = {
    source: config.amarilloUser.ref,
    target: config.rojoUser.wallet,
    type: 'TRUST',
  }

  const linkToAmarilloOptions = {
    source: config.rojoUser.ref,
    target: config.amarilloUser.wallet,
    type: 'TRUST',
  }

  try {
    const existingLinksToRojo = (await rojo.linkClient.getLinks(linkToRojoOptions))?.entities
    const existingRojoLink = existingLinksToRojo?.length > 0 ? existingLinksToRojo[0] : undefined
    const linkToRojo = existingRojoLink ? existingRojoLink : await rojo.linkClient.createLink(linkToRojoOptions)
    
    const existingLinksToAmarillo = (await amarillo.linkClient.getLinks(linkToAmarilloOptions))?.entities
    const existingAmarilloLink = existingLinksToAmarillo?.length > 0 ? existingLinksToAmarillo[0] : undefined
    const linkToAmarillo = existingAmarilloLink ? existingAmarilloLink : await amarillo.linkClient.createLink(linkToAmarilloOptions)

    return {
      linkToRojo,
      linkToAmarillo,
    }
  } catch (err) {
    console.log(err);
    throw err
  } 
}

const sendTo = async (srcClient, sourceWallet, targetRef, amount) => {
  const res = await srcClient.transferClient.createTinTransfer({
    source: sourceWallet,
    target: targetRef,
    symbol: "$tin",
    amount: `${amount}`,
    labels: {
      description: "QA - testing flow",
      domain: "tin",
      message: "Money for food",
      type: "SEND",
      sourceChannel: "APP",
      deviceFingerPrint: {
        hash: "26fff5af6441f8e15a71e8d62c361714484b1b308c99e8eb68ca85e2a7e0dc58",
        ipAddress: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        country: "Colombia",
        city: "Bogotá",
        mobileDevice: "990000862471854",
        SIMCardId: "8991101200003204510",
        model: "Huawei Mate 20 Pro",
        operator: "Bharti Airtel Limited"
      },
      config: {
        upload: {
          async: true
        },
        download: {
          async: true
        }
      }
    }
  })

  console.log('Another one')

  return res
}

const setUp = async () => {
  const amarillo = createClient(secrets.amarillo)
  const rojo = createClient(secrets.rojo)
  
  const { linkToRojo, linkToAmarillo } = await createLinks(amarillo, rojo)
  
  await bb.map(Array.from(Array(1).keys()), async a => {
    try {
      await sendTo(rojo, config.rojoUser.wallet, config.amarilloUser.ref, 14)
    } catch (err) {
      console.log(err)
    }
    
  }, { concurrency: 1 })
  
}

setUp()