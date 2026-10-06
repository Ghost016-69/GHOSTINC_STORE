/*
 * Probe: does the blueprint's float VAT formula ever disagree with the
 * integer-cent one, and on which values?
 *
 *     node _probe_float.mjs
 */
const VAT_PERMILLE = 150

function integerVat(taxable) {
  return Math.floor((taxable * VAT_PERMILLE + 500) / 1000)
}

function floatVat(taxable) {
  return Math.round(taxable * 0.15)
}

// The specific case from the demo catalogue.
const flagship = 4049910
console.log('=== flagship basket, taxable =', flagship, '===')
console.log('  float product      :', flagship * 0.15)
console.log('  lands exactly on .5:', flagship * 0.15 === 607486.5)
console.log('  Math.round (blueprint):', floatVat(flagship))
console.log('  integer (ours)        :', integerVat(flagship))
console.log('')

// Sweep every reachable taxable value up to a realistic maximum and count the
// disagreements. This is the question that actually matters: is the float form
// ever wrong, or only sometimes?
let mismatches = 0
const examples = []
for (let taxable = 0; taxable <= 5000000; taxable++) {
  const a = floatVat(taxable)
  const b = integerVat(taxable)
  if (a !== b) {
    mismatches++
    if (examples.length < 8) {
      examples.push({ taxable, float: a, integer: b })
    }
  }
}

console.log('=== sweep of taxable 0 .. 5,000,000 cents ===')
console.log('  disagreements:', mismatches)
for (const row of examples) {
  console.log(
    `    taxable=${row.taxable}  float=${row.float}  integer=${row.integer}`,
  )
}

// The same question for the discount, which the blueprint writes as
// Math.round(subtotal * percent / 100) — two float operations, not one.
function floatDiscount(subtotal, percent) {
  return Math.round((subtotal * percent) / 100)
}
function integerDiscount(subtotal, percent) {
  return Math.floor((subtotal * percent + 50) / 100)
}

console.log('')
console.log('=== discount sweep, subtotal 0 .. 200,000 cents, 1..90% ===')
let dmis = 0
const dexamples = []
for (let subtotal = 0; subtotal <= 200000; subtotal++) {
  for (let percent = 1; percent <= 90; percent++) {
    const a = floatDiscount(subtotal, percent)
    const b = integerDiscount(subtotal, percent)
    if (a !== b) {
      dmis++
      if (dexamples.length < 8) {
        dexamples.push({ subtotal, percent, float: a, integer: b })
      }
    }
  }
}
console.log('  disagreements:', dmis)
for (const row of dexamples) {
  console.log(
    `    subtotal=${row.subtotal} ${row.percent}%  float=${row.float}  integer=${row.integer}`,
  )
}

// And the VAT sweep over a much larger range than a demo shop needs.
let vmis = 0
for (let taxable = 0; taxable <= 100000000; taxable++) {
  if (Math.round(taxable * 0.15) !== integerVat(taxable)) {
    vmis++
  }
}
console.log('')
console.log('=== VAT sweep, taxable 0 .. 100,000,000 cents (R 1,000,000) ===')
console.log('  disagreements:', vmis)

// The sweep above covers 15% only. Is the float form safe at *any* rate, or
// is the agreement a coincidence of 0.15 happening to round the right way?
const rates = [
  ['15%', 150],
  ['7.5%', 75],
  ['20%', 200],
  ['12.5%', 125],
  ['8.25%', 825],
  ['5%', 50],
]

console.log('')
console.log('=== same sweep at other VAT rates ===')
for (const [label, permille] of rates) {
  let bad = 0
  let firstBad = null
  for (let taxable = 0; taxable <= 5000000; taxable++) {
    const viaFloat = Math.round((taxable * permille) / 1000)
    const viaInt = Math.floor((taxable * permille + 500) / 1000)
    if (viaFloat !== viaInt) {
      bad++
      if (firstBad === null) {
        firstBad = { taxable, viaFloat, viaInt }
      }
    }
  }
  console.log(`  ${label}: ${bad} disagreements`, firstBad ?? '')
}
