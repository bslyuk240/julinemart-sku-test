import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const JWT_SECRET = process.env.JWT_SECRET || SUPABASE_SERVICE_ROLE_KEY // safe reuse

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function handler(event) {
  try {
    const { vendor_code, password } = JSON.parse(event.body)

    // 1️⃣ Validate vendor in database
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('vendor_code, vendor_name')
      .eq('vendor_code', vendor_code)
      .single()

    if (error || !vendor) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid vendor' }) }
    }

    // 2️⃣ Generate JWT with vendor_code claim
    const token = jwt.sign(
      { vendor_code: vendor.vendor_code },
      JWT_SECRET,
      { expiresIn: '12h', issuer: 'JulineMart' }
    )

    // 3️⃣ Return vendor info and token
    return {
      statusCode: 200,
      body: JSON.stringify({
        vendor_name: vendor.vendor_name,
        vendor_code: vendor.vendor_code,
        token,
      }),
    }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
