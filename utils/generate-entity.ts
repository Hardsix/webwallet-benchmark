import { Entity } from '../config/data'
const sdk = require('@webwallet/sdk')

export function generateEntity(): Entity {
  const entity: Entity = sdk.keypair.generate({ compressed: true })
  entity.signer = sdk.address.generate({ data: entity.public })

  return entity
}
