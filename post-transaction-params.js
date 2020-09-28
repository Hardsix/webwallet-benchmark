const S_U_S = {
  id: '7baac30508079f9748f1e76e033b38982c23fc0e06b23f9f5e5862e753aa71a6',
  inputs: [
    {
      index: 0,
      value: '53972f816cae508cdc2b5ee6fdc78cd2961307394dc99159cd457b05cd199d41',
    },
  ],
  countspaces: [
    // {
    //   symbol: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
    //   sources: ['4fe8e93bddb9a8b632fbe101210460edfc27e14e7206d862ee9fb0dfa97614bd']
    // },
    {
      symbol: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
      sources: [
        'f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882',
        // '4fe8e93bddb9a8b632fbe101210460edfc27e14e7206d862ee9fb0dfa97614bd'
      ],
      outputs: [
        {
          index: 0,
          address: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
          sources: [
            'f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882::0',
          ],
        },
        {
          index: 1,
          address: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
          sources: [
            'f37847fabb89244bbf1797e3120ba48b1bc6aabae3a3bc0c778d067f48073882::1',
          ],
        },
      ],
    },
  ],
}

const S_U_S_2 = {
  id: 'bca775dd2a8f3daccc4654692992f5b969db12db62611543407145841edf3e48',
  countspaces: [
    {
      symbol: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
      inputs: [
        {
          index: 0,
          value:
            'adc640a16064906be972a959d13cfd5276ef4f1bd1ef767afd27f1bad52e2a5a',
        },
      ],
      outputs: [
        {
          index: 0,
          value: {
            address: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
            sources: [
              '7baac30508079f9748f1e76e033b38982c23fc0e06b23f9f5e5862e753aa71a6::0',
            ],
          },
        },
        {
          index: 1,
          value: {
            address: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
            sources: [
              '7baac30508079f9748f1e76e033b38982c23fc0e06b23f9f5e5862e753aa71a6::1',
            ],
          },
        },
      ],
    },
  ],
}

const U_S_U = {
  id: 'dbc326d7cd76355231ef5d67545d812290cd187c43fc007967c47fbc319ec39f',
  countspaces: ['wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi'],
  inputs: ['73c63eff667cbae31fb9554044801a01395b70a4656b157bb7396f47c4d1b05c'],
  outputs: [
    {
      address: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
      counter: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
      sources: [],
    },
    {
      address: 'wS1EU4AtgzD6VDtsrJyGKXmkQdvkWt9Qeq',
      counter: 'wUKiTHUvS6SAfP1tSCbEt2nC4Vjwj35Wvi',
      sources: [],
    },
  ],
}

module.exports = {
  S_U_S,
  S_U_S_2,
  U_S_U,
}
