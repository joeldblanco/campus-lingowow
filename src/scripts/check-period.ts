import { getPeriodByDate } from '@/lib/actions/academic-period'

async function checkPeriod() {
  console.log('Checking for academic period for date:', new Date())
  const result = await getPeriodByDate(new Date())
  console.log('Result:', JSON.stringify(result, null, 2))
}

checkPeriod()
