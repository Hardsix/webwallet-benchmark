/* eslint-disable */

// [pointer in outputParams.sources | split(source, '::')] as pointer
const query = `
  unwind $countspaces as params
  merge (countspace:Countspace {id: params.symbol}) 
  with * unwind params.outputs as thisOutput
  optional match (countspace)-[:Addresses]->(address:Address)
  where address.id = thisOutput.address set address.writeLock = timestamp()
  with *, thisOutput.sources + [''] as pointers
  unwind [pointer in pointers | split(pointer, '::')] as pointer
  optional match (address)-[output:Outputs]->(source:Transaction) 
  where source.id = pointer[0] and output.id = toInteger(pointer[1])
  and not (source)<-[:Sources {id: output.id}]-(:Transaction) set source.LOCKED = true
  with countspace, params, collect(distinct source) as sources,
  reduce(pointers = [], pointer in [output in params.outputs |
    output.sources] | pointers + pointer) as reducedPointers,
  collect(distinct source.id + '::' + output.id) as pointers

  create (transaction:Transaction {id: $id, time: timestamp()})
  foreach (_ in case when size(pointers)=size(reducedPointers) then [1] else [] end |
    foreach (input in params.inputs | merge (transaction)-[:Inputs]->(:IOU {id: input.hash}))
    foreach (output in params.outputs |
      foreach (pointer in [source in output.sources | split(source, '::')] |
        foreach (funding in [source in sources where pointer[0] = source.id] |
          merge (transaction)-[:Sources {id: toInteger(pointer[1])}]->(funding))
      )
    )
    foreach (output in params.outputs |
      merge (countspace)-[:Addresses]->(address:Address {id: output.address})
      merge (address)-[:Outputs {id: toInteger(output.index)}]->(transaction)
    )
  )

  foreach (source in sources | remove source.LOCKED)
  with transaction, transaction.id as id, countspace.id as symbol, params,
    [(transaction)-[input:Inputs]->(iou) | iou.id] as inputs,
    [(transaction)-[source:Sources]->(funding) | funding.id + '::' + source.id] as sources,
    [(transaction)<-[output:Outputs]-(address) | address.id + '::' + output.id] as newputs
  return id, symbol, inputs, sources, [output in params.outputs where
    (output.address + '::' + toInteger(output.index)) in newputs | output] as outputs
`
// return size(params.sources) as totalParams, size(sources) as totalSources
// match p = (countspace:Countspace {id: 'abc'})-[:Transactions*1..2]-
// >(txn:Transaction)<-[output:Outputs]-() return output.id
// return collect({countspace: countspace, inputs: inputs, sources: sources})

// foreach (funding in [source in countspace.sources
//   where source.id in output.value.sources] |
//   merge (transaction)-[:Sources]->(funding) )
// foreach (input in spaceParams.inputs |
//   create (countspace)-[:IOUs]->(iou:IOU {id: input.value}))

// foreach (source in sources | remove source.LOCKED)
// merge (countspace:Countspace {id: thisSpace.symbol})

const query2 = `
  unwind {countspaces} as thisSpace
  merge (countspace:Countspace {id: thisSpace.symbol})
  merge (countspace)-[:Transactions]->(transaction:Transaction {id: {id}})
  with thisSpace, countspace, transaction, thisSpace.sources as sources
  unwind (case sources when [] then [''] else sources end) as previousOutput

  with thisSpace, countspace, transaction unwind thisSpace.outputs as output
  merge (countspace)-[:Addresses]->(address:Address {id: output.value.address})
  merge (address)-[createdOutput:Outputs]->(transaction) 
    on create set createdOutput.id = toString(toInteger(output.index))
  with address, transaction, createdOutput, output.sources as sources

  return collect(address.id) as addresses, collect(createdOutput) as outputs
  
`
// merge (countspace)-[:Addresses]->(addresses:Index)
//   with collect(countspace.id) as countspaces
//   with countspaces, range(0, size({outputs}) - 1) as outputsRange
//   unwind outputsRange as i
//   with countspaces, toString(i) as outputPosition, {outputs}[i] as output
const rest = ` 
  merge (space:Countspace {id: countspace})-[:Addresses]->(addresses:Index)
  merge (:Address {id: countspace})-[:Outputs {id: countspace}]->(:Index)
  with collect(space.id) as countspaces,
  range(0, size({outputs}) - 1) as outputsRange
  create (spender:Transaction {id: {id}})
  with spender, countspaces, outputsRange
  unwind outputsRange as i
  with spender, countspaces, toString(i) as outputPosition, {outputs}[i] as output
  match (countspace:Countspace {id: output.counter})-[:Addresses]->(addressIndex)
  merge (address:Address {id: output.address})<-[:Address]-(addressIndex)
  merge (address)-[:Outputs {id: output.counter}]->(outputsIndex:Index)
  merge (outputsIndex)-[:Points {id: outputPosition}]->(spender)
  with address, countspace, outputsIndex, output.sources as previous, spender
  unwind (case previous when [] then [''] else previous end) as previousOutput
  optional match (outputsIndex)-[pointer:Points]->(spendee:Transaction)
  where (spendee.id + '::' + pointer.id) = previousOutput
  and not (spendee)<-[:Spends {id: pointer.id}]-(:Transaction)
  foreach (spendee in case exists(spendee.id) when true then [spendee] else [] end |
    merge (spender)-[spentOutput:Spends {id: pointer.id}]->(spendee))
  with address, countspace, spender, collect(distinct pointer) as pointers,
  filter(previousOutput in collect(distinct spendee.id + '::' + pointer.id)
    where size(previousOutput) > 0) as previousOutputs
  with spender, collect({
    address: address.id,
    counter: countspace.id,
    sources: previousOutputs
  }) as outputs
  unwind (case {inputs} when [] then [''] else {inputs} end) as input
  merge (iou:IOU {id: input})<-[:Clears]-(spender)
  return spender.id as id, collect(iou.id) as inputs, outputs
`

module.exports = query
