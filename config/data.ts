const defaultDate = (new Date(2023)).toISOString()

const WALLET_URIS = {
  PRODUCTION: 'http://web-wallet-dot-core-prd.appspot.com/transaction',
  LOCAL: 'http://localhost:8082/transaction',
  GCP_FUTURE: 'http://34.77.237.255:8081/transaction',
  GCP_LEGACY: 'http://34.78.22.71:8081/transaction',
  GCP_TST: 'http://web-wallet-dot-core-tst.appspot.com/transaction',
  GCP_STG: 'https://web-wallet-dot-core-stg.appspot.com/transaction',
}

interface Entity {
  scheme: string
  public: string
  secret: string
  signer: string
}

function getEntitiesData() {
  const issuer: Entity = {
    scheme: "ecdsa-ed25519",
    public: "040847a066ec3d86b2766a2fad0331e64c34ce45d1e457c45b6eb5d171bd5143ce6b6873efd10ce0dba3001bea8d85fe2ab02c80dca3b00083b78f503dd0ce0275",
    secret: "043cae98277b4cb909d2b81559ab907e9ae5321e790678494634bfcdea2b722d",
    signer: "wbmMFVkmphCeb5QEXdTqfXp52EatuE1Quu"
  }
  
  const rojo: Entity = {
    scheme: "ecdsa-ed25519",
    public: "0423f8b192884eb5d71802fb50f21068fa43c9733893a6d4bb420e2827647cb728178dfe197957c127ee6851250611d9205ed9a5435034f0169580e899e7b32282",
    secret: "03ead306f42e95861bed33effe37f2bc2720d5f8da3ba286b358d78cfff245af",
    signer: "wdEHHkz5FLAvb2UfmCSrw1w9Dn87reYuSP"
  }
  
  const amarillo: Entity = {
    scheme: "ecdsa-ed25519",
    public: "04147f1c7d498559279b322ff5023b206fb7c138208f8b957810740124fdf4cadd5ae9f8fa1729f286c8922ba096e987e52c72ebfdf4382b3101e133225f3afa54",
    secret: "9a4811f1b5af9a810d2a89e172c24ff8a4bbb130d841d565c727d725f6d3a7",
    signer: "wc3Kgynkv96bK6Ukef3TrhP4CvZPkxQ1un"
  }
  
  const TIN_SYMBOL_PRD = 'wd7VoAD3PzRdRRuKUbSUzL2gFgSD4Z8HRC'
  const moviiPrd: Entity = {
      scheme: "ecdsa-ed25519",
      public: "04147f1c7d498559279b322ff5023b206fb7c138208f8b957810740124fdf4cadd5ae9f8fa1729f286c8922ba096e987e52c72ebfdf4382b3101e133225f3afa54",
      secret: "9a4811f1b5af9a810d2a89e172c24ff8a4bbb130d841d565c727d725f6d3a7",
      signer: "wVCmBRk2jz5fBi47kpzGZezoovzfudv6L2"
    }
    
  const TIN_SYMBOL_STG = "wMxKCAzsQBiUURDU3xD3xuSbVo1S9jmf3d"
  const testBank1: Entity = {
    "public": "0406684e8cb6236b220c43cff448751a2b0b2f917182ccc5e62687565b84bbb59426b0905274b27cbb0f4abfd07747d028eda63a6a2867d8bbcbd64106273a5fe6",
    "scheme": "ecdsa-ed25519",
    "secret": "0e38ddcac886fc8982168e78eff215b08ff38e5d40fbb13597d8a6977aff36ab",
    "signer": "whmFECWeYG45LxhFMNUg7y6qFSnXkhThoj",
  }

  return {
    local: {
      issuer,
      rojo,
      amarillo,
    },
    prod: {
      TIN_SYMBOL_PRD,
      moviiPrd,
    },
    stg: {
      TIN_SYMBOL_STG,
      testBank1,
    }
  }
}

const entitiesData = getEntitiesData()

export {
  WALLET_URIS,
  Entity,
  defaultDate,
  entitiesData,
}

